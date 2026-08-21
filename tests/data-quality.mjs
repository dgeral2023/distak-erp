import assert from "node:assert/strict";
import {findDuplicateClient,normalizeEmail,normalizeNif} from "../assets/js/core/data-quality.js";

assert.equal(normalizeEmail("  CLIENTE@EXEMPLO.PT "),"cliente@exemplo.pt");
assert.equal(normalizeNif("PT 123 456 789"),"123456789");

const clients=[
  {id:"a",nome:"Cliente A",nif:"123 456 789",email:"geral@cliente.pt"},
  {id:"b",nome:"Cliente B",nif:null,email:"obra@cliente.pt"}
];
assert.equal(findDuplicateClient(clients,{nif:"123456789"})?.id,"a");
assert.equal(findDuplicateClient(clients,{email:" GERAL@CLIENTE.PT "})?.id,"a");
assert.equal(findDuplicateClient(clients,{nif:"123456789"},"a"),null,"Editar o próprio cliente não pode ser tratado como duplicado.");
assert.equal(findDuplicateClient(clients,{nif:"987654321",email:"novo@cliente.pt"}),null);

console.log("Qualidade de clientes aprovada: NIF e e-mail são normalizados e duplicados são detetados.");
