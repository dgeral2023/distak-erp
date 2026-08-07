import assert from "node:assert/strict";
import {buildRecommendedActions} from "../assets/js/core/intelligence-actions.js";

const risky={work:{id:"obra-1"},blocked:2,late:3,overdueInvoices:1,marginRate:4,progress:70,receivedRate:20,confidence:"baixa"};
const snapshot=JSON.stringify(risky);
const actions=buildRecommendedActions(risky);

assert.equal(actions.length,3,"A inteligência deve limitar a recomendação às três ações prioritárias.");
assert.equal(actions[0].code,"unblock","Um bloqueio deve ser tratado antes dos restantes desvios.");
assert.equal(actions[0].priority,100,"A prioridade de desbloqueio deve permanecer máxima.");
assert.ok(actions.every(item=>item.safe===true&&item.automation===false),"As recomendações não podem executar alterações automaticamente.");
assert.ok(actions.every(item=>item.view&&item.title&&item.reason),"Cada recomendação deve explicar a ação e indicar a área de destino.");
assert.equal(JSON.stringify(risky),snapshot,"O motor não deve alterar os dados recebidos.");

const healthy=buildRecommendedActions({work:{id:"obra-2"},blocked:0,late:0,overdueInvoices:0,marginRate:20,progress:30,receivedRate:25,confidence:"alta"});
assert.equal(healthy[0].code,"monitor","Uma obra saudável deve receber apenas acompanhamento preventivo.");

const incomplete=buildRecommendedActions({work:{id:"obra-3"},blocked:0,late:0,overdueInvoices:0,marginRate:20,progress:0,receivedRate:0,confidence:"baixa"});
assert.equal(incomplete[0].code,"improve_data","Baixa confiança deve recomendar a melhoria dos dados.");
assert.equal(incomplete[0].view,"obras","A melhoria dos dados deve abrir a ficha da obra.");

console.log("Inteligência: recomendações explicáveis, ordenadas e sem automação validadas.");
