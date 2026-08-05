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

function snapshot(obras: Record<string, unknown>[], custos: Record<string, unknown>[], pagamentos: Record<string, unknown>[], orcamentos: Record<string, unknown>[], tarefas: Record<string, unknown>[], previsoes: Record<string, unknown>[], documentos: Record<string, unknown>[], fotografias: Record<string, unknown>[], diarios: Record<string, unknown>[], checklists: Record<string, unknown>[], materiais: Record<string, unknown>[], ocorrencias: Record<string, unknown>[], horas: Record<string, unknown>[], equipa: Record<string, unknown>[], pedidos: Record<string, unknown>[], propostas: Record<string, unknown>[], autos: Record<string, unknown>[], itensMedicao: Record<string, unknown>[]) {
  const now = new Date();
  const contracted = obras.reduce((sum, row) => sum + workValue(row), 0);
  const costs = custos.reduce((sum, row) => sum + costValue(row), 0);
  const received = pagamentos.reduce((sum, row) => sum + number(row.valor), 0);
  const overdue = custos.filter((row) => text(row.estado_pagamento) !== "pago" && row.data_vencimento && new Date(`${row.data_vencimento}T23:59:59`) < now);
  const operationalAlerts = obras.filter((row) => text(row.estado).includes("atras") || text(row.estado).includes("suspens"));
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Lisbon" }).format(now);
  const openTasks = tarefas.filter((row) => row.estado !== "concluida");
  const openForecasts = previsoes.filter((row) => !["realizado", "cancelado"].includes(String(row.estado)));
  const forecastIncome = openForecasts.filter((row) => row.tipo === "recebimento").reduce((sum, row) => sum + number(row.valor) * number(row.probabilidade) / 100, 0);
  const forecastExpense = openForecasts.filter((row) => row.tipo === "despesa").reduce((sum, row) => sum + number(row.valor) * number(row.probabilidade) / 100, 0);
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
      tarefas_abertas: openTasks.length,
      tarefas_atrasadas: openTasks.filter((row) => String(row.prazo) < today).length,
      tarefas_hoje: openTasks.filter((row) => String(row.prazo) === today).length,
      previsoes_abertas: openForecasts.length,
      previsoes_vencidas: openForecasts.filter((row) => String(row.data_prevista) < today).length,
      recebimentos_previstos: forecastIncome,
      despesas_previstas: forecastExpense,
      total_documentos_obra: documentos.length,
      total_fotografias_obra: fotografias.length,
      diarios_hoje: diarios.filter((row) => String(row.data) === today).length,
      ocorrencias_hoje: ocorrencias.filter((row) => String(row.data) === today).length,
      checklists_hoje: checklists.filter((row) => String(row.data) === today).length,
      pedidos_compra_abertos: pedidos.filter((row) => !["recebido", "cancelado"].includes(String(row.estado))).length,
      entregas_atrasadas: pedidos.filter((row) => ["encomendado", "parcial"].includes(String(row.estado)) && row.entrega_prevista && String(row.entrega_prevista) < today).length,
      autos_faturados: autos.filter((row) => row.estado === "faturado").length,
      faturas_autos_vencidas: autos.filter((row) => row.estado === "faturado" && row.vencimento && String(row.vencimento) < today).length,
    },
    obras: safeRows(obras, ["id", "nome", "estado", "progresso", "valor", "valor_total", "valor_contratado", "data_inicio", "data_fim_prevista", "morada"]),
    custos: safeRows(custos, ["obra_id", "descricao", "tipo", "categoria", "valor", "valor_total", "valor_sem_iva", "estado_pagamento", "data", "data_vencimento"]),
    pagamentos: safeRows(pagamentos, ["obra_id", "descricao", "valor", "estado", "data", "metodo"]),
    orcamentos: safeRows(orcamentos, ["obra_id", "numero", "descricao", "estado", "valor", "valor_total", "data", "validade"]),
    tarefas: safeRows(tarefas, ["id", "obra_id", "titulo", "descricao", "responsavel_id", "funcionario_id", "inicio", "prazo", "hora", "prioridade", "estado", "fase", "progresso", "marco", "depende_de"]),
    previsoes: safeRows(previsoes, ["id", "obra_id", "tipo", "descricao", "valor", "data_prevista", "probabilidade", "estado"]),
    documentos: safeRows(documentos, ["id", "obra_id", "nome", "categoria", "mime_type", "tamanho_bytes", "criado_em"]),
    fotografias: safeRows(fotografias, ["id", "obra_id", "categoria", "titulo", "descricao", "zona", "data_foto"]),
    diarios: safeRows(diarios, ["id", "obra_id", "data", "titulo", "descricao", "clima", "equipa", "horas", "materiais", "ocorrencias"]),
    checklists: safeRows(checklists, ["id", "obra_id", "data", "itens", "observacoes"]),
    materiais: safeRows(materiais, ["id", "obra_id", "data", "material", "quantidade", "observacoes"]),
    ocorrencias: safeRows(ocorrencias, ["id", "obra_id", "data", "tipo", "descricao", "observacoes"]),
    horas: safeRows(horas, ["id", "obra_id", "data", "funcionario_nome", "horario", "observacoes"]),
    equipa: safeRows(equipa, ["id", "obra_id", "data", "nome", "funcao", "observacoes"]),
    pedidos: safeRows(pedidos, ["id", "obra_id", "numero", "titulo", "categoria", "quantidade", "unidade", "data_necessaria", "estado", "valor_orcamentado", "fornecedor_selecionado", "valor_adjudicado", "entrega_prevista"]),
    propostas: safeRows(propostas, ["id", "pedido_id", "fornecedor", "valor", "prazo_dias", "validade", "selecionada"]),
    autos: safeRows(autos, ["id", "obra_id", "numero", "periodo_inicio", "periodo_fim", "estado", "subtotal", "retencao_percentagem", "iva_percentagem", "total", "fatura_numero", "fatura_data", "vencimento"]),
    itens_medicao: safeRows(itensMedicao, ["auto_id", "descricao", "unidade", "quantidade_contratada", "quantidade_anterior", "quantidade_atual", "preco_unitario"]),
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
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Lisbon" }).format(new Date());
  const lateTasks = data.tarefas.filter((row) => row.estado !== "concluida" && String(row.prazo) < today);
  const todayTasks = data.tarefas.filter((row) => row.estado !== "concluida" && String(row.prazo) === today);
  const blockedStages = data.tarefas.filter((row) => row.estado === "bloqueada");
  const matchedWork = data.obras.find((work) => text(work.nome).length > 2 && query.includes(text(work.nome)));
  const admin = role === "admin";

  if (admin && ["medicao", "medicoes", "auto", "faturacao", "faturado", "fatura de cliente"].some((term) => query.includes(term))) {
    const approved = data.autos.filter((row) => row.estado === "aprovado"), billed = data.autos.filter((row) => row.estado === "faturado"), late = billed.filter((row) => row.vencimento && String(row.vencimento) < today);
    const detail = late.slice(0, 6).map((row) => `• ${row.numero}: ${money(number(row.total))} · vencimento ${row.vencimento}`).join("\n");
    return { intent: "medicoes", answer: `Medições: ${data.autos.length} auto(s), ${approved.length} aprovado(s) por faturar e ${billed.length} marcado(s) como faturado(s). Existem ${late.length} fatura(s) vencida(s) sem confirmação automática de recebimento.${detail ? `\n\nVencidas:\n${detail}` : ""}\n\nFaturado não significa recebido; confirme os recebimentos no módulo Pagamentos.`, actions: [{ label: "Abrir Autos de Medição", view: "medicoes" }, { label: "Ver pagamentos", view: "pagamentos" }] };
  }

  if (admin && ["compra", "fornecedor", "proposta de fornecedor", "entrega", "encomenda", "adjudic"].some((term) => query.includes(term))) {
    const open = data.pedidos.filter((row) => !["recebido", "cancelado"].includes(String(row.estado)));
    const late = open.filter((row) => ["encomendado", "parcial"].includes(String(row.estado)) && row.entrega_prevista && String(row.entrega_prevista) < today);
    const overBudget = open.filter((row) => number(row.valor_adjudicado) > number(row.valor_orcamentado) && number(row.valor_orcamentado) > 0);
    const detail = late.slice(0, 6).map((row) => `• ${row.numero} · ${row.titulo}: entrega prevista ${row.entrega_prevista} · ${row.fornecedor_selecionado || "fornecedor por confirmar"}`).join("\n");
    return { intent: "compras", answer: `Compras: ${open.length} pedido(s) aberto(s), ${late.length} entrega(s) atrasada(s), ${overBudget.length} adjudicação(ões) acima do orçamento e ${data.propostas.length} proposta(s) registada(s).${detail ? `\n\nEntregas atrasadas:\n${detail}` : " Não existem entregas atrasadas."}\n\nSelecionar uma proposta não cria custos nem pagamentos.`, actions: [{ label: "Abrir Central de Compras", view: "compras" }, { label: "Ver custos e faturas", view: "custos" }] };
  }

  if (["operacional", "diario", "ocorrencia", "material", "horas", "equipa", "checklist", "atividade de hoje"].some((term) => query.includes(term))) {
    const todayDiaries = data.diarios.filter((row) => String(row.data) === today);
    const todayOccurrences = data.ocorrencias.filter((row) => String(row.data) === today);
    const todayMaterials = data.materiais.filter((row) => String(row.data) === today);
    const todayHours = data.horas.filter((row) => String(row.data) === today);
    const lines = todayOccurrences.slice(0, 6).map((row) => `• ${data.obras.find((work) => String(work.id) === String(row.obra_id))?.nome || "Obra"}: ${row.tipo || "Ocorrência"} · ${row.descricao || "Sem descrição"}`);
    return { intent: "operacional", answer: `Atividade operacional de hoje: ${todayDiaries.length} diário(s), ${i.checklists_hoje} checklist(s), ${todayMaterials.length} registo(s) de materiais, ${todayHours.length} registo(s) de horas e ${todayOccurrences.length} ocorrência(s).${lines.length ? `\n\nOcorrências:\n${lines.join("\n")}` : " Não existem ocorrências registadas hoje."}`, actions: [{ label: "Abrir Centro Operacional", view: "operacional" }, { label: "Ver obras", view: admin ? "obras" : "funcionario" }] };
  }

  if (["dossie", "documento", "fotografia", "fotografias", "arquivo", "relatorio fotografico"].some((term) => query.includes(term))) {
    const summaries = data.obras.map((work) => { const docs = byWork(data.documentos, work.id); const photos = byWork(data.fotografias, work.id); const contract = docs.some((row) => text(row.categoria) === "contrato"); const before = photos.some((row) => text(row.categoria) === "antes"); const during = photos.some((row) => text(row.categoria) === "durante"); return { work, docs: docs.length, photos: photos.length, missing: [!contract && "contrato", !before && "fotos antes", !during && "fotos durante"].filter(Boolean) }; });
    const attentionRows = summaries.filter((row) => row.missing.length).sort((a, b) => b.missing.length - a.missing.length);
    const detail = attentionRows.slice(0, 6).map((row) => `• ${row.work.nome}: falta ${row.missing.join(", ")} · ${row.docs} documento(s) · ${row.photos} foto(s)`).join("\n");
    return { intent: "dossies", answer: `Arquivo digital: ${i.total_documentos_obra} documento(s) e ${i.total_fotografias_obra} fotografia(s) nas obras permitidas. ${attentionRows.length} dossiê(s) têm elementos essenciais por organizar.${detail ? `\n\nPendências principais:\n${detail}` : ""}`, actions: [{ label: "Abrir dossiês", view: "dossies" }, { label: "Ver obras", view: admin ? "obras" : "funcionario" }] };
  }

  if (admin && ["previsao", "previsto", "fluxo de caixa", "futuro", "projecao"].some((term) => query.includes(term)) && !["previsao de atraso", "custo final", "margem prevista", "risco da obra", "cenario de gestao"].some((term) => query.includes(term))) {
    const activeForecasts = data.previsoes.filter((row) => !["realizado", "cancelado"].includes(String(row.estado))).sort((a, b) => String(a.data_prevista).localeCompare(String(b.data_prevista)));
    const detail = activeForecasts.slice(0, 6).map((row) => `• ${row.data_prevista} · ${row.descricao}: ${money(number(row.valor))} (${number(row.probabilidade)}%)`).join("\n");
    return { intent: "previsoes", answer: `Planeamento atual: ${i.previsoes_abertas} previsão(ões) aberta(s), com ${money(i.recebimentos_previstos)} de recebimentos e ${money(i.despesas_previstas)} de despesas ponderadas. A variação prevista é ${money(i.recebimentos_previstos - i.despesas_previstas)}.${i.previsoes_vencidas ? ` Existem ${i.previsoes_vencidas} previsão(ões) vencida(s).` : ""}${detail ? `\n\nPróximos movimentos:\n${detail}` : ""}\n\nEstes valores são previsões e não representam o saldo bancário nem movimentos realizados.`, actions: [{ label: "Abrir previsões", view: "previsoes" }, { label: "Ver pagamentos", view: "pagamentos" }] };
  }

  if (admin && ["inteligencia", "custo final", "margem prevista", "risco da obra", "previsao de atraso", "cenario de gestao"].some((term) => query.includes(term))) {
    const rows = data.obras.map((work) => {
      const progress = Math.max(0, Math.min(100, number(work.progresso)));
      const contracted = workValue(work);
      const costs = byWork(data.custos, work.id).reduce((sum, row) => sum + costValue(row), 0);
      const projected = progress >= 10 ? costs / (progress / 100) * 1.05 : costs * 1.05;
      const tasks = byWork(data.tarefas, work.id).filter((row) => row.estado !== "concluida");
      const late = tasks.filter((row) => String(row.prazo) < today).length;
      const blocked = tasks.filter((row) => row.estado === "bloqueada").length;
      const margin = contracted - projected;
      let score = Math.min(50, late * 8 + blocked * 12);
      if (contracted && margin < 0) score += 30; else if (contracted && margin / contracted < .1) score += 15;
      if (text(work.estado).includes("atras") || text(work.estado).includes("suspens")) score += 20;
      return { work, projected, margin, late, blocked, score: Math.min(100, score) };
    }).sort((a, b) => b.score - a.score);
    const detail = rows.slice(0, 6).map((row) => `\u2022 ${row.work.nome}: risco ${row.score}/100 \u00b7 custo final ${money(row.projected)} \u00b7 margem ${money(row.margin)} \u00b7 ${row.late} tarefa(s) atrasada(s)`).join("\n");
    return { intent: "inteligencia", answer: `Análise interna e explicável da carteira, usando uma reserva de 5%: ${rows.filter((row) => row.score >= 50).length} obra(s) apresentam risco alto ou crítico.\n\n${detail || "Não existem obras para analisar."}\n\nEstas projeções apoiam a decisão e não alteram custos, pagamentos ou prazos. Confirme cada cenário no painel antes de agir.`, actions: [{ label: "Abrir Inteligência de Gestão", view: "inteligencia" }, { label: "Ver cronograma", view: "agenda" }] };
  }

  if (matchedWork) {
    const payments = byWork(data.pagamentos, matchedWork.id).reduce((sum, row) => sum + number(row.valor), 0);
    const costs = byWork(data.custos, matchedWork.id).reduce((sum, row) => sum + costValue(row), 0);
    const contracted = workValue(matchedWork);
    return { intent: "obra", answer: `${matchedWork.nome || `Obra ${matchedWork.id}`} está no estado “${matchedWork.estado || "não definido"}”, com progresso de ${number(matchedWork.progresso).toFixed(0)}%.\n\nContratado: ${money(contracted)} · Recebido: ${money(payments)} · Por receber: ${money(Math.max(0, contracted - payments))} · Custos: ${money(costs)} · Resultado estimado: ${money(contracted - costs)}.`, actions: [{ label: "Abrir ficha da obra", view: "obras", work_id: matchedWork.id }] };
  }

  if (["receber", "recebimento", "recebido", "cobrar", "cobranca", "pagamento"].some((term) => query.includes(term))) {
    const balances = data.obras.map((work) => { const received = byWork(data.pagamentos, work.id).reduce((sum, row) => sum + number(row.valor), 0); return { work, balance: Math.max(0, workValue(work) - received) }; }).filter((row) => row.balance > 0).sort((a, b) => b.balance - a.balance);
    const detail = balances.slice(0, 5).map((row) => `• ${row.work.nome || `Obra ${row.work.id}`}: ${money(row.balance)}`).join("\n");
    return { intent: "recebimentos", answer: `Falta receber ${money(i.por_receber)} no total. ${balances.length} obra(s) têm saldo pendente.${detail ? `\n\nMaiores valores por receber:\n${detail}` : ""}`, actions: admin ? [{ label: "Planear cobranças", view: "previsoes" }, { label: "Abrir pagamentos", view: "pagamentos" }, { label: "Ver obras", view: "obras" }] : [{ label: "Ver minhas obras", view: "funcionario" }] };
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

  if (["agenda", "tarefa", "prazo", "planeamento", "hoje", "semana"].some((term) => query.includes(term))) {
    const upcoming = data.tarefas.filter((row) => row.estado !== "concluida" && String(row.prazo) > today).sort((a, b) => String(a.prazo).localeCompare(String(b.prazo))).slice(0, 6);
    const lines = [
      ...lateTasks.slice(0, 6).map((row) => `• ATRASADA · ${row.titulo} · ${row.prazo}`),
      ...todayTasks.slice(0, 6).map((row) => `• HOJE · ${row.titulo}${row.hora ? ` · ${String(row.hora).slice(0, 5)}` : ""}`),
      ...upcoming.map((row) => `• ${row.prazo} · ${row.titulo}`),
    ];
    return { intent: "agenda", answer: `Planeamento das obras: ${i.tarefas_abertas} etapa(s) aberta(s), ${i.tarefas_atrasadas} atrasada(s), ${blockedStages.length} bloqueada(s) e ${i.tarefas_hoje} para hoje.${lines.length ? `\n\nPróximos trabalhos:\n${lines.join("\n")}` : " Não existem etapas abertas."}`, actions: [{ label: "Abrir cronograma", view: "agenda" }] };
  }

  if (["prioridade", "atencao", "alerta", "risco", "atras", "suspens"].some((term) => query.includes(term))) {
    const lines = [];
    if (attention.length) lines.push(`• ${attention.length} obra(s) em atraso ou suspensas: ${attention.slice(0, 5).map((row) => row.nome || `Obra ${row.id}`).join(", ")}.`);
    if (overdue.length) lines.push(`• ${overdue.length} custo(s) vencido(s), total de ${money(i.custos_vencidos)}.`);
    if (noIncome.length) lines.push(`• ${noIncome.length} obra(s) contratadas sem recebimentos: ${noIncome.slice(0, 5).map((row) => row.nome || `Obra ${row.id}`).join(", ")}.`);
    if (lateTasks.length) lines.push(`• ${lateTasks.length} tarefa(s) em atraso na agenda.`);
    if (todayTasks.length) lines.push(`• ${todayTasks.length} tarefa(s) com prazo hoje.`);
    if (blockedStages.length) lines.push(`• ${blockedStages.length} etapa(s) bloqueada(s) no cronograma.`);
    if (!lines.length) lines.push("Não existem alertas críticos nos dados atuais.");
    return { intent: "prioridades", answer: `Prioridades de gestão neste momento:\n\n${lines.join("\n")}`, actions: admin ? [{ label: "Abrir agenda", view: "agenda" }, { label: "Ver dashboard de obras", view: "obras" }, { label: "Abrir relatórios", view: "relatorios" }] : [{ label: "Abrir agenda", view: "agenda" }, { label: "Abrir meu painel", view: "funcionario" }] };
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

  const [worksResult, costsResult, paymentsResult, budgetsResult, tasksResult, forecastsResult, documentsResult, photosResult, diariesResult, checklistsResult, materialsResult, occurrencesResult, hoursResult, teamResult, purchaseResult, quoteResult, measurementResult, measurementItemsResult] = await Promise.all([
    supabase.from("obras").select("*"),
    supabase.from("custos").select("*"),
    supabase.from("pagamentos").select("*"),
    supabase.from("orcamentos").select("*"),
    supabase.from("agenda_tarefas").select("*"),
    profile.role === "admin" ? supabase.from("financeiro_previsoes").select("*") : Promise.resolve({ data: [], error: null }),
    supabase.from("obra_documentos").select("*"),
    supabase.from("obra_fotografias").select("*"),
    supabase.from("obra_diarios").select("*"),
    supabase.from("obra_checklists").select("*"),
    supabase.from("obra_materiais").select("*"),
    supabase.from("obra_ocorrencias").select("*"),
    supabase.from("obra_horas").select("*"),
    supabase.from("obra_equipa_registos").select("*"),
    profile.role === "admin" ? supabase.from("compras_pedidos").select("*") : Promise.resolve({ data: [], error: null }),
    profile.role === "admin" ? supabase.from("compras_propostas").select("*") : Promise.resolve({ data: [], error: null }),
    profile.role === "admin" ? supabase.from("medicoes_autos").select("*") : Promise.resolve({ data: [], error: null }),
    profile.role === "admin" ? supabase.from("medicoes_itens").select("*") : Promise.resolve({ data: [], error: null }),
  ]);
  const queryError = [worksResult.error, costsResult.error, paymentsResult.error, budgetsResult.error, tasksResult.error, forecastsResult.error, documentsResult.error, photosResult.error, diariesResult.error, checklistsResult.error, materialsResult.error, occurrencesResult.error, hoursResult.error, teamResult.error, purchaseResult.error, quoteResult.error, measurementResult.error, measurementItemsResult.error].find(Boolean);
  if (queryError) return json(req, { error: "Não foi possível consultar os dados autorizados." }, 500);
  const data = snapshot(worksResult.data || [], costsResult.data || [], paymentsResult.data || [], budgetsResult.data || [], tasksResult.data || [], forecastsResult.data || [], documentsResult.data || [], photosResult.data || [], diariesResult.data || [], checklistsResult.data || [], materialsResult.data || [], occurrencesResult.data || [], hoursResult.data || [], teamResult.data || [], purchaseResult.data || [], quoteResult.data || [], measurementResult.data || [], measurementItemsResult.data || []);

  const analysis = localAnalysis(data, message, profile.role);
  return json(req, { ...analysis, mode: "local", model: null });
});
