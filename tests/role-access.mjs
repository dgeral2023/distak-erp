import {canAccessView} from "../assets/js/core/ui.js";

const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};

for(const view of ["dashboard","clientes","obras","operacional","agenda","dossies","orcamentos","compras","medicoes","custos","pagamentos","previsoes","inteligencia","funcionarios","relatorios","empresa","funcionario","portal-admin"]){
  expect(canAccessView("admin",view),`Administrador sem acesso a ${view}`);
}
for(const view of ["dashboard","obras","operacional","agenda","dossies","funcionario"]){
  expect(canAccessView("funcionario",view),`Equipa sem acesso operacional a ${view}`);
}
for(const view of ["clientes","orcamentos","compras","medicoes","custos","pagamentos","previsoes","inteligencia","funcionarios","relatorios","empresa","portal-admin","cliente-portal"]){
  expect(!canAccessView("funcionario",view),`Equipa com acesso indevido a ${view}`);
}
expect(canAccessView("cliente","cliente-portal"),"Cliente sem acesso ao próprio portal");
for(const view of ["dashboard","obras","operacional","agenda","dossies","custos","pagamentos","portal-admin"]){
  expect(!canAccessView("cliente",view),`Cliente com acesso indevido a ${view}`);
}

if(failures.length){console.error(`Validação de papéis falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log("Papéis aprovados: administrador, equipa e cliente têm navegação central isolada.");
