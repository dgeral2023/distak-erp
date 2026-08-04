import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const allowedOrigins = new Set([
  "https://dgeral2023.github.io",
  "https://app.distaklda.com",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://dgeral2023.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

const number = (value: unknown) => Number(value || 0) || 0;
const money = (value: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
const text = (value: unknown) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const workValue = (row: Record<string, unknown>) => number(row.valor_contratado ?? row.valor_total ?? row.valor);
const costValue = (row: Record<string, unknown>) => number(row.valor_total ?? row.valor_com_iva ?? row.valor ?? row.valor_sem_iva);

function safeRows(rows: Record<string, unknown>[], keys: string[]) {
  return rows.slice(0, 100).map((row) => Object.fromEntries(keys.filter((key) => row[key] !== undefined).map((key) => [key, row[key]])));
}

function snapshot(obras: Record<string, unknown>[], custos: Record<string, unknown>[], pagamentos: Record<string, unknown>[], orcamentos: Record<string, unknown>[]) {
  const now = new Date();
  const contracted = obras.reduce((sum, row) => sum + workValue(row), 0);
  const costs = custos.reduce((sum, row) => sum + costValue(row), 0);
  const received = pagamentos.reduce((sum, row) => sum + number(row.valor), 0);
  const overdue = custos.filter((row) => text(row.estado_pagamento) !== "pago" && row.data_vencimento && new Date(`${row.data_vencimento}T23:59:59`) < now);
  const operationalAlerts = obras.filter((row) => text(row.estado).includes("atras") || text(row.estado).includes("suspens"));
  return {
    updated_at: now.toISOString(),
    indicators: {
      total_obras: obras.length,
      valor_contratado: contracted,
      total_recebido: received,
      por_receber: Math.max(0, contracted - received),
      custos_totais: costs,
      resultado_estimado: contracted - costs,
      custos_vencidos: overdue.reduce((sum, row) => sum + costValue(row), 0),
      quantidade_custos_vencidos: overdue.length,
      quantidade_alertas_operacionais: operationalAlerts.length,
      total_orcamentos: orcamentos.length,
    },
    obras: safeRows(obras, ["id", "nome", "estado", "progresso", "valor", "valor_total", "valor_contratado", "data_inicio", "data_fim_prevista", "morada"]),
    custos: safeRows(custos, ["obra_id", "descricao", "tipo", "categoria", "valor", "valor_total", "valor_sem_iva", "estado_pagamento", "data", "data_vencimento"]),
    pagamentos: safeRows(pagamentos, ["obra_id", "descricao", "valor", "estado", "data", "metodo"]),
    orcamentos: safeRows(orcamentos, ["obra_id", "numero", "descricao", "estado", "valor", "valor_total", "data", "validade"]),
  };
}

function localAnalysis(data: ReturnType<typeof snapshot>) {
  const i = data.indicators;
  const attention = data.obras.filter((row) => text(row.estado).includes("atras") || text(row.estado).includes("suspens"));
  const noIncome = data.obras.filter((work) => workValue(work) > 0 && !data.pagamentos.some((payment) => String(payment.obra_id) === String(work.id)));
  const lines = [
    `Resumo atual: ${i.total_obras} obra(s), ${money(i.valor_contratado)} contratados e ${money(i.total_recebido)} recebidos.`,
    `Falta receber ${money(i.por_receber)}. Os custos registados somam ${money(i.custos_totais)}, com resultado estimado de ${money(i.resultado_estimado)}.`,
  ];
  if (i.quantidade_custos_vencidos) lines.push(`Atenção: existem ${i.quantidade_custos_vencidos} custo(s) vencido(s), no total de ${money(i.custos_vencidos)}.`);
  if (attention.length) lines.push(`Obras em atraso ou suspensas: ${attention.map((row) => row.nome || `Obra ${row.id}`).join(", ")}.`);
  if (noIncome.length) lines.push(`Obras contratadas sem recebimentos registados: ${noIncome.slice(0, 8).map((row) => row.nome || `Obra ${row.id}`).join(", ")}.`);
  if (!i.quantidade_custos_vencidos && !attention.length) lines.push("Não foram encontrados custos vencidos nem obras marcadas como atrasadas ou suspensas.");
  return lines.join("\n\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Método não permitido." }, 405);

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json(req, { error: "Autenticação necessária." }, 401);

  let body: { message?: unknown; history?: unknown };
  try { body = await req.json(); } catch { return json(req, { error: "Pedido inválido." }, 400); }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 1500) return json(req, { error: "A pergunta deve ter entre 1 e 1500 caracteres." }, 400);

  const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  const apiKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY");
  if (!apiKey) return json(req, { error: "Configuração interna indisponível." }, 500);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, apiKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json(req, { error: "Sessão inválida." }, 401);
  const { data: profile } = await supabase.from("profiles").select("role,ativo").eq("id", userData.user.id).single();
  if (!profile || profile.ativo === false) return json(req, { error: "Utilizador sem acesso." }, 403);

  const [worksResult, costsResult, paymentsResult, budgetsResult] = await Promise.all([
    supabase.from("obras").select("*"),
    supabase.from("custos").select("*"),
    supabase.from("pagamentos").select("*"),
    supabase.from("orcamentos").select("*"),
  ]);
  const queryError = [worksResult.error, costsResult.error, paymentsResult.error, budgetsResult.error].find(Boolean);
  if (queryError) return json(req, { error: "Não foi possível consultar os dados autorizados." }, 500);
  const data = snapshot(worksResult.data || [], costsResult.data || [], paymentsResult.data || [], budgetsResult.data || []);

  return json(req, { answer: localAnalysis(data), mode: "local", model: null });
});
