import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {buildRoleValidationPlan,validationScenarios} from "../assets/js/core/role-validation.js";

assert.equal(validationScenarios.length,6);
assert.deepEqual([...new Set(validationScenarios.map(row=>row.device))].sort(),["Computador","Telemóvel"]);
const incomplete=buildRoleValidationPlan({profiles:[{id:"a",role:"admin",ativo:true},{id:"t",role:"funcionario",ativo:true}],assignments:[],works:[]});
assert.equal(incomplete.ready,false);assert.equal(incomplete.realValidationPerformed,false);assert.equal(incomplete.mode,"preparation-only");assert.equal(incomplete.roles.find(row=>row.role==="admin").ready,true);assert.equal(incomplete.roles.find(row=>row.role==="team").ready,false);assert.equal(incomplete.roles.find(row=>row.role==="client").ready,false);
const complete=buildRoleValidationPlan({profiles:[{id:"a",role:"admin",ativo:true},{id:"t",role:"encarregado",ativo:true},{id:"u",role:"cliente",ativo:true}],assignments:[{user_id:"t",obra_id:"w",ativo:true}],works:[{id:"w"}],clientAccess:[{user_id:"u",cliente_id:"c",ativo:true}],clients:[{id:"c"}],portalWorks:[{cliente_id:"c",publicado:true}]});
assert.equal(complete.ready,true);assert.equal(complete.roles.every(row=>row.scenarios.length===2),true);assert(complete.guardrails.some(row=>row.includes("autorização específica")));assert.equal(JSON.stringify(complete).includes("pagamentos"),false);
const root=resolve(import.meta.dirname,".."),html=readFileSync(resolve(root,"index.html"),"utf8"),ui=readFileSync(resolve(root,"assets/js/modules/role-validation-ui.js"),"utf8");
for(const token of ['id="openRoleValidation"','id="roleValidationDialog"','id="exportRoleValidation"','realValidationPerformed:false','mode:"preparation-only"'])assert(html.includes(token)||ui.includes(token)||readFileSync(resolve(root,"assets/js/core/role-validation.js"),"utf8").includes(token),`Matriz incompleta: ${token}`);
assert.equal(/db\.(from|rpc|functions)/.test(ui),false,"A matriz não pode alterar dados nem chamar operações remotas.");
console.log("Plano de validação aprovado: três perfis, dois dispositivos, pré-condições, isolamento e validação real explicitamente pendente.");
