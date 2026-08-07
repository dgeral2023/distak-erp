const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const hasCategory=(rows,value)=>rows.some(row=>norm(row.categoria)===norm(value));
const activeWork=work=>!["concluida","concluido","cancelada","cancelado"].includes(norm(work.estado));
const validDate=value=>Number.isFinite(Date.parse(value));
const percent=(rows,predicate)=>rows.length?Math.round(rows.filter(predicate).length/rows.length*100):100;

export function calculateDossier(work,collections={},options={}){
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
  const now=Date.parse(options.today||new Date().toISOString()),photoMetadata=percent(photoRows,row=>row.categoria&&row.zona&&validDate(row.data_foto||row.created_at)),documentMetadata=percent(documentRows,row=>(row.nome||row.titulo)&&row.categoria),dated=photoRows.map(row=>row.data_foto||row.created_at).filter(validDate).sort(),latestPhotoDate=dated.at(-1)||null,staleDays=latestPhotoDate?Math.max(0,Math.floor((now-Date.parse(latestPhotoDate))/86400000)):null,zones=new Set(photoRows.map(row=>norm(row.zona)).filter(Boolean)).size;
  const qualityIssues=[];
  if(photoRows.length&&photoMetadata<80)qualityIssues.push({key:"foto_metadados",label:"Completar data, categoria e zona das fotografias",target:"fotografias"});
  if(documentRows.length&&documentMetadata<100)qualityIssues.push({key:"documento_metadados",label:"Identificar nome e categoria dos documentos",target:"documentos"});
  if(isActive&&progress>0&&(staleDays===null||staleDays>30))qualityIssues.push({key:"foto_atualidade",label:staleDays===null?"Registar fotografia com data":"Atualizar registo fotográfico da obra",target:"fotografias"});
  const qualityComponents=[];if(photoRows.length)qualityComponents.push(photoMetadata);if(documentRows.length)qualityComponents.push(documentMetadata);if(isActive&&progress>0)qualityComponents.push(staleDays!==null&&staleDays<=30?100:0);
  const qualityScore=qualityComponents.length?Math.round(qualityComponents.reduce((sum,value)=>sum+value,0)/qualityComponents.length):100,missing=checks.filter(check=>!check.done),healthScore=Math.round(score*.75+qualityScore*.25);
  return {work,photoRows,documentRows,checks,score,missing,healthScore,actionItems:[...missing,...qualityIssues],quality:{score:qualityScore,photoMetadata,documentMetadata,latestPhotoDate,staleDays,zones,issues:qualityIssues}};
}
