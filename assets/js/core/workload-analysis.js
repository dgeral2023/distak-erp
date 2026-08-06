const number=value=>Number(value||0)||0;
const active=value=>value!==false&&String(value||"ativo").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()!=="inativo";
const dayDiff=(date,today)=>Math.round((new Date(`${date}T12:00:00`)-new Date(`${today}T12:00:00`))/86400000);

function taskWeight(task,today){
  const days=dayDiff(task.prazo,today);
  return ({urgente:5,alta:3,media:2,baixa:1}[task.prioridade]||1)+(days<0?4:days<=2?2:0)+(task.estado==="bloqueada"?3:0);
}

export function analyzeWorkload({tasks=[],profiles=[],employees=[],hours=[],today=new Date().toISOString().slice(0,10),month=today.slice(0,7)}={}){
  const rows=new Map();
  profiles.filter(row=>active(row.ativo)&&row.role!=="cliente").forEach(row=>rows.set(`profile:${row.id}`,{key:`profile:${row.id}`,id:row.id,kind:"profile",name:row.nome||row.email||"Utilizador",total:0,late:0,blocked:0,urgent:0,score:0,hours:0}));
  employees.filter(row=>active(row.estado)).forEach(row=>rows.set(`employee:${row.id}`,{key:`employee:${row.id}`,id:row.id,kind:"employee",name:row.nome||"Funcionário",total:0,late:0,blocked:0,urgent:0,score:0,hours:0}));
  rows.set("unassigned",{key:"unassigned",id:null,kind:"unassigned",name:"Sem responsável",total:0,late:0,blocked:0,urgent:0,score:0,hours:0});

  tasks.filter(task=>task.estado!=="concluida").forEach(task=>{
    const key=task.funcionario_id?`employee:${task.funcionario_id}`:task.responsavel_id?`profile:${task.responsavel_id}`:"unassigned";
    if(!rows.has(key))rows.set(key,{key,id:task.funcionario_id||task.responsavel_id||null,kind:task.funcionario_id?"employee":"profile",name:"Responsável não identificado",total:0,late:0,blocked:0,urgent:0,score:0,hours:0});
    const row=rows.get(key),days=dayDiff(task.prazo,today);row.total++;row.score+=taskWeight(task,today);if(days<0)row.late++;if(task.estado==="bloqueada")row.blocked++;if(task.prioridade==="urgente")row.urgent++;
  });
  hours.filter(row=>String(row.data||"").startsWith(month)).forEach(item=>{const row=rows.get(`employee:${item.funcionario_id}`);if(row)row.hours+=number(item.horas)});

  const classified=[...rows.values()].map(row=>{
    const pressure=row.key==="unassigned"&&row.total?"unassigned":row.score>=12||row.total>=6?"high":row.score>=6||row.hours>=180?"attention":row.total?"balanced":"available";
    const label={unassigned:"Distribuir",high:"Alta pressão",attention:"Atenção",balanced:"Equilibrada",available:"Disponível"}[pressure];
    return {...row,pressure,label,hours:Number(row.hours.toFixed(2))};
  }).filter(row=>row.total||row.hours||row.kind!=="profile");
  const order={unassigned:0,high:1,attention:2,balanced:3,available:4};classified.sort((a,b)=>order[a.pressure]-order[b.pressure]||b.score-a.score||b.total-a.total||a.name.localeCompare(b.name));
  const unassigned=classified.find(row=>row.key==="unassigned")?.total||0,high=classified.filter(row=>row.pressure==="high").length,available=classified.filter(row=>row.pressure==="available").length;
  const recommendations=[];
  if(unassigned)recommendations.push(`${unassigned} tarefa(s) precisam de responsável.`);
  if(high)recommendations.push(`${high} pessoa(s) com pressão alta; rever prioridades e prazos.`);
  if(available&&unassigned)recommendations.push(`${available} pessoa(s) aparecem disponíveis para análise da distribuição.`);
  if(!recommendations.length)recommendations.push("A distribuição atual não apresenta desvios críticos.");
  return {rows:classified,summary:{unassigned,high,available},recommendations,maximumScore:Math.max(1,...classified.map(row=>row.score)),automaticReassignment:false};
}
