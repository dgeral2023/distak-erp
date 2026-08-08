const teamRoles=new Set(["escritorio","encarregado","funcionario"]);
export const validationScenarios=[
  {id:"admin-desktop",role:"admin",device:"Computador",title:"Administração completa",checks:["Entrar e terminar sessão","Consultar Centro de Acessos","Rever obras e Portal do Cliente","Confirmar bloqueio de autoalteração"]},
  {id:"admin-mobile",role:"admin",device:"Telemóvel",title:"Administração responsiva",checks:["Abrir menu híbrido","Consultar notificações","Rever cartões e tabelas","Confirmar alvos táteis e foco"]},
  {id:"team-desktop",role:"team",device:"Computador",title:"Equipa isolada",checks:["Consultar somente obras atribuídas","Abrir agenda, dossiê e operação","Confirmar ausência de financeiro, clientes e administração","Terminar sessão"]},
  {id:"team-mobile",role:"team",device:"Telemóvel",title:"Trabalho em campo",checks:["Abrir obra atribuída","Registar operação autorizada","Testar fila offline e sincronização","Confirmar ausência de áreas administrativas"]},
  {id:"client-desktop",role:"client",device:"Computador",title:"Cliente isolado",checks:["Consultar somente obras publicadas e associadas","Abrir fotografia e documento publicados","Responder a pedido de aprovação","Confirmar ausência de dados internos e financeiros"]},
  {id:"client-mobile",role:"client",device:"Telemóvel",title:"Portal responsivo",checks:["Abrir Minhas obras","Consultar progresso e atualização","Abrir documento publicado","Confirmar navegação limitada ao portal"]}
];

export function buildRoleValidationPlan({profiles=[],assignments=[],clientAccess=[],works=[],clients=[],portalWorks=[],scopeRoles=["admin","team"]}={}){
  const active=profiles.filter(row=>row.ativo!==false),activeAssignments=assignments.filter(row=>row.ativo!==false),activeClientAccess=clientAccess.filter(row=>row.ativo!==false);
  const admin=active.find(row=>row.role==="admin"),team=active.find(row=>teamRoles.has(row.role)&&activeAssignments.some(link=>String(link.user_id)===String(row.id)&&works.some(work=>String(work.id)===String(link.obra_id)))),client=active.find(row=>row.role==="cliente"&&activeClientAccess.some(link=>String(link.user_id)===String(row.id)&&clients.some(item=>String(item.id)===String(link.cliente_id))));
  const linkedClientIds=new Set(activeClientAccess.filter(link=>String(link.user_id)===String(client?.id)).map(link=>String(link.cliente_id))),published=portalWorks.some(row=>row.publicado&&linkedClientIds.has(String(row.cliente_id)));
  const activeScope=new Set(scopeRoles),roles=[
    {role:"admin",label:"Administrador",ready:Boolean(admin),accountId:admin?.id||null,reasons:admin?[]:["Falta uma conta Administrador ativa."]},
    {role:"team",label:"Funcionário",ready:Boolean(team),accountId:team?.id||null,reasons:team?[]:[active.some(row=>teamRoles.has(row.role))?"A conta de Funcionário ativa ainda não tem uma obra válida atribuída.":"Falta uma conta de Funcionário ativa."]},
    {role:"client",label:"Cliente",ready:Boolean(client&&published),accountId:client?.id||null,reasons:client?(published?[]:["Falta publicar uma obra do cliente associado."]):[active.some(row=>row.role==="cliente")?"A conta Cliente ativa ainda não tem um vínculo válido.":"Falta uma conta Cliente ativa."]}
  ].map(row=>({...row,inScope:activeScope.has(row.role),status:activeScope.has(row.role)?(row.ready?"prepared":"pending"):"deferred"}));
  const scopedRoles=roles.filter(row=>row.inScope);
  return {format:"distak-role-validation-plan",version:2,generatedAt:new Date().toISOString(),mode:"preparation-only",releaseScope:[...activeScope],realValidationPerformed:false,ready:scopedRoles.length>0&&scopedRoles.every(row=>row.ready),roles:roles.map(row=>({...row,scenarios:validationScenarios.filter(item=>item.role===row.role)})),guardrails:["Não criar ou convidar contas sem autorização específica.","O perfil Cliente está adiado e não bloqueia a versão atual.","Não usar dados financeiros ou operacionais fora do ERP.","Não considerar os perfis validados sem execução real separada no computador e telemóvel."]};
}
