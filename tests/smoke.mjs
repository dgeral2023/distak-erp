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
  "funcionarioForm", "funcionarioHorasForm", "dashboardTeam", "workDocumentList"
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

if (failures.length) {
  console.error(`Smoke test falhou (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Smoke test concluído: ${requiredIds.length} IDs, ${sourceFiles.length} ficheiros e imports verificados.`);
