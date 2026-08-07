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
check(dossier.quality.photoMetadata===0&&dossier.quality.issues.some(item=>item.key==="foto_metadados"),"fotografias sem data ou zona devem gerar uma recomendação de qualidade");

collections.photos=[{obra_id:"work-1",categoria:"Antes",zona:"Fachada",data_foto:"2026-08-01"}];
collections.documents=[{obra_id:"work-1",nome:"Contrato",categoria:"Contrato"},{obra_id:"work-1",nome:"Fatura 1",categoria:"Fatura"}];
dossier=calculateDossier(work,collections,{today:"2026-08-06T00:00:00.000Z"});
check(dossier.quality.photoMetadata===100&&dossier.quality.documentMetadata===100&&dossier.quality.zones===1,"metadados completos e zonas devem ser reconhecidos");

work.progresso=50;collections.costs=[{obra_id:"work-1"}];
dossier=calculateDossier(work,collections);check(dossier.checks.some(item=>item.key==="durante")&&dossier.checks.some(item=>item.key==="diario"),"uma obra em execução deve exigir acompanhamento visual e diário");
check(!dossier.checks.some(item=>item.key==="depois"),"fotografias finais não devem ser exigidas antes da conclusão");
const stale=calculateDossier(work,collections,{today:"2026-10-15T00:00:00.000Z"});check(stale.quality.issues.some(item=>item.key==="foto_atualidade"),"uma obra em execução sem fotografia recente deve pedir atualização visual");

work.estado="Concluída";work.progresso=100;
dossier=calculateDossier(work,collections);check(dossier.checks.some(item=>item.key==="depois"),"uma obra concluída deve exigir fotografias finais");

console.log("Dossiê aprovado: fase, completude, metadados, zonas, atualidade e destinos de correção verificados.");
