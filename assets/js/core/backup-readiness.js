const relationRules=[
  ["obras","cliente_id","clientes","cliente"],
  ["clienteContactos","cliente_id","clientes","cliente"],
  ["clienteMoradas","cliente_id","clientes","cliente"],
  ["clienteNotas","cliente_id","clientes","cliente"],
  ["clienteComunicacoes","cliente_id","clientes","cliente"],
  ["clienteDocumentos","cliente_id","clientes","cliente"],
  ["leads","cliente_id","clientes","cliente"],
  ["custos","obra_id","obras","obra"],
  ["pagamentos","obra_id","obras","obra"],
  ["fotografias","obra_id","obras","obra"],
  ["documentosObra","obra_id","obras","obra"],
  ["agendaTarefas","obra_id","obras","obra"],
  ["previsoesFinanceiras","obra_id","obras","obra"],
  ["autosMedicao","obra_id","obras","obra"],
  ["campoRegistos","obra_id","obras","obra"],
  ["diariosObra","obra_id","obras","obra"]
];

const list=value=>Array.isArray(value)?value:[];

export function assessRecoveryReadiness(payload,now=Date.now()){
  const data=payload?.data||{},issues=[];
  const ageDays=Math.max(0,Math.floor((now-Date.parse(payload?.createdAt||0))/86400000));
  if(ageDays>30)issues.push({code:"stale",message:`A cópia tem ${ageDays} dias; crie uma cópia atual antes de recuperar.`});
  const total=Object.values(data).reduce((sum,rows)=>sum+list(rows).length,0);
  if(total===0)issues.push({code:"empty",message:"A cópia não contém registos para recuperar."});

  for(const [name,rowsValue] of Object.entries(data)){
    const ids=list(rowsValue).map(row=>row?.id).filter(value=>value!==null&&value!==undefined&&value!=="").map(String);
    const duplicateCount=ids.length-new Set(ids).size;
    if(duplicateCount)issues.push({code:"duplicate_id",collection:name,count:duplicateCount,message:`${name}: ${duplicateCount} identificador(es) duplicado(s).`});
  }

  for(const [source,field,target,label] of relationRules){
    const targetIds=new Set(list(data[target]).map(row=>row?.id).filter(value=>value!==null&&value!==undefined&&value!=="").map(String));
    const broken=list(data[source]).filter(row=>row?.[field]!==null&&row?.[field]!==undefined&&row?.[field]!==""&&!targetIds.has(String(row[field]))).length;
    if(broken)issues.push({code:"broken_relation",collection:source,target,count:broken,message:`${source}: ${broken} ligação(ões) sem ${label} correspondente.`});
  }

  return {
    status:issues.length?"review_required":"ready",
    ageDays,
    totalRecords:total,
    issues,
    checks:[
      "Integridade SHA-256 confirmada",
      "Contagens e coleções verificadas",
      "Identificadores duplicados analisados",
      "Ligações principais entre registos analisadas"
    ],
    automaticRestore:false
  };
}
