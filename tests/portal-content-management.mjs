import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {publicationState,safeHttpsUrl} from "../assets/js/core/portal-publication.js";

assert.equal(safeHttpsUrl("https://files.example.test/doc.pdf"),"https://files.example.test/doc.pdf");
for(const url of ["http://unsafe.test/x","javascript:alert(1)","data:text/html,x","https://user:secret@example.test/x","not-a-url"])assert.equal(safeHttpsUrl(url),"");
assert.deepEqual(publicationState({url:"https://example.test/a.pdf",requiresUrl:true}),{valid:true,published:false,url:"https://example.test/a.pdf"});
assert.equal(publicationState({url:"http://example.test/a.pdf",requiresUrl:true}).valid,false);
const root=resolve(import.meta.dirname,".."),html=readFileSync(resolve(root,"index.html"),"utf8"),portal=readFileSync(resolve(root,"assets/js/modules/cliente-portal.js"),"utf8"),admin=readFileSync(resolve(root,"assets/js/modules/portal-content-admin.js"),"utf8");
for(const id of ["clientAdminContent","clientUpdateDialog","clientUpdateForm","clientFileDialog","clientFileForm","clientPublishPhotoChoice"])assert(html.includes(`id="${id}"`),`Controlo em falta: ${id}`);
for(const token of ["renderPortalContentAdmin","initPortalContentAdmin","fillPhotoChoices","publicationState","confirm(\"Publicar esta obra agora"])assert(portal.includes(token),`Publicação da obra incompleta: ${token}`);
for(const token of ["cliente_portal_atualizacoes","cliente_portal_ficheiros","Rascunho","confirmPublication","criado_por","requiresUrl:true"])assert(admin.includes(token),`Gestão de conteúdo incompleta: ${token}`);
assert.equal(/\.delete\(|remove\(/.test(admin),false,"A gestão de conteúdo não deve eliminar registos.");
assert.equal(/publicado:\s*true/.test(admin),false,"Nenhum conteúdo pode ser publicado automaticamente.");
console.log("Conteúdo do portal aprovado: rascunhos, confirmação, fotografias existentes, HTTPS, isolamento e ausência de eliminação automática verificados.");
