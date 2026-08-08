const teamRoles=new Set(["escritorio","encarregado","funcionario"]);
export const validationRole=role=>role==="admin"?"admin":teamRoles.has(role)?"team":null;
export const validationDevice=({width=innerWidth,coarse=matchMedia("(pointer: coarse)").matches}={})=>width<=900&&coarse?"Telemóvel":"Computador";
export function scenarioForSession(scenarios,role,device){const normalized=validationRole(role);return scenarios.find(row=>row.role===normalized&&row.device===device)||null}
export function createValidationRecord({scenario,checked=[],attested=false,completedAt=new Date().toISOString()}={}){
  if(!scenario||!attested||!scenario.checks.every(check=>checked.includes(check)))throw new Error("Conclua todas as verificações e confirme a declaração.");
  return {format:"distak-human-validation",version:1,scenarioId:scenario.id,role:scenario.role,device:scenario.device,checks:scenario.checks.map(check=>({label:check,passed:true})),attested:true,completedAt};
}
export function validationStatus(records=[],scenarios=[]){const passed=new Set(records.filter(row=>row?.format==="distak-human-validation"&&row.attested&&row.checks?.every(check=>check.passed===true)).map(row=>row.scenarioId)),required=scenarios.filter(row=>["admin","team"].includes(row.role));return {passed:[...passed],completed:required.filter(row=>passed.has(row.id)).length,total:required.length,complete:required.length>0&&required.every(row=>passed.has(row.id))}}
export const buildValidationEvidence=(records=[],generatedAt=new Date().toISOString())=>({format:"distak-human-validation-evidence",version:1,generatedAt,scope:"administrator-and-employee",results:records.filter(row=>row?.format==="distak-human-validation"),privacy:{containsNames:false,containsEmails:false,containsOperationalData:false,containsFinancialData:false},notice:"Declaração local de execução humana; não substitui auditoria independente."});
