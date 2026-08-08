const validRoles=new Set(["admin","funcionario","cliente"]);
export const isValidRole=role=>validRoles.has(role);

export function summarizeAccess({profiles=[],assignments=[],clientAccess=[]}={}){
  const activeAssignments=assignments.filter(row=>row.ativo!==false),activeClientAccess=clientAccess.filter(row=>row.ativo!==false);
  return {
    total:profiles.length,
    active:profiles.filter(row=>row.ativo!==false).length,
    inactive:profiles.filter(row=>row.ativo===false).length,
    invalid:profiles.filter(row=>!isValidRole(row.role)).length,
    team:profiles.filter(row=>row.role==="funcionario").length,
    clients:profiles.filter(row=>row.role==="cliente").length,
    assignments:activeAssignments.length,
    clientLinks:activeClientAccess.length
  };
}

export function filterAccessAccounts(profiles=[],{search="",role="",state=""}={}){
  const term=search.trim().toLowerCase();
  return profiles.filter(row=>(!term||`${row.nome||""} ${row.email||""}`.toLowerCase().includes(term))&&(!role||row.role===role)&&(!state||(state==="active"?row.ativo!==false:row.ativo===false)));
}

export function analyzeAccessHealth({profiles=[],assignments=[],clientAccess=[]}={}){
  const activeAssignments=assignments.filter(row=>row.ativo!==false),activeClientAccess=clientAccess.filter(row=>row.ativo!==false),findings=[];
  for(const profile of profiles){
    const assigned=activeAssignments.filter(row=>String(row.user_id)===String(profile.id)).length;
    const linked=activeClientAccess.filter(row=>String(row.user_id)===String(profile.id)).length;
    if(!isValidRole(profile.role))findings.push({accountId:profile.id,severity:"critical",code:"invalid-role",message:"Perfil de acesso inválido"});
    if(profile.ativo===false&&(assigned||linked))findings.push({accountId:profile.id,severity:"critical",code:"inactive-access",message:`Conta desativada mantém ${assigned+linked} vínculo(s) ativo(s)`});
    if(profile.ativo!==false&&profile.role==="funcionario"&&!assigned)findings.push({accountId:profile.id,severity:"warning",code:"team-without-work",message:"Conta de equipa sem obra atribuída"});
    if(profile.ativo!==false&&profile.role==="cliente"&&!linked)findings.push({accountId:profile.id,severity:"warning",code:"client-without-link",message:"Conta de cliente sem vínculo autorizado"});
    if(profile.ativo!==false&&!profile.email)findings.push({accountId:profile.id,severity:"warning",code:"missing-email",message:"Conta ativa sem e-mail identificado"});
  }
  return findings.sort((a,b)=>(a.severity==="critical"?0:1)-(b.severity==="critical"?0:1)||String(a.message).localeCompare(String(b.message)));
}

export function latestActivityByUser(activities=[]){
  const latest=new Map();
  for(const row of activities){const id=String(row.utilizador_id||"");if(!id)continue;const current=latest.get(id);if(!current||String(row.criado_em||"")>String(current.criado_em||""))latest.set(id,row)}
  return latest;
}

