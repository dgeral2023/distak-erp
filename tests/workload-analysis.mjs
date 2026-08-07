import assert from "node:assert/strict";
import {analyzeWorkload} from "../assets/js/core/workload-analysis.js";

const input={
  today:"2026-08-06",
  month:"2026-08",
  profiles:[{id:"perfil-inativo",nome:"Perfil inativo",role:"funcionario",ativo:false}],
  employees:[{id:"ana",nome:"Ana",estado:"Ativo"},{id:"bruno",nome:"Bruno",estado:"Ativo"},{id:"inativo",nome:"Inativo",estado:"Inativo"}],
  tasks:[
    {id:1,funcionario_id:"ana",estado:"bloqueada",prioridade:"urgente",prazo:"2026-08-01"},
    {id:2,funcionario_id:"ana",estado:"pendente",prioridade:"alta",prazo:"2026-08-05"},
    {id:3,estado:"pendente",prioridade:"urgente",prazo:"2026-08-06"},
    {id:4,funcionario_id:"bruno",estado:"concluida",prioridade:"urgente",prazo:"2026-08-01"}
  ],
  hours:[{funcionario_id:"ana",data:"2026-08-02",horas:40},{funcionario_id:"ana",data:"2026-07-20",horas:100}]
};
const before=JSON.stringify(input),result=analyzeWorkload(input),ana=result.rows.find(row=>row.id==="ana"),bruno=result.rows.find(row=>row.id==="bruno");
assert.equal(ana.pressure,"high","Bloqueios urgentes e atrasados devem indicar pressão alta.");
assert.equal(ana.total,2,"A carga deve contar somente tarefas abertas.");
assert.equal(ana.hours,40,"As horas devem considerar apenas o mês analisado.");
assert.equal(bruno.pressure,"available","Um funcionário ativo sem tarefas abertas deve aparecer disponível.");
assert.equal(result.summary.unassigned,1,"Tarefas sem responsável devem ser destacadas.");
assert.ok(result.recommendations.some(item=>item.includes("precisam de responsável")),"A análise deve recomendar a distribuição das tarefas sem responsável.");
assert.equal(result.automaticReassignment,false,"A análise nunca deve reatribuir tarefas automaticamente.");
assert.equal(result.rows.some(row=>row.id==="inativo"),false,"Funcionários inativos não devem ser sugeridos como disponíveis.");
assert.equal(result.rows.some(row=>row.id==="perfil-inativo"),false,"Perfis desativados não devem participar na distribuição.");
assert.equal(JSON.stringify(input),before,"A análise não deve alterar os dados recebidos.");
console.log("Carga da equipa aprovada: pressão ponderada, horas, disponibilidade e tarefas sem responsável validadas sem reatribuição.");
