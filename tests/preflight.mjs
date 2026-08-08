import {spawnSync} from "node:child_process";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,".."),checks=["smoke.mjs","performance.mjs","backup.mjs","security.mjs","client-invite.mjs","role-access.mjs","notifications.mjs","dossier-quality.mjs","accessibility.mjs","intelligence-actions.mjs","responsive-roles.mjs","workload-analysis.mjs","assistant-local.mjs","data-access.mjs"];
for(const file of checks){const result=spawnSync(process.execPath,[resolve(import.meta.dirname,file)],{cwd:root,stdio:"inherit"});if(result.status!==0)process.exit(result.status||1)}
console.log(`Pré-publicação aprovada: ${checks.length} validadores concluídos sem alterações externas.`);
