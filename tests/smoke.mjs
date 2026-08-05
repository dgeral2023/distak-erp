import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const indexPath = join(root, "index.html");
const index = readFileSync(indexPath, "utf8");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const requiredIds = [
  "loginForm", "mainNav", "view-dashboard", "view-clientes", "view-obras",
  "view-orcamentos", "view-custos", "view-pagamentos", "view-funcionarios",
  "funcionarioForm", "funcionarioHorasForm", "dashboardTeam", "workDocumentList",
  "obraAssignments", "assignmentSummary"
  ,"globalSearch", "globalSearchResults", "notificationPanel", "notificationList",
  "view-relatorios", "reportKpis", "profitabilityReport", "maturityReport", "activityTimeline"
  ,"sidebarToggle", "mobileNav", "mobileRegister", "mobileAlerts", "mobileMore",
  "mobileMoreSheet", "mobileRegisterSheet", "mobileSheetBackdrop", "recentNav"
  ,"favoriteNav", "topUserMenu", "topUserInitial", "accountPanel", "accountLogout"
  ,"option5ActiveWorks", "option5ExecutionValue", "option5Income", "option5Alerts"
  ,"aiAssistantButton", "aiAssistantPanel", "aiAssistantMessages", "aiAssistantForm", "aiAssistantInput"
  ,"aiPriorityCard", "aiPrioritySummary", "aiPriorityAction"
  ,"view-agenda", "navTaskCount", "novaTarefaBtn", "agendaWeekGrid", "agendaTaskList",
  "agendaTaskDialog", "agendaTaskForm", "agendaTaskWork", "agendaTaskDue"
  ,"planningWorkFilter", "planningToday", "planningHealth", "planningTimeline",
  "agendaTaskPhase", "agendaTaskProgress", "agendaTaskDependency", "agendaTaskMilestone"
  ,"view-previsoes", "newForecastBtn", "forecastKpis", "forecastChart", "collectionRiskList",
  "forecastSearch", "forecastList", "forecastDialog", "forecastForm", "forecastProbability"
  ,"view-dossies", "dossierPrintAll", "dossierKpis", "dossierSearch", "dossierStatusFilter",
  "dossierResultCount", "dossierGrid"
  ,"view-operacional", "newOperationalRecord", "operationalKpis", "operationalSearch",
  "operationalDate", "operationalWorkGrid", "operationalTimeline", "operationalQuickDialog",
  "operationalQuickForm", "operationalQuickWork", "operationalQuickType"
  ,"view-compras", "newPurchaseBtn", "purchaseKpis", "purchaseSearch", "purchaseWorkFilter",
  "purchaseStateFilter", "purchaseList", "purchaseDialog", "purchaseForm", "purchaseWork",
  "quoteDialog", "quoteForm", "quotePurchaseId", "quoteComparison"
  ,"view-medicoes", "newMeasurementBtn", "measurementKpis", "measurementSearch",
  "measurementWorkFilter", "measurementStateFilter", "measurementList", "measurementDialog",
  "measurementForm", "measurementWork", "measurementItems", "measurementTotalPreview"
  ,"view-funcionario", "fieldPortalTitle", "fieldOfflineState", "fieldSyncNow", "fieldNewRecord",
  "fieldSummary", "fieldTasks", "fieldRecordCount", "fieldRecords", "fieldRecordDialog",
  "fieldRecordForm", "fieldWork", "fieldType", "fieldPhoto", "fieldRecordSave"
  ,"view-inteligencia", "intelligenceWork", "intelligenceReserve", "intelligenceReserveValue",
  "intelligenceKpis", "intelligencePortfolio", "intelligenceCards", "intelligenceHistory"
];

for (const id of requiredIds) {
  const matches = index.match(new RegExp(`id=["']${id}["']`, "g")) || [];
  check(matches.length === 1, `O ID ${id} deve existir exatamente uma vez (encontrado: ${matches.length}).`);
}

check(
  index.includes("@supabase/supabase-js@2.110.9"),
  "A versão exata e aprovada de supabase-js não está fixada."
);

const sourceFiles = [indexPath, ...walk(join(root, "assets", "js"))]
  .filter((path) => [".html", ".js"].includes(extname(path)));
const source = sourceFiles.map((path) => readFileSync(path, "utf8")).join("\n");

const declaredIds = new Set([...source.matchAll(/id=["']([^"']+)["']/g)].map((match) => match[1]));
for (const match of source.matchAll(/\$\(["']([^"']+)["']\)/g)) {
  check(declaredIds.has(match[1]), `O código referencia um ID inexistente: ${match[1]}.`);
}

