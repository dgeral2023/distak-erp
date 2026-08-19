const DAY=86400000;
export function assessOperationalReadiness({online=true,profile=null,dataWarnings=[],serviceWorker=false,backup=null,now=Date.now()}={}){
  const checks=[],add=(code,label,status,detail,action="")=>checks.push({code,label,status,detail,action});
  add("connection","Ligação ao serviço",online?"ok":"critical",online?"Dispositivo ligado à rede.":"Sem ligação; alterações remotas não estão disponíveis.",online?"":"Verificar ligação");
  add("session","Sessão e perfil",profile?.id&&profile?.role?"ok":"critical",profile?.id&&profile?.role?`Perfil ${profile.role} identificado.`:"Sessão ou perfil incompleto.",profile?.id&&profile?.role?"":"Entrar novamente");
  add("data","Carregamento dos dados",dataWarnings.length?"warning":"ok",dataWarnings.length?`${dataWarnings.length} módulo(s) não foram carregados: ${dataWarnings.join(", ")}.`:"Todos os módulos previstos foram carregados.",dataWarnings.length?"Atualizar dados":"");
  add("pwa","Aplicação offline",serviceWorker?"ok":"warning",serviceWorker?"Cache offline suportado neste dispositivo.":"O modo offline ainda não está ativo neste navegador.",serviceWorker?"":"Reabrir com ligação");
  const created=backup?.createdAt?Date.parse(backup.createdAt):NaN,age=Number.isFinite(created)?Math.max(0,Math.floor((now-created)/DAY)):null;
  const backupStatus=age===null?"warning":age>30?"critical":age>7?"warning":"ok";
  add("backup","Cópia administrativa",backupStatus,age===null?"Nenhuma exportação foi confirmada neste dispositivo.":`Última exportação confirmada há ${age} dia(s), com ${Number(backup.totalRecords||0)} registo(s).`,"Exportar cópia");
  const critical=checks.filter(row=>row.status==="critical").length,warnings=checks.filter(row=>row.status==="warning").length;
  return {status:critical?"critical":warnings?"attention":"ready",critical,warnings,checks,automaticRecovery:false,externalTelemetry:false};
}
