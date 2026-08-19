import assert from "node:assert/strict";
import {rehearseRecoveryInMemory} from "../assets/js/core/recovery-rehearsal.js";

const payload={format:"distak-erp-backup",version:1,recordCounts:{profiles:2,clientes:1,obras:1,obraUtilizadores:1,custos:1},data:{profiles:[{id:"a",role:"admin",ativo:true},{id:"f",role:"funcionario",ativo:true}],clientes:[{id:"c"}],obras:[{id:"o",cliente_id:"c"}],obraUtilizadores:[{id:"v",user_id:"f",obra_id:"o",ativo:true}],custos:[{id:"x",obra_id:"o"}]}};
const before=JSON.stringify(payload),result=rehearseRecoveryInMemory(payload);
assert.equal(result.status,"passed");
assert.equal(result.writes,0);
assert.equal(result.source,6);
assert.equal(result.recoveredTotal,6);
assert.deepEqual(result.access,{adminPrepared:true,teamPrepared:true});
assert.equal(JSON.stringify(payload),before,"O ensaio não pode alterar a cópia original.");
const broken=structuredClone(payload);broken.data.obraUtilizadores[0].obra_id="inexistente";
assert.equal(rehearseRecoveryInMemory(broken).status,"review_required");
assert(rehearseRecoveryInMemory(broken).issues.some(issue=>issue.code==="broken_relation"));
const noAdmin=structuredClone(payload);noAdmin.data.profiles=noAdmin.data.profiles.filter(row=>row.role!=="admin");noAdmin.recordCounts.profiles=1;
assert(rehearseRecoveryInMemory(noAdmin).issues.some(issue=>issue.code==="missing_admin"));
console.log("Recuperação ensaiada: reconstrução descartável, contagens, relações e acessos Administrador/Funcionário aprovados com zero escritas em produção.");