check(
  !/:\s*"<[^>]+class="/.test(source),
  "Foi encontrada uma string HTML com aspas incompatíveis, que pode impedir a aplicação de iniciar."
);

check(!/service[_-]?role/i.test(source), "Foi encontrada uma referência a service_role no frontend.");
check(!/sb_secret_/i.test(source), "Foi encontrada uma chave secreta no frontend.");

for (const file of sourceFiles.filter((path) => extname(path) === ".js")) {
  const contents = readFileSync(file, "utf8");
  for (const match of contents.matchAll(/(?:import|export)\s+(?:[^"']*?\s+from\s+)?["'](\.[^"']+)["']/g)) {
    const target = resolve(dirname(file), match[1].split(/[?#]/, 1)[0]);
    check(existsSync(target), `Import inexistente em ${file}: ${match[1]}`);
  }
}

const auth = readFileSync(join(root, "assets", "js", "core", "auth.js"), "utf8");
check(auth.includes("db.auth.getUser()"), "A sessão deve ser validada com auth.getUser().");
check(auth.includes("if(!sessionData.session)return null"), "A ausência de sessão não deve ser apresentada como erro.");
check(auth.includes("profile.ativo===false"), "Perfis desativados devem ser bloqueados.");

const securityMigration = readFileSync(
  join(root, "supabase", "202608041730_auditoria_seguranca_desempenho.sql"),
  "utf8"
);
for (const required of [
  "funcionarios_select_admin",
  "funcionario_horas_select_admin",
  "obras_select_admin_ou_atribuido",
  "custos_select_admin",
  "Fotografias - eliminar admin",
  "Obras - eliminar admin",
  "obra_fotografias_created_by_idx",
  "drop policy if exists custos_admin",
  "drop index if exists public.idx_cliente_contactos_cliente"
]) {
  check(securityMigration.includes(required), `Migração de segurança incompleta: ${required}`);
}

const v3Migration = readFileSync(join(root, "supabase", "202608042000_distak_v3_historico_notificacoes.sql"), "utf8");
for (const required of ["atividades_sistema", "atividades_sistema_select", "private.can_access_obra"]) {
  check(v3Migration.includes(required), `Migração v3 incompleta: ${required}`);
}
const v3OperationalHistory = readFileSync(join(root, "supabase", "202608042030_distak_v3_historico_operacional.sql"), "utf8");
for (const required of ["registar_atividade_operacional", "obra_checklists", "obra_fotografias"]) {
  check(v3OperationalHistory.includes(required), `Histórico operacional v3 incompleto: ${required}`);
}

const v3Module = readFileSync(join(root, "assets", "js", "modules", "v3.js"), "utf8");
for (const required of ["renderNotifications", "renderReports", "renderActivity", "globalSearch"]) {
  check(v3Module.includes(required), `Módulo v3 incompleto: ${required}`);
}
const dashboardModule = readFileSync(join(root, "assets", "js", "modules", "dashboard.js"), "utf8");
for (const required of ["finance-line-chart", "donut-chart", "work-identity", "store.fotografias"]){
  check(dashboardModule.includes(required), `Dashboard da opção 5 incompleto: ${required}`);
}
const hybridMenu = readFileSync(join(root, "assets", "js", "modules", "hybrid-menu.js"), "utf8");
for (const required of ["initHybridMenu", "renderHybridMenu", "distakSidebarCollapsed", "event.ctrlKey", "distakFavoriteViews", "distakMenuGroups"]){
  check(hybridMenu.includes(required), `Menu híbrido incompleto: ${required}`);
}
const assistantModule = readFileSync(join(root, "assets", "js", "modules", "assistant.js"), "utf8");
for (const required of ["initAssistant", "renderAssistantInsight", "db.functions.invoke", "assistente-distak", "history.slice", "data-assistant-action"]){
  check(assistantModule.includes(required), `Assistente DISTAK incompleto: ${required}`);
}
const assistantFunction = readFileSync(join(root, "supabase", "functions", "assistente-distak", "index.ts"), "utf8");
for (const required of ["localAnalysis", "intent: \"recebimentos\"", "intent: \"custos\"", "intent: \"orcamentos\"", "intent: \"prioridades\"", "intent: \"agenda\"", "intent: \"dossies\"", "intent: \"operacional\"", "intent: \"compras\"", "intent: \"medicoes\"", "intent: \"inteligencia\"", "auth.getUser"]){
  check(assistantFunction.includes(required), `Função segura do assistente incompleta: ${required}`);
}
const agendaModule = readFileSync(join(root, "assets", "js", "modules", "agenda.js"), "utf8");
for (const required of ["renderAgenda", "initAgenda", "agenda_tarefas", "toggleTask", "prazo", "prioridade"]){
  check(agendaModule.includes(required), `Agenda operacional incompleta: ${required}`);
}
for (const required of ["renderPlanning", "planningTimeline", "depende_de", "progresso", "marco", "phaseLabel"]){
  check(agendaModule.includes(required), `Planeamento avançado incompleto: ${required}`);
}
const planningMigration = readFileSync(join(root, "supabase", "202608051100_planeamento_avancado_obras.sql"), "utf8");
for (const required of ["fase text", "progresso smallint", "marco boolean", "depende_de uuid", "agenda_tarefas_depende_de_idx"]){
  check(planningMigration.includes(required), `Migração do planeamento incompleta: ${required}`);
}
const agendaMigration = readFileSync(join(root, "supabase", "202608042110_agenda_tarefas.sql"), "utf8");
for (const required of ["enable row level security", "private.can_access_obra", "agenda_tarefas_select", "agenda_tarefas_insert", "agenda_tarefas_update", "revoke all on public.agenda_tarefas from anon"]){
  check(agendaMigration.includes(required), `Migração da agenda incompleta: ${required}`);
}
const forecastModule = readFileSync(join(root, "assets", "js", "modules", "previsoes.js"), "utf8");
for (const required of ["renderPrevisoes", "initPrevisoes", "financeiro_previsoes", "collectionRisks", "weighted"]){
  check(forecastModule.includes(required), `Previsões financeiras incompletas: ${required}`);
}
const forecastMigration = readFileSync(join(root, "supabase", "202608042200_financeiro_previsoes.sql"), "utf8");
for (const required of ["enable row level security", "financeiro_previsoes_select_admin", "financeiro_previsoes_insert_admin", "financeiro_previsoes_update_admin", "revoke all on public.financeiro_previsoes from anon", "grant select, insert, update"]){
  check(forecastMigration.includes(required), `Migração das previsões incompleta: ${required}`);
}
const dossierModule = readFileSync(join(root, "assets", "js", "modules", "dossies.js"), "utf8");
for (const required of ["renderDossies", "initDossies", "printReport", "documentosObra", "Fotos depois"]){
  check(dossierModule.includes(required), `Dossiê digital incompleto: ${required}`);
}
const pwaModule = readFileSync(join(root, "assets", "js", "core", "pwa.js"), "utf8");
const serviceWorker = readFileSync(join(root, "service-worker.js"), "utf8");
for (const required of ["serviceWorker.register", "updatefound"]){
  check(pwaModule.includes(required), `Aplicação instalável incompleta: ${required}`);
}
for (const required of ["distak-shell-v4.0", "request.mode==='navigate'", "url.origin!==self.location.origin", "assets/js/core/field-queue.js", "assets/js/modules/campo.js", "assets/js/modules/inteligencia.js"]){
  check(serviceWorker.includes(required), `Service worker incompleto: ${required}`);
}

const operationalModule = readFileSync(join(root, "assets", "js", "modules", "operacional.js"), "utf8");
for (const required of ["renderOperacional", "initOperacional", "openOperationalQuick", "obra_ocorrencias", "obra_materiais", "obra_horas"]){
  check(operationalModule.includes(required), `Centro operacional incompleto: ${required}`);
}
const purchasesModule = readFileSync(join(root, "assets", "js", "modules", "compras.js"), "utf8");
for (const required of ["renderCompras", "initCompras", "compras_pedidos", "compras_propostas", "selectQuote", "Nenhum custo ou pagamento foi criado"]){
  check(purchasesModule.includes(required), `Central de compras incompleta: ${required}`);
}
const purchasesMigration = readFileSync(join(root, "supabase", "202608051230_compras_fornecedores.sql"), "utf8");
for (const required of ["enable row level security", "revoke all", "grant select,insert,update", "compras_pedidos_select_admin", "compras_propostas_update_admin"]){
  check(purchasesMigration.includes(required), `Migração de compras incompleta: ${required}`);
}
const measurementsModule = readFileSync(join(root, "assets", "js", "modules", "medicoes.js"), "utf8");
for (const required of ["renderMedicoes", "initMedicoes", "medicoes_autos", "medicoes_itens", "quantidade_anterior", "Nenhum pagamento foi criado"]){
  check(measurementsModule.includes(required), `Medições incompletas: ${required}`);
}
const measurementsMigration = readFileSync(join(root, "supabase", "202608051400_medicoes_faturacao.sql"), "utf8");
for (const required of ["enable row level security", "revoke all", "grant select,insert,update", "medicoes_autos_select_admin", "medicoes_itens_update_admin"]){
  check(measurementsMigration.includes(required), `Migração de medições incompleta: ${required}`);
}

const fieldModule = readFileSync(join(root, "assets", "js", "modules", "campo.js"), "utf8");
for (const required of ["renderCampo", "initCampo", "queueFieldRecord", "syncQueue", "campo_registos", "referencia_local", "data-field-review"]){
  check(fieldModule.includes(required), `Portal de campo incompleto: ${required}`);
}
const fieldQueue = readFileSync(join(root, "assets", "js", "core", "field-queue.js"), "utf8");
for (const required of ["indexedDB.open", "pending-records", "listQueuedFieldRecords", "removeQueuedFieldRecord"]){
  check(fieldQueue.includes(required), `Fila offline de campo incompleta: ${required}`);
}
const fieldMigration = readFileSync(join(root, "supabase", "202608051600_portal_equipa_campo.sql"), "utf8");
for (const required of ["enable row level security", "revoke all", "grant select,insert,update", "campo_registos_select", "campo_registos_insert", "campo_registos_update", "private.can_access_obra", "referencia_local", "Obras - upload por obra atribuida"]){
  check(fieldMigration.includes(required), `Migração do portal de campo incompleta: ${required}`);
}

const intelligenceModule = readFileSync(join(root, "assets", "js", "modules", "inteligencia.js"), "utf8");
for (const required of ["calculateWorkIntelligence", "renderInteligencia", "initInteligencia", "projectedCost", "scheduleGap", "confidence", "Guardar análise", "confirmada", "descartada"]){
  check(intelligenceModule.includes(required), `Inteligência de gestão incompleta: ${required}`);
}
const intelligenceMigration = readFileSync(join(root, "supabase", "202608051800_inteligencia_gestao.sql"), "utf8");
for (const required of ["enable row level security", "revoke all", "grant select,insert,update", "inteligencia_avaliacoes_select_admin", "inteligencia_avaliacoes_insert_admin", "inteligencia_avaliacoes_update_admin", "fundamentos jsonb", "estado='analisada'"]){
  check(intelligenceMigration.includes(required), `Migração de inteligência incompleta: ${required}`);
}

const operationalMigration = readFileSync(
  join(root, "supabase", "202608041820_acesso_operacional_por_obra.sql"),
  "utf8"
);
for (const required of [
  "private.can_access_obra",
  "obra_checklists_select",
  "obra_diarios_select",
  "obra_documentos_select",
  "obra_fotografias_select"
]) {
  check(operationalMigration.includes(required), `Migração operacional incompleta: ${required}`);
}

globalThis.window = { DISTAK_CONFIG:{SUPABASE_URL:"https://example.invalid",SUPABASE_KEY:"test"}, supabase: { createClient: () => ({}) } };
const { store: calculationStore } = await import("../assets/js/core/store.js");
const { calculateWorkIntelligence } = await import("../assets/js/modules/inteligencia.js");
calculationStore.custos = [{ obra_id:"work-test", valor:20000 }];
calculationStore.pagamentos = [];
calculationStore.agendaTarefas = [{ obra_id:"work-test", estado:"pendente", prazo:"2000-01-01" }];
calculationStore.pedidosCompra = [];
calculationStore.propostasCompra = [];
calculationStore.autosMedicao = [];
const calculation = calculateWorkIntelligence({ id:"work-test", nome:"Teste", valor_contratado:100000, progresso:50 }, 5);
check(Math.round(calculation.projectedCost)===42000, "O cenário de custo final deve aplicar progresso e reserva sem alterar movimentos reais.");
check(Math.round(calculation.projectedMargin)===58000, "A margem prevista deve resultar do contratado menos o custo final previsto.");
check(calculation.late===1 && calculation.confidence==="media", "A inteligência deve considerar atraso e indicar confiança dos dados.");

if (failures.length) {
  console.error(`Smoke test falhou (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Smoke test concluído: ${requiredIds.length} IDs, ${sourceFiles.length} ficheiros e imports verificados.`);
