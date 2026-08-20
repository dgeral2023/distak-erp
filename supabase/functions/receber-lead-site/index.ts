import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.110.9";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const MAX_BODY_BYTES = 20_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (body: Record<string, unknown>, status: number, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...headers } });
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply({ error: "Método inválido." }, 405, { allow: "POST" });
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return reply({ error: "Pedido demasiado grande." }, 413);
  try {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return reply({ error: "Formato inválido." }, 415);
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return reply({ error: "Pedido demasiado grande." }, 413);
    const payload = JSON.parse(body);
    const authorization = request.headers.get("authorization") || "";
    const providedToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: authorized, error: authorizationError } = await supabase.rpc("verify_integration_secret", {
      p_name: "site_leads",
      p_token: providedToken,
    });
    if (authorizationError) {
      console.error("receber-lead-site: falha ao validar credencial", authorizationError);
      return reply({ error: "Integração temporariamente indisponível." }, 503);
    }
    if (!authorized) return reply({ error: "Não autorizado." }, 401);

    const publicId = clean(payload.publicId, 36).toLowerCase();
    const idempotencyKey = clean(request.headers.get("x-idempotency-key"), 36).toLowerCase();
    if (!UUID_PATTERN.test(publicId) || idempotencyKey !== publicId) return reply({ error: "Referência inválida." }, 400);
    if (clean(payload.empresa, 100)) return reply({ ok: true }, 201);
    const lead = {
      nome: clean(payload.nome, 100), telefone: clean(payload.telefone, 30), email: clean(payload.email, 160).toLowerCase(),
      localidade: clean(payload.localidade, 100), servico: clean(payload.servico, 100), prazo: clean(payload.prazo, 80) || "A combinar",
      mensagem: clean(payload.mensagem, 2000), origem: "Site Distak",
    };
    if (!lead.nome || !lead.telefone || !lead.email || !lead.localidade || !lead.servico || !lead.mensagem || payload.consentimento !== "sim")
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta." }), { status: 400, headers: jsonHeaders });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email))
      return new Response(JSON.stringify({ error: "Email inválido." }), { status: 400, headers: jsonHeaders });

    const { data: existing, error: existingError } = await supabase.from("leads_site").select("id").eq("public_id", publicId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return reply({ ok: true, id: existing.id, duplicate: true }, 200);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase.from("leads_site").select("id", { count: "exact", head: true }).eq("email", lead.email).gte("recebido_em", since);
    if (countError) throw countError;
    if ((count || 0) >= 5) return reply({ error: "Limite de pedidos atingido. Tente mais tarde." }, 429);

    const { data, error } = await supabase.from("leads_site").insert({ ...lead, public_id: publicId }).select("id").single();
    if (error?.code === "23505") {
      const { data: concurrent } = await supabase.from("leads_site").select("id").eq("public_id", publicId).single();
      return reply({ ok: true, id: concurrent?.id, duplicate: true }, 200);
    }
    if (error) throw error;
    return reply({ ok: true, id: data.id }, 201);
  } catch (error) {
    if (error instanceof SyntaxError) return reply({ error: "JSON inválido." }, 400);
    console.error("receber-lead-site", error);
    return reply({ error: "Não foi possível registar o pedido." }, 500);
  }
});

