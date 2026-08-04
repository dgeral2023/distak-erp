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
for (const required of ["localAnalysis", "intent: \"recebimentos\"", "intent: \"custos\"", "intent: \"orcamentos\"", "intent: \"prioridades\"", "auth.getUser"]){
  check(assistantFunction.includes(required), `Função segura do assistente incompleta: ${required}`);
}
const pwaModule = readFileSync(join(root, "assets", "js", "core", "pwa.js"), "utf8");
const serviceWorker = readFileSync(join(root, "service-worker.js"), "utf8");
for (const required of ["serviceWorker.register", "updatefound"]){
  check(pwaModule.includes(required), `Aplicação instalável incompleta: ${required}`);
}
for (const required of ["distak-shell-v3.2", "request.mode==='navigate'", "url.origin!==self.location.origin"]){
  check(serviceWorker.includes(required), `Service worker incompleto: ${required}`);
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

if (failures.length) {
  console.error(`Smoke test falhou (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Smoke test concluído: ${requiredIds.length} IDs, ${sourceFiles.length} ficheiros e imports verificados.`);
