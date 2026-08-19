import {calculateDossier} from "./dossier-quality.js";
import {buildRecommendedActions} from "./intelligence-actions.js";
import {analyzeWorkload} from "./workload-analysis.js";

const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const number=value=>Number(value||0)||0;
const workValue=work=>number(work.valor_contratado||work.valor_total||work.valor);
const byWork=(rows,id)=>(rows||[]).filter(row=>String(row.obra_id)===String(id));

export function detectDeviceIntent(question){
  const query=norm(question);
  if(["carga da equipa","distribuicao da equipa","distribuir tarefas","sobrecarga","quem esta disponivel"].some(term=>query.includes(term)))return "workload";
  if(["qualidade do dossie","qualidade documental","metadados","zonas fotografadas","arquivo da obra","dossies precisam","documentos ou fotografias"].some(term=>query.includes(term)))return "dossiers";
  if(["proxima melhor acao","proxima acao","o que fazer agora","acao recomendada","prioridade recomendada"].some(term=>query.includes(term)))return "next_actions";
  return null;
}

function workloadResponse(context,today){
  const analysis=analyzeWorkload({tasks:context.agendaTarefas,profiles:context.profiles,employees:context.funcionarios,hours:context.funcionarioHoras,today});
  const detail=analysis.rows.filter(row=>row.pressure!=="available").slice(0,5).map(row=>`• ${row.name}: ${row.label} · ${row.total} tarefa(s)${row.late?` · ${row.late} atrasada(s)`:""}${row.blocked?` · ${row.blocked} bloqueada(s)`:""}`).join("\n");
  return {intent:"workload",answer:`Carga atual: ${analysis.summary.high} pessoa(s) com pressão alta, ${analysis.summary.unassigned} tarefa(s) sem responsável e ${analysis.summary.available} pessoa(s) disponível(is) para análise.\n\n${detail||"Não existem cargas atribuídas."}\n\n${analysis.recommendations.join(" ")} Nenhuma tarefa será reatribuída automaticamente.`,actions:[{label:"Abrir carga da equipa",view:"agenda"},...(context.role==="admin"?[{label:"Ver equipa",view:"funcionarios"}]:[])],automaticActions:false};
}

function dossierResponse(context,today){
  const rows=(context.obras||[]).map(work=>calculateDossier(work,{photos:context.fotografias,documents:context.documentosObra,budgets:context.orcamentos,diaries:context.diariosObra,costs:context.custos},{today})).sort((a,b)=>a.healthScore-b.healthScore);
  const attention=rows.filter(row=>row.actionItems.length);
  const prepared=rows.filter(row=>!row.missing.length&&row.quality.score>=80).length;
  const detail=attention.slice(0,5).map(row=>`• ${row.work.nome}: ${row.healthScore}% pronto · ${row.actionItems[0].label}`).join("\n");
  return {intent:"dossiers_quality",answer:`Qualidade do arquivo: ${prepared} de ${rows.length} dossiê(s) estão preparados. ${attention.length} precisam de correção.\n\n${detail||"Não existem pendências documentais nos dados atuais."}\n\nA análise verifica fase, metadados, zonas e atualidade; não altera fotografias ou documentos.`,actions:[{label:"Abrir dossiês",view:"dossies"}],automaticActions:false};
}

function nextActionsResponse(context,today){
  const rows=(context.obras||[]).map(work=>{
    const tasks=byWork(context.agendaTarefas,work.id).filter(row=>row.estado!=="concluida");
    const cost=byWork(context.custos,work.id).reduce((sum,row)=>sum+number(row.valor||row.valor_total||row.valor_sem_iva),0);
    const received=byWork(context.pagamentos,work.id).reduce((sum,row)=>sum+number(row.valor),0);
    const contracted=workValue(work),progress=number(work.progresso);
    const analysis={work,blocked:tasks.filter(row=>row.estado==="bloqueada").length,late:tasks.filter(row=>row.prazo&&row.prazo<today).length,overdueInvoices:byWork(context.autosMedicao,work.id).filter(row=>row.estado==="faturado"&&row.vencimento&&row.vencimento<today).length,marginRate:contracted?(contracted-cost)/contracted*100:100,progress,receivedRate:contracted?received/contracted*100:0,confidence:contracted&&work.data_inicio&&work.data_fim_prevista?"alta":"baixa"};
    const actions=buildRecommendedActions(analysis).filter(action=>context.role==="admin"||["agenda","obras"].includes(action.view));
    return {work,action:actions[0]};
  }).filter(row=>row.action).sort((a,b)=>b.action.priority-a.action.priority);
  const detail=rows.slice(0,5).map(row=>`• ${row.work.nome}: ${row.action.title} — ${row.action.reason}`).join("\n"),first=rows[0];
  return {intent:"next_actions",answer:`Próximas ações recomendadas, ordenadas por impacto:\n\n${detail||"Não existem obras com dados suficientes para recomendar ações."}\n\nSão recomendações explicáveis e somente de navegação; nenhuma alteração será executada automaticamente.`,actions:first?[{label:first.action.title,view:first.action.view,work_id:first.work.id}]:[{label:"Abrir agenda",view:"agenda"}],automaticActions:false};
}

export function buildDeviceAssistantResponse(question,context={},options={}){
  const intent=detectDeviceIntent(question);
  if(!intent)return null;
  const snapshot=JSON.stringify(context),today=options.today||new Date().toISOString().slice(0,10);
  const response=intent==="workload"?workloadResponse(context,today):intent==="dossiers"?dossierResponse(context,today):nextActionsResponse(context,today);
  if(JSON.stringify(context)!==snapshot)throw new Error("A análise local tentou alterar os dados recebidos.");
  return {...response,mode:"device",privacy:"device_only"};
}
