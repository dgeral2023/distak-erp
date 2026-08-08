const allowedStatus=new Set(["ready","attention","critical"]);
export function buildSupportDiagnostic({readiness,role="unknown",appVersion="v3.8",generatedAt=new Date().toISOString()}={}){
  const status=allowedStatus.has(readiness?.status)?readiness.status:"critical";
  const checks=(readiness?.checks||[]).map(row=>({code:String(row.code||"unknown"),status:String(row.status||"critical"),label:String(row.label||"Verificação")}));
  return {format:"distak-support-diagnostic",version:1,generatedAt,appVersion,scope:"local-read-only",role:["admin","funcionario"].includes(role)?role:"unknown",summary:{status,critical:Number(readiness?.critical||0),warnings:Number(readiness?.warnings||0)},checks,privacy:{containsPersonalData:false,containsFinancialData:false,containsCredentials:false,externalTelemetry:false},guidance:status==="ready"?["Registar a hora e a ação que apresentou o problema.","Reproduzir uma vez antes de abrir o pedido de suporte."]:["Resolver primeiro as verificações críticas ou com aviso.","Não repetir operações financeiras enquanto o estado não estiver preparado."]};
}

export function supportSeverity({dataLoss=false,security=false,blockedUsers=0,financialBlocked=false,degraded=false}={}){
  if(dataLoss||security||financialBlocked||blockedUsers>1)return "P1";
  if(blockedUsers===1||degraded)return "P2";
  return "P3";
}
