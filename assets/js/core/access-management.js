const validRoles=new Set(["admin","escritorio","encarregado","funcionario","cliente"]);
export const isValidRole=role=>validRoles.has(role);
export const isTeamRole=role=>["escritorio","encarregado","funcionario"].includes(role);

export function validateAccountChange(current,next,currentUserId=""){
  const errors=[],reason=String(next.reason||"").trim();
  if(!current?.id)errors.push("Conta inválida");
  if(String(current?.id)===String(currentUserId))errors.push("A sua própria conta não pode ser alterada por este fluxo");
  if(!isValidRole(next.role))errors.push("Perfil inválido");
  if(next.role==="admin"&&next.active===false)errors.push("Um administrador deve permanecer ativo");
  if(reason.length<10||reason.length>500)errors.push("Indique um motivo entre 10 e 500 caracteres");
  if(current?.role===next.role&&(current?.ativo!==false)===next.active)errors.push("Não existem alterações para guardar");
  return errors;
}

export function summarizeAccess({profiles=[],assignments=[],clientAccess=[]}={}){
  const activeAssignments=assignments.filter(row=>row.ativo!==false),activeClientAccess=clientAccess.filter(row=>row.ativo!==false);
  return {
    total:profiles.length,
    active:profiles.filter(row=>row.ativo!==false).length,
    inactive:profiles.filter(row=>row.ativo===false).length,
    invalid:profiles.filter(row=>!isValidRole(row.role)).length,
    team:profiles.filter(row=>isTeamRole(row.role)).length,
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
    if(profile.ativo!==false&&isTeamRole(profile.role)&&!assigned)findings.push({accountId:profile.id,severity:"warning",code:"team-without-work",message:"Conta de equipa sem obra atribuída"});
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

export function sessionHistory(activities=[],limit=20){
  return activities
    .filter(row=>row.entidade==="sessao"&&["entrou","saiu","recuperou_acesso"].includes(row.acao))
    .sort((a,b)=>String(b.criado_em||"").localeCompare(String(a.criado_em||"")))
    .slice(0,Math.max(0,limit));
}

export function summarizeSessions(activities=[],now=new Date()){
  const rows=sessionHistory(activities,Number.MAX_SAFE_INTEGER),since=new Date(now);
  since.setDate(since.getDate()-30);
  const recent=rows.filter(row=>new Date(row.criado_em)>=since);
  return {events:recent.length,signIns:recent.filter(row=>row.acao==="entrou").length,recoveries:recent.filter(row=>row.acao==="recuperou_acesso").length,accounts:new Set(recent.map(row=>String(row.utilizador_id))).size};
}

export function buildAccessAudit({profiles=[],assignments=[],clientAccess=[],activities=[],generatedAt=new Date().toISOString()}={}){
  const activeAssignments=assignments.filter(row=>row.ativo!==false),activeClientAccess=clientAccess.filter(row=>row.ativo!==false),latest=latestActivityByUser(activities);
  return {
    format:"distak-access-audit",version:2,generatedAt,source:"web-v3.8",summary:summarizeAccess({profiles,assignments,clientAccess}),sessionSummary:summarizeSessions(activities,new Date(generatedAt)),
    findings:analyzeAccessHealth({profiles,assignments,clientAccess}),
    sessions:sessionHistory(activities,100).map(row=>({accountId:row.utilizador_id,action:row.acao,at:row.criado_em})),accounts:profiles.map(profile=>({
      id:profile.id,email:profile.email||null,name:profile.nome||null,role:profile.role||null,active:profile.ativo!==false,
      assignedWorks:activeAssignments.filter(row=>String(row.user_id)===String(profile.id)).map(row=>row.obra_id),
      clientLinks:activeClientAccess.filter(row=>String(row.user_id)===String(profile.id)).map(row=>row.cliente_id),
      lastActivityAt:latest.get(String(profile.id))?.criado_em||null
    }))
  };
}

