const teams=new Set(["escritorio","encarregado","funcionario"]),list=value=>Array.isArray(value)?value:[],idSet=rows=>new Set(list(rows).map(row=>row?.id).filter(value=>value!=null&&value!=="").map(String)),rel="obras:cliente_id:clientes,custos:obra_id:obras,pagamentos:obra_id:obras,fotografias:obra_id:obras,documentosObra:obra_id:obras,agendaTarefas:obra_id:obras,obraUtilizadores:obra_id:obras,obraUtilizadores:user_id:profiles".split(",").map(rule=>rule.split(":"));

export function rehearseRecoveryInMemory(payload){
  if(payload?.format!=="distak-erp-backup"||payload?.version!==1||!payload?.data)throw new Error("Cópia inválida.");
  const sandbox=structuredClone(payload.data),counts={},issues=[];
  for(const [name,rows] of Object.entries(sandbox)){
    if(!Array.isArray(rows)){issues.push({code:"invalid_collection",collection:name});continue}
    counts[name]=rows.length;
    const ids=rows.map(row=>row?.id).filter(value=>value!=null&&value!=="").map(String);
    if(ids.length!==new Set(ids).size)issues.push({code:"duplicate_id",collection:name});
  }
  for(const [source,field,target] of rel){
    const targets=idSet(sandbox[target]);
    const broken=list(sandbox[source]).filter(row=>row?.[field]!=null&&row?.[field]!==""&&!targets.has(String(row[field]))).length;
    if(broken)issues.push({code:"broken_relation",collection:source,target,count:broken});
  }
  const profiles=list(sandbox.profiles).filter(row=>row?.ativo!==false),adminCount=profiles.filter(row=>row.role==="admin").length,team=profiles.filter(row=>teams.has(row.role)),workIds=idSet(sandbox.obras),assigned=team.filter(profile=>list(sandbox.obraUtilizadores).some(link=>link?.ativo!==false&&String(link.user_id)===String(profile.id)&&workIds.has(String(link.obra_id)))).length;
  if(adminCount<1)issues.push({code:"missing_admin"});
  if(team.length<1)issues.push({code:"missing_team"});
  else if(assigned<1)issues.push({code:"unassigned_team"});
  const source=Object.values(payload.recordCounts||{}).reduce((sum,value)=>sum+Number(value||0),0),recoveredTotal=Object.values(counts).reduce((sum,value)=>sum+value,0);
  if(source!==recoveredTotal)issues.push({code:"count_mismatch",expected:source,actual:recoveredTotal});
  return {writes:0,status:issues.length?"review_required":"passed",source,recoveredTotal,collections:Object.keys(counts).length,access:{adminPrepared:adminCount>0,teamPrepared:assigned>0},issues};
}
