import assert from "node:assert/strict";
import {findDuplicateClient,isValidPortugueseNif,isValidPortuguesePhone,isValidPortuguesePostalCode,normalizeEmail,normalizeNif,normalizePostalCode,validateClientData} from "../assets/js/core/data-quality.js";

assert.equal(normalizeEmail("  CLIENTE@EXEMPLO.PT "),"cliente@exemplo.pt");
assert.equal(normalizeNif("PT 123 456 789"),"123456789");
assert.equal(normalizePostalCode(" 2830 123 "),"2830-123");
assert.equal(isValidPortugueseNif("201811634"),true);
assert.equal(isValidPortugueseNif("201811635"),false);
assert.equal(isValidPortuguesePhone("+351 914 706 987"),true);
assert.equal(isValidPortuguesePostalCode("2830 123"),true);
assert.deepEqual(validateClientData({nome:"",nif:"201811635",telefone:"123",codigo_postal:"1234",pais:"Portugal",limite_credito:-1}),{
  nome:"Indique o nome do cliente.",
  nif:"Introduza um NIF português válido com 9 algarismos.",
  telefone:"Introduza um telefone português com 9 algarismos.",
  codigo_postal:"Use o formato 0000-000.",
  limite_credito:"O limite de crédito não pode ser negativo."
});

const clients=[
  {id:"a",nome:"Cliente A",nif:"123 456 789",email:"geral@cliente.pt"},
  {id:"b",nome:"Cliente B",nif:null,email:"obra@cliente.pt"}
];
assert.equal(findDuplicateClient(clients,{nif:"123456789"})?.id,"a");
assert.equal(findDuplicateClient(clients,{email:" GERAL@CLIENTE.PT "})?.id,"a");
assert.equal(findDuplicateClient(clients,{nif:"123456789"},"a"),null,"Editar o próprio cliente não pode ser tratado como duplicado.");
assert.equal(findDuplicateClient(clients,{nif:"987654321",email:"novo@cliente.pt"}),null);

console.log("Qualidade de clientes aprovada: NIF e e-mail são normalizados e duplicados são detetados.");
