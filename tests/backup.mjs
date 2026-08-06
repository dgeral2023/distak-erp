import {createHash} from "node:crypto";
import {store} from "../assets/js/core/store.js";
import {createSafetyBackup,inspectSafetyBackup} from "../assets/js/modules/backup.js";
import {assessRecoveryReadiness} from "../assets/js/core/backup-readiness.js";

store.profile={role:"admin",id:"admin-test"};
store.clientes=[{id:1,nome:"Cliente de teste"}];
store.obras=[{id:2,cliente_id:1,nome:"Obra de teste"}];
store.custos=[{id:3,obra_id:2,valor:100}];
const exported=JSON.parse(await createSafetyBackup());
if(exported.payload.format!=="distak-erp-backup"||exported.payload.version!==1)throw new Error("Formato de backup inválido.");
if(exported.payload.recordCounts.clientes!==1||exported.payload.recordCounts.obras!==1)throw new Error("Contagens do backup inválidas.");
const checksum=createHash("sha256").update(JSON.stringify(exported.payload)).digest("hex");
if(checksum!==exported.integrity.checksum)throw new Error("Checksum do backup inválido.");
const stateBefore=JSON.stringify({clientes:store.clientes,obras:store.obras,custos:store.custos});
const inspected=await inspectSafetyBackup(JSON.stringify(exported));
if(!inspected.valid||inspected.totalRecords<3||inspected.counts.clientes!==1||inspected.readiness.status!=="ready"||inspected.readiness.automaticRestore!==false)throw new Error("A inspeção não confirmou o conteúdo e a prontidão da cópia.");
if(JSON.stringify({clientes:store.clientes,obras:store.obras,custos:store.custos})!==stateBefore)throw new Error("A inspeção alterou os dados carregados.");
const tampered=structuredClone(exported);tampered.payload.data.clientes[0].nome="Alterado";
let damagedAccepted=false;try{await inspectSafetyBackup(JSON.stringify(tampered));damagedAccepted=true}catch{}
if(damagedAccepted)throw new Error("Uma cópia alterada passou na verificação de integridade.");
store.profile={role:"funcionario"};
let exportDenied=false;try{await createSafetyBackup()}catch{exportDenied=true}
let inspectDenied=false;try{await inspectSafetyBackup(JSON.stringify(exported))}catch{inspectDenied=true}
if(!exportDenied||!inspectDenied)throw new Error("Um não administrador conseguiu exportar ou verificar uma cópia.");
const orphaned=structuredClone(exported.payload);orphaned.data.custos.push({id:4,obra_id:999,valor:10});orphaned.recordCounts.custos=orphaned.data.custos.length;
const orphanedBefore=JSON.stringify(orphaned);
const orphanAssessment=assessRecoveryReadiness(orphaned);
if(orphanAssessment.status!=="review_required"||!orphanAssessment.issues.some(issue=>issue.code==="broken_relation"))throw new Error("Uma ligação quebrada não foi assinalada no plano de recuperação.");
if(JSON.stringify(orphaned)!==orphanedBefore)throw new Error("A análise de prontidão alterou a cópia inspecionada.");
const duplicated=structuredClone(exported.payload);duplicated.data.clientes.push({...duplicated.data.clientes[0]});duplicated.recordCounts.clientes=duplicated.data.clientes.length;
if(!assessRecoveryReadiness(duplicated).issues.some(issue=>issue.code==="duplicate_id"))throw new Error("Um identificador duplicado não foi assinalado.");
const old=structuredClone(exported.payload);old.createdAt="2025-01-01T00:00:00.000Z";
if(!assessRecoveryReadiness(old,Date.parse("2026-08-06T00:00:00.000Z")).issues.some(issue=>issue.code==="stale"))throw new Error("Uma cópia antiga não foi assinalada.");
console.log("Backup aprovado: exportação, prontidão, relações, duplicados, antiguidade, checksum e acesso administrativo verificados sem escrita.");
