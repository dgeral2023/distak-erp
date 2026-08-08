import assert from "node:assert/strict";
import {validationScenarios} from "../assets/js/core/role-validation.js";
import {buildValidationEvidence,createValidationRecord,scenarioForSession,validationDevice,validationRole,validationStatus} from "../assets/js/core/human-validation.js";

assert.equal(validationRole("admin"),"admin");assert.equal(validationRole("funcionario"),"team");assert.equal(validationRole("cliente"),null);
assert.equal(validationDevice({width:390,coarse:true}),"Telemóvel");assert.equal(validationDevice({width:1440,coarse:false}),"Computador");
const adminDesktop=scenarioForSession(validationScenarios,"admin","Computador"),teamMobile=scenarioForSession(validationScenarios,"funcionario","Telemóvel");
assert.equal(adminDesktop.id,"admin-desktop");assert.equal(teamMobile.id,"team-mobile");assert.equal(scenarioForSession(validationScenarios,"cliente","Computador"),null);
let incompleteAccepted=false;try{createValidationRecord({scenario:adminDesktop,checked:adminDesktop.checks.slice(1),attested:true})}catch{incompleteAccepted=true}assert(incompleteAccepted,"Uma validação incompleta foi aceite.");
const records=validationScenarios.filter(row=>["admin","team"].includes(row.role)).map((scenario,index)=>createValidationRecord({scenario,checked:scenario.checks,attested:true,completedAt:`2026-08-08T12:0${index}:00.000Z`}));
assert.deepEqual(validationStatus(records,validationScenarios),{passed:["admin-desktop","admin-mobile","team-desktop","team-mobile"],completed:4,total:4,complete:true});
const evidence=buildValidationEvidence(records,"2026-08-08T13:00:00.000Z");assert.equal(evidence.results.length,4);assert.deepEqual(evidence.privacy,{containsNames:false,containsEmails:false,containsOperationalData:false,containsFinancialData:false});assert.equal(JSON.stringify(evidence).includes("@"),false);
console.log("Validação humana aprovada: quatro cenários, confirmação explícita, isolamento por perfil/dispositivo e evidência local sem dados pessoais.");
