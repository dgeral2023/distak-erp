import assert from "node:assert/strict";
import {analyzeAccessHealth,buildAccessAudit,filterAccessAccounts,isValidRole,latestActivityByUser,sessionHistory,summarizeAccess,summarizeSessions} from "../assets/js/core/access-management.js";

const profiles=[
  {id:"admin",nome:"Administrador",email:"admin@distak.test",role:"admin",ativo:true},
  {id:"team",nome:"Equipa Norte",email:"equipa@distak.test",role:"funcionario",ativo:true},
  {id:"client",nome:"Cliente",email:"cliente@distak.test",role:"cliente",ativo:false},
  {id:"invalid",nome:"Perfil inválido",email:"risco@distak.test",role:"owner",ativo:true}
];
const summary=summarizeAccess({profiles,assignments:[{user_id:"team",ativo:true},{user_id:"team",ativo:false}],clientAccess:[{user_id:"client",ativo:true}]});
assert.deepEqual(summary,{total:4,active:3,inactive:1,invalid:1,team:1,clients:1,assignments:1,clientLinks:1});
assert.equal(isValidRole("admin"),true);
assert.equal(isValidRole("owner"),false);
assert.deepEqual(filterAccessAccounts(profiles,{search:"norte"}).map(row=>row.id),["team"]);
assert.deepEqual(filterAccessAccounts(profiles,{role:"cliente",state:"inactive"}).map(row=>row.id),["client"]);
assert.equal(filterAccessAccounts(profiles,{state:"active"}).some(row=>row.id==="client"),false);
const health=analyzeAccessHealth({profiles,assignments:[{user_id:"client",ativo:true}],clientAccess:[]});
assert.equal(health[0].severity,"critical","Situações críticas devem aparecer primeiro.");
assert(health.some(row=>row.accountId==="client"&&row.code==="inactive-access"),"Conta desativada com vínculo deve ser sinalizada.");
assert(health.some(row=>row.accountId==="team"&&row.code==="team-without-work"),"Equipa ativa sem obra deve ser revista.");
assert(health.some(row=>row.accountId==="invalid"&&row.code==="invalid-role"),"Perfil fora da lista deve ser crítico.");
const latest=latestActivityByUser([{utilizador_id:"team",criado_em:"2026-08-01T10:00:00Z"},{utilizador_id:"team",criado_em:"2026-08-02T10:00:00Z"},{utilizador_id:"admin",criado_em:"2026-08-01T09:00:00Z"}]);
assert.equal(latest.get("team").criado_em,"2026-08-02T10:00:00Z","A atividade mais recente deve prevalecer.");
const sessionRows=[{utilizador_id:"team",entidade:"sessao",acao:"entrou",criado_em:"2026-08-08T10:00:00Z"},{utilizador_id:"team",entidade:"sessao",acao:"saiu",criado_em:"2026-08-08T11:00:00Z"},{utilizador_id:"admin",entidade:"sessao",acao:"recuperou_acesso",criado_em:"2026-08-07T09:00:00Z"},{utilizador_id:"admin",entidade:"obra",acao:"atualizou",criado_em:"2026-08-08T11:30:00Z"}];
assert.deepEqual(sessionHistory(sessionRows,2).map(row=>row.acao),["saiu","entrou"],"O histórico deve excluir atividades operacionais e ordenar eventos recentes.");
assert.deepEqual(summarizeSessions(sessionRows,new Date("2026-08-08T12:00:00Z")),{events:3,signIns:1,recoveries:1,accounts:2});
const audit=buildAccessAudit({profiles,assignments:[{user_id:"team",obra_id:"work-1",ativo:true}],clientAccess:[{user_id:"client",cliente_id:"customer-1",ativo:true}],activities:[{utilizador_id:"team",criado_em:"2026-08-02T10:00:00Z"},...sessionRows],generatedAt:"2026-08-08T12:00:00Z"});
assert.equal(audit.format,"distak-access-audit");
assert.equal(audit.version,2);
assert.equal(audit.sessions.length,3);
assert.equal(audit.sessionSummary.recoveries,1);
assert.deepEqual(audit.accounts.find(row=>row.id==="team").assignedWorks,["work-1"]);
assert.equal(audit.accounts.find(row=>row.id==="team").lastActivityAt,"2026-08-08T11:00:00Z");
assert.equal(JSON.stringify(audit).includes("pagamentos"),false,"A auditoria não deve conter dados financeiros.");
console.log("Acessos v3.8 aprovados: estados, perfis inválidos, vínculos e filtros validados sem mutações.");

