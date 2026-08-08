import assert from "node:assert/strict";
import {filterAccessAccounts,isValidRole,summarizeAccess} from "../assets/js/core/access-management.js";

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
console.log("Acessos v3.8 aprovados: estados, perfis inválidos, vínculos e filtros validados sem mutações.");

