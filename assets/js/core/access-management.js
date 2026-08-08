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

