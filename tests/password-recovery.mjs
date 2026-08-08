import {readFileSync} from "node:fs";
import {resolve,join} from "node:path";

const root=resolve(import.meta.dirname,".."),read=path=>readFileSync(join(root,path),"utf8");
const auth=read("assets/js/core/auth.js"),app=read("assets/js/app.js"),html=read("index.html"),worker=read("service-worker.js"),failures=[];
const requiredAuth=["resetPasswordForEmail","redirectTo:redirectTo.href",'event==="PASSWORD_RECOVERY"',"updateUser({password})","password.length<10","/[a-z]/","/[A-Z]/","/\\d/","/[^A-Za-z0-9]/"];
for(const token of requiredAuth)if(!auth.includes(token))failures.push(`Fluxo de autenticação incompleto: ${token}`);
for(const token of ["forgotPasswordBtn","passwordRecoveryRequestDialog","passwordRecoveryUpdateDialog",'autocomplete="new-password"','aria-live="assertive"'])if(!html.includes(token))failures.push(`Interface de recuperação incompleta: ${token}`);
for(const token of ["requestPasswordRecovery","updateRecoveredPassword","passwordIssues","Se existir uma conta com este e-mail","await logout()",'location.hash.includes("type=recovery")',"!passwordRecoveryActive&&enter(s)"] )if(!app.includes(token))failures.push(`Controlador de recuperação incompleto: ${token}`);
for(const forbidden of ["auth.admin","inviteUserByEmail","createUser("])if(auth.includes(forbidden)||app.includes(forbidden))failures.push(`A recuperação não pode criar ou convidar contas: ${forbidden}`);
if(!worker.includes("./assets/css/password-recovery.css"))failures.push("O estilo de recuperação não está disponível offline.");
if(failures.length){console.error(`Recuperação de acesso falhou:\n- ${failures.join("\n- ")}`);process.exit(1)}
console.log("Recuperação de acesso aprovada: pedido neutro, política forte, retorno autenticado e sessão encerrada após a troca.");
