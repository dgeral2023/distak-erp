import {createHash} from "node:crypto";
import {store} from "../assets/js/core/store.js";
import {createSafetyBackup} from "../assets/js/modules/backup.js";

store.profile={role:"admin",id:"admin-test"};
store.clientes=[{id:1,nome:"Cliente de teste"}];
store.obras=[{id:2,cliente_id:1,nome:"Obra de teste"}];
store.custos=[{id:3,obra_id:2,valor:100}];
const exported=JSON.parse(await createSafetyBackup());
if(exported.payload.format!=="distak-erp-backup"||exported.payload.version!==1)throw new Error("Formato de backup inválido.");
if(exported.payload.recordCounts.clientes!==1||exported.payload.recordCounts.obras!==1)throw new Error("Contagens do backup inválidas.");
const checksum=createHash("sha256").update(JSON.stringify(exported.payload)).digest("hex");
if(checksum!==exported.integrity.checksum)throw new Error("Checksum do backup inválido.");
store.profile={role:"funcionario"};
let denied=false;try{await createSafetyBackup()}catch{denied=true}
if(!denied)throw new Error("Um não administrador conseguiu criar backup.");
console.log("Backup aprovado: formato, contagens, checksum e acesso administrativo verificados.");
