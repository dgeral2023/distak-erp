const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const hasCategory=(rows,value)=>rows.some(row=>norm(row.categoria)===norm(value));
const activeWork=work=>!["concluida","concluido","cancelada","cancelado"].includes(norm(work.estado));

export function calculateDossier(work,collections={}){
  if(!work)return null;
  const byWork=rows=>(rows||[]).filter(row=>String(row.obra_id)===String(work.id));
  const photoRows=byWork(collections.photos),documentRows=byWork(collections.documents),budgetRows=byWork(collections.budgets),diaryRows=byWork(collections.diaries),costRows=byWork(collections.costs);
  const progress=Number(work.progresso||0),isActive=activeWork(work),checks=[
    {key:"contrato",label:"Contrato",done:hasCategory(documentRows,"Contrato"),target:"documentos"},
    {key:"orcamento",label:"Orçamento associado",done:budgetRows.length>0,target:"orcamentos"},
    {key:"antes",label:"Fotos antes",done:hasCategory(photoRows,"Antes"),target:"fotografias"},
  ];
  if(costRows.length)checks.push({key:"fatura",label:"Faturas de custos",done:hasCategory(documentRows,"Fatura")||documentRows.some(row=>row.custo_id),target:"documentos"});
  if(progress>0||!isActive){checks.push({key:"durante",label:"Fotos durante",done:hasCategory(photoRows,"Durante"),target:"fotografias"});checks.push({key:"diario",label:"Diário de obra",done:diaryRows.length>0,target:"diario"})}
  if(!isActive)checks.push({key:"depois",label:"Fotos depois",done:hasCategory(photoRows,"Depois"),target:"fotografias"});
  const score=Math.round(checks.filter(check=>check.done).length/checks.length*100);
  return {work,photoRows,documentRows,checks,score,missing:checks.filter(check=>!check.done)};
}
