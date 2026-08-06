import {calculateDossier} from "../assets/js/core/dossier-quality.js";

const check=(condition,message)=>{if(!condition){console.error(`FALHA: ${message}`);process.exit(1)}};
const work={id:"work-1",nome:"Obra Teste",estado:"Ativa",progresso:0};
const collections={photos:[],documents:[],budgets:[],costs:[],diaries:[]};

let dossier=calculateDossier(work,collections);
check(dossier.checks.length===3,"uma obra por iniciar deve pedir apenas contrato, orçamento e fotografias iniciais");
check(!dossier.checks.some(item=>item.key==="depois"||item.key==="diario"),"itens de execução ou conclusão não devem ser exigidos antes do início");
check(dossier.missing.every(item=>item.target),"cada pendência deve ter um destino acionável");

collections.documents=[{obra_id:"work-1",categoria:"Contrato"},{obra_id:"work-1",categoria:"Fatura"}];
collections.budgets=[{obra_id:"work-1"}];collections.photos=[{obra_id:"work-1",categoria:"Antes"}];
dossier=calculateDossier(work,collections);check(dossier.score===100,"o dossiê inicial completo deve atingir 100%");

work.progresso=50;collections.costs=[{obra_id:"work-1"}];
dossier=calculateDossier(work,collections);check(dossier.checks.some(item=>item.key==="durante")&&dossier.checks.some(item=>item.key==="diario"),"uma obra em execução deve exigir acompanhamento visual e diário");
check(!dossier.checks.some(item=>item.key==="depois"),"fotografias finais não devem ser exigidas antes da conclusão");

work.estado="Concluída";work.progresso=100;
dossier=calculateDossier(work,collections);check(dossier.checks.some(item=>item.key==="depois"),"uma obra concluída deve exigir fotografias finais");

console.log("Dossiê aprovado: critérios adaptativos por fase, pontuação e destinos de correção verificados.");
