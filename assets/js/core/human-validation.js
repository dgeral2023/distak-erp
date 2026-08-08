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

export function validateValidationEvidence(input,scenarios=[]){
  let evidence;try{evidence=typeof input==="string"?JSON.parse(input):input}catch{throw new Error("O ficheiro não contém JSON válido.")}if(evidence?.format!=="distak-human-validation-evidence"||evidence?.version!==1||evidence?.scope!=="administrator-and-employee"||!Array.isArray(evidence.results)||evidence.results.length>8)throw new Error("Ficheiro de evidência incompatível.");
  const allowed=new Map(scenarios.filter(row=>["admin","team"].includes(row.role)).map(row=>[row.id,row])),seen=new Set();
  const results=evidence.results.map(record=>{const scenario=allowed.get(record?.scenarioId);if(!scenario||seen.has(record.scenarioId)||record.format!=="distak-human-validation"||record.version!==1||record.role!==scenario.role||record.device!==scenario.device||record.attested!==true||!Number.isFinite(Date.parse(record.completedAt))||!Array.isArray(record.checks)||record.checks.length!==scenario.checks.length||!scenario.checks.every((label,index)=>record.checks[index]?.label===label&&record.checks[index]?.passed===true))throw new Error("A evidência contém um cenário inválido, duplicado ou incompleto.");seen.add(record.scenarioId);return structuredClone(record)});
  return results;
}
export function mergeValidationRecords(current=[],incoming=[]){const merged=new Map(current.map(row=>[row.scenarioId,row]));for(const row of incoming){const previous=merged.get(row.scenarioId);if(!previous||Date.parse(row.completedAt)>=Date.parse(previous.completedAt))merged.set(row.scenarioId,row)}return [...merged.values()]}
export function buildFinalValidationReport(records=[],scenarios=[],generatedAt=new Date().toISOString()){
  const verified=validateValidationEvidence(buildValidationEvidence(records),scenarios),status=validationStatus(verified,scenarios);if(!status.complete)throw new Error(`Faltam ${status.total-status.completed} cenário(s) para concluir a validação.`);
  const allowed=new Set(status.passed);return {format:"distak-final-validation-report",version:1,generatedAt,releaseScope:["admin","team"],complete:true,scenarios:verified.filter(row=>allowed.has(row.scenarioId)).map(row=>({scenarioId:row.scenarioId,role:row.role,device:row.device,completedAt:row.completedAt,checksPassed:row.checks.length,attested:true})),privacy:{containsNames:false,containsEmails:false,containsOperationalData:false,containsFinancialData:false},notice:"Consolidação de declarações humanas locais; não substitui auditoria independente."};
}
