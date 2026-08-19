const action=(code,priority,title,reason,view,options={})=>({code,priority,title,reason,view,filter:options.filter||null,workId:options.workId||null,safe:true,automation:false});

export function buildRecommendedActions(analysis){
  const id=analysis.work?.id,rows=[];
  if(analysis.blocked>0)rows.push(action("unblock",100,"Desbloquear etapas",`${analysis.blocked} etapa(s) impedem o avanço e acrescentam risco ao prazo.`,"agenda",{filter:"blocked",workId:id}));
  if(analysis.late>0)rows.push(action("recover_schedule",90,"Recuperar tarefas atrasadas",`${analysis.late} tarefa(s) precisam de nova sequência, prazo ou responsável.`,"agenda",{filter:"late",workId:id}));
  if(analysis.overdueInvoices>0)rows.push(action("review_overdue_invoices",85,"Rever faturas vencidas",`${analysis.overdueInvoices} fatura(s) vencida(s) sem recebimento confirmado.`,"medicoes",{workId:id}));
  if(analysis.marginRate<10)rows.push(action("protect_margin",80,"Proteger a margem prevista",`A margem projetada é ${Number(analysis.marginRate||0).toFixed(1)}%; rever custos e compromissos antes de decidir.`,"custos",{workId:id}));
  if(analysis.progress>analysis.receivedRate+25)rows.push(action("align_billing",75,"Alinhar avanço e recebimentos",`O avanço físico supera os recebimentos em ${(analysis.progress-analysis.receivedRate).toFixed(0)} pontos percentuais.`,"pagamentos",{workId:id}));
  if(analysis.confidence==="baixa")rows.push(action("improve_data",60,"Completar dados da obra","A previsão tem baixa confiança; confirme datas, progresso, custos e valor contratado.","obras",{workId:id}));
  if(!rows.length)rows.push(action("monitor",20,"Manter acompanhamento semanal","Os dados atuais não indicam desvios críticos; confirme o avanço no próximo ciclo.","agenda",{workId:id}));
  return rows.sort((a,b)=>b.priority-a.priority).slice(0,3);
}
