import {createHash} from "node:crypto";
import {store} from "../assets/js/core/store.js";
import {createSafetyBackup,inspectSafetyBackup} from "../assets/js/modules/backup.js";

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
if(!inspected.valid||inspected.totalRecords<3||inspected.counts.clientes!==1)throw new Error("A inspeção não confirmou o conteúdo da cópia.");
if(JSON.stringify({clientes:store.clientes,obras:store.obras,custos:store.custos})!==stateBefore)throw new Error("A inspeção alterou os dados carregados.");
const tampered=structuredClone(exported);tampered.payload.data.clientes[0].nome="Alterado";
let damagedAccepted=false;try{await inspectSafetyBackup(JSON.stringify(tampered));damagedAccepted=true}catch{}
if(damagedAccepted)throw new Error("Uma cópia alterada passou na verificação de integridade.");
store.profile={role:"funcionario"};
let exportDenied=false;try{await createSafetyBackup()}catch{exportDenied=true}
let inspectDenied=false;try{await inspectSafetyBackup(JSON.stringify(exported))}catch{inspectDenied=true}
if(!exportDenied||!inspectDenied)throw new Error("Um não administrador conseguiu exportar ou verificar uma cópia.");
console.log("Backup aprovado: exportação, inspeção sem escrita, contagens, checksum e acesso administrativo verificados.");
