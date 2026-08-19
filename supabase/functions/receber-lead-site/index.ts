import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const jsonHeaders = { "content-type": "application/json; charset=utf-8" };
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Método inválido." }), { status: 405, headers: jsonHeaders });
  try {
    const payload = await request.json();
    if (clean(payload.empresa, 100)) return new Response(JSON.stringify({ ok: true }), { status: 201, headers: jsonHeaders });
    const lead = {
      nome: clean(payload.nome, 100), telefone: clean(payload.telefone, 30), email: clean(payload.email, 160).toLowerCase(),
      localidade: clean(payload.localidade, 100), servico: clean(payload.servico, 100), prazo: clean(payload.prazo, 80) || "A combinar",
      mensagem: clean(payload.mensagem, 2000), origem: "Site Distak",
    };
    if (!lead.nome || !lead.telefone || !lead.email || !lead.localidade || !lead.servico || !lead.mensagem || payload.consentimento !== "sim")
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta." }), { status: 400, headers: jsonHeaders });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email))
      return new Response(JSON.stringify({ error: "Email inválido." }), { status: 400, headers: jsonHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = await sha256(`distak-leads-v1:${forwarded}`);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase.from("leads_site").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("recebido_em", since);
    if ((count || 0) >= 5) return new Response(JSON.stringify({ error: "Limite de pedidos atingido. Tente mais tarde." }), { status: 429, headers: jsonHeaders });

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: duplicate } = await supabase.from("leads_site").select("id").eq("email", lead.email).gte("recebido_em", tenMinutesAgo).maybeSingle();
    if (duplicate) return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200, headers: jsonHeaders });

    const { data, error } = await supabase.from("leads_site").insert({ ...lead, ip_hash: ipHash }).select("id").single();
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 201, headers: jsonHeaders });
  } catch (error) {
    console.error("receber-lead-site", error);
    return new Response(JSON.stringify({ error: "Não foi possível registar o pedido." }), { status: 500, headers: jsonHeaders });
  }
});

