import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {clientAddressKey,clientAddressSuggestions,formatClientAddress} from "../assets/js/core/client-addresses.js";

const client={id:"cliente-1",morada:"Rua Principal, 10",codigo_postal:"1000-001",localidade:"Lisboa",pais:"Portugal"};
const rows=[
  {cliente_id:"cliente-1",tipo:"Obra",morada:"Avenida Nova, 2",codigo_postal:"2000-002",localidade:"Santarém",pais:"Portugal",principal:true},
  {cliente_id:"cliente-1",tipo:"Faturação",morada:"Rua Principal, 10",codigo_postal:"1000-001",localidade:"Lisboa",pais:"Portugal",principal:false},
  {cliente_id:"cliente-2",tipo:"Outra",morada:"Rua de Outro Cliente",principal:true},
  {cliente_id:"cliente-1",tipo:"Vazia",morada:"   ",principal:false}
];

assert.equal(formatClientAddress(client),"Rua Principal, 10, 1000-001 Lisboa");
assert.equal(formatClientAddress({morada:"Calle Mayor 1",localidade:"Madrid",pais:"Espanha"}),"Calle Mayor 1, Madrid, Espanha");
assert.equal(clientAddressKey(" RÚA  Principal  "),"rua principal");
assert.deepEqual(clientAddressSuggestions(client,rows),[
  {value:"Rua Principal, 10, 1000-001 Lisboa",label:"Morada principal"},
  {value:"Avenida Nova, 2, 2000-002 Santarém",label:"Obra · Principal"}
]);
assert.deepEqual(clientAddressSuggestions({},rows),[]);

const root=resolve(import.meta.dirname,"..");
const html=readFileSync(resolve(root,"index.html"),"utf8");
const works=readFileSync(resolve(root,"assets/js/modules/obras.js"),"utf8");
const clients=readFileSync(resolve(root,"assets/js/modules/clientes.js"),"utf8");
const worker=readFileSync(resolve(root,"service-worker.js"),"utf8");
for(const required of ['list="obraMoradaSuggestions"','autocomplete="off"','id="obraMoradaHelp"'])assert(html.includes(required),`Campo de morada incompleto: ${required}`);
for(const required of ["clientAddressSuggestions","store.clienteMoradas","obraClienteId.addEventListener(\"change\"","Pode escolher uma sugestão ou escrever outra"])assert(works.includes(required),`Sugestões da obra incompletas: ${required}`);
assert(clients.includes("store.clienteMoradas=[...store.clienteMoradas.filter"),"As moradas do CRM devem atualizar as sugestões sem recarregar a aplicação.");
assert(worker.includes("./assets/js/core/client-addresses.js"),"As sugestões de morada devem funcionar offline.");

console.log("Moradas das obras aprovadas: sugestões filtradas por cliente, sem impedir introdução manual.");
