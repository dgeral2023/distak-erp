import assert from "node:assert/strict";
import {buildDeviceAssistantResponse,detectDeviceIntent} from "../assets/js/core/assistant-local.js";

const context={
  role:"admin",
  profiles:[],
  funcionarios:[{id:"ana",nome:"Ana",estado:"Ativo"},{id:"bruno",nome:"Bruno",estado:"Ativo"}],
  funcionarioHoras:[],
  agendaTarefas:[
    {id:"t1",obra_id:"obra-1",funcionario_id:"ana",estado:"bloqueada",prioridade:"urgente",prazo:"2026-08-01"},
    {id:"t2",obra_id:"obra-1",funcionario_id:"ana",estado:"pendente",prioridade:"alta",prazo:"2026-08-02"},
    {id:"t3",obra_id:"obra-1",estado:"pendente",prioridade:"media",prazo:"2026-08-08"}
  ],
  obras:[{id:"obra-1",nome:"Moradia Teste",estado:"Ativa",progresso:40,valor_contratado:100000,data_inicio:"2026-06-01",data_fim_prevista:"2026-12-01"}],
  fotografias:[{obra_id:"obra-1",categoria:"Durante",data_foto:"2026-05-01"}],
  documentosObra:[],orcamentos:[],diariosObra:[],custos:[],pagamentos:[],autosMedicao:[]
};
const snapshot=JSON.stringify(context),options={today:"2026-08-07"};

assert.equal(detectDeviceIntent("Como está a carga da equipa?"),"workload");
assert.equal(detectDeviceIntent("Que dossiês precisam de documentos ou fotografias?"),"dossiers");
assert.equal(detectDeviceIntent("Qual é a próxima melhor ação?"),"next_actions");

const workload=buildDeviceAssistantResponse("Como está a carga da equipa?",context,options);
assert.equal(workload.mode,"device");
assert.equal(workload.privacy,"device_only");
assert.equal(workload.automaticActions,false);
assert.match(workload.answer,/pressão alta/i);
assert.match(workload.answer,/reatribuída automaticamente/i);
assert.equal(workload.actions[0].view,"agenda");

const dossier=buildDeviceAssistantResponse("Que dossiês precisam de documentos ou fotografias?",context,options);
assert.equal(dossier.intent,"dossiers_quality");
assert.match(dossier.answer,/Moradia Teste/);
assert.match(dossier.answer,/não altera fotografias ou documentos/i);

const next=buildDeviceAssistantResponse("Qual é a próxima melhor ação?",context,options);
assert.equal(next.intent,"next_actions");
assert.match(next.answer,/Desbloquear etapas/);
assert.equal(next.actions[0].view,"agenda");
assert.equal(next.automaticActions,false);

assert.equal(buildDeviceAssistantResponse("Quanto falta receber?",context,options),null,"Consultas financeiras devem continuar no backend DISTAK autorizado.");
assert.equal(JSON.stringify(context),snapshot,"O assistente local não deve alterar os dados recebidos.");
console.log("Assistente local aprovado: carga, dossiês e próximas ações analisados no dispositivo, sem mutações ou automação.");
