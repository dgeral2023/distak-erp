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

function byWork<T extends Record<string, unknown>>(rows: T[], workId: unknown) {
  return rows.filter((row) => String(row.obra_id) === String(workId));
}

function localAnalysis(data: ReturnType<typeof snapshot>, question: string, role: string) {
  const i = data.indicators;
  const query = text(question);
  const attention = data.obras.filter((row) => text(row.estado).includes("atras") || text(row.estado).includes("suspens"));
  const noIncome = data.obras.filter((work) => workValue(work) > 0 && !data.pagamentos.some((payment) => String(payment.obra_id) === String(work.id)));
  const overdue = data.custos.filter((row) => text(row.estado_pagamento) !== "pago" && row.data_vencimento && new Date(`${row.data_vencimento}T23:59:59`) < new Date());
  const matchedWork = data.obras.find((work) => text(work.nome).length > 2 && query.includes(text(work.nome)));
  const admin = role === "admin";

  if (matchedWork) {
    const payments = byWork(data.pagamentos, matchedWork.id).reduce((sum, row) => sum + number(row.valor), 0);
    const costs = byWork(data.custos, matchedWork.id).reduce((sum, row) => sum + costValue(row), 0);
    const contracted = workValue(matchedWork);
    return { intent: "obra", answer: `${matchedWork.nome || `Obra ${matchedWork.id}`} está no estado “${matchedWork.estado || "não definido"}”, com progresso de ${number(matchedWork.progresso).toFixed(0)}%.\n\nContratado: ${money(contracted)} · Recebido: ${money(payments)} · Por receber: ${money(Math.max(0, contracted - payments))} · Custos: ${money(costs)} · Resultado estimado: ${money(contracted - costs)}.`, actions: [{ label: "Abrir ficha da obra", view: "obras", work_id: matchedWork.id }] };
  }

  if (["receber", "recebimento", "recebido", "cobrar", "cobranca", "pagamento"].some((term) => query.includes(term))) {
    const balances = data.obras.map((work) => { const received = byWork(data.pagamentos, work.id).reduce((sum, row) => sum + number(row.valor), 0); return { work, balance: Math.max(0, workValue(work) - received) }; }).filter((row) => row.balance > 0).sort((a, b) => b.balance - a.balance);
    const detail = balances.slice(0, 5).map((row) => `• ${row.work.nome || `Obra ${row.work.id}`}: ${money(row.balance)}`).join("\n");
    return { intent: "recebimentos", answer: `Falta receber ${money(i.por_receber)} no total. ${balances.length} obra(s) têm saldo pendente.${detail ? `\n\nMaiores valores por receber:\n${detail}` : ""}`, actions: admin ? [{ label: "Abrir pagamentos", view: "pagamentos" }, { label: "Ver obras", view: "obras" }] : [{ label: "Ver minhas obras", view: "funcionario" }] };
  }

  if (["vencid", "fornecedor", "custo", "despesa", "fatura"].some((term) => query.includes(term))) {
    const detail = overdue.slice(0, 6).map((row) => `• ${row.descricao || row.categoria || "Custo"}: ${money(costValue(row))} · ${row.data_vencimento}`).join("\n");
    return { intent: "custos", answer: overdue.length ? `Existem ${overdue.length} custo(s) vencido(s), no total de ${money(i.custos_vencidos)}.\n\n${detail}` : `Não existem custos vencidos nos dados disponíveis. Os custos registados totalizam ${money(i.custos_totais)}.`, actions: admin ? [{ label: "Abrir custos", view: "custos" }, { label: "Ver relatórios", view: "relatorios" }] : [{ label: "Ver minhas obras", view: "funcionario" }] };
  }

  if (["orcamento", "proposta", "comercial", "pipeline"].some((term) => query.includes(term))) {
    const groups = new Map<string, { count: number; value: number }>();
    data.orcamentos.forEach((row) => { const state = String(row.estado || "Sem estado"); const current = groups.get(state) || { count: 0, value: 0 }; current.count += 1; current.value += number(row.valor_total ?? row.valor); groups.set(state, current); });
    const detail = [...groups].map(([state, row]) => `• ${state}: ${row.count} · ${money(row.value)}`).join("\n");
    return { intent: "orcamentos", answer: `Existem ${i.total_orcamentos} orçamento(s) no total.${detail ? `\n\n${detail}` : " Ainda não existem propostas registadas."}`, actions: admin ? [{ label: "Abrir orçamentos", view: "orcamentos" }] : [{ label: "Ver minhas obras", view: "funcionario" }] };
  }

  if (["prioridade", "atencao", "alerta", "risco", "atras", "suspens"].some((term) => query.includes(term))) {
    const lines = [];
    if (attention.length) lines.push(`• ${attention.length} obra(s) em atraso ou suspensas: ${attention.slice(0, 5).map((row) => row.nome || `Obra ${row.id}`).join(", ")}.`);
    if (overdue.length) lines.push(`• ${overdue.length} custo(s) vencido(s), total de ${money(i.custos_vencidos)}.`);
    if (noIncome.length) lines.push(`• ${noIncome.length} obra(s) contratadas sem recebimentos: ${noIncome.slice(0, 5).map((row) => row.nome || `Obra ${row.id}`).join(", ")}.`);
    if (!lines.length) lines.push("Não existem alertas críticos nos dados atuais.");
    return { intent: "prioridades", answer: `Prioridades de gestão neste momento:\n\n${lines.join("\n")}`, actions: admin ? [{ label: "Ver dashboard de obras", view: "obras" }, { label: "Abrir relatórios", view: "relatorios" }] : [{ label: "Abrir meu painel", view: "funcionario" }] };
  }

  return { intent: "resumo", answer: `Resumo atual: ${i.total_obras} obra(s), ${money(i.valor_contratado)} contratados e ${money(i.total_recebido)} recebidos.\n\nFalta receber ${money(i.por_receber)}. Os custos registados somam ${money(i.custos_totais)}, com resultado estimado de ${money(i.resultado_estimado)}. Existem ${i.quantidade_alertas_operacionais} alerta(s) operacional(is) e ${i.quantidade_custos_vencidos} custo(s) vencido(s).`, actions: admin ? [{ label: "Abrir relatórios", view: "relatorios" }, { label: "Ver obras", view: "obras" }] : [{ label: "Abrir meu painel", view: "funcionario" }] };
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

  const analysis = localAnalysis(data, message, profile.role);
  return json(req, { ...analysis, mode: "local", model: null });
});
