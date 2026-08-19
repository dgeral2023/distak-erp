import {db,getProfile} from "./supabase.js";

const ALLOWED_ROLES=new Set(["admin","escritorio","encarregado","funcionario","cliente"]);

async function recordAuthActivity(acao,resumo){
  const {data:{user}}=await db.auth.getUser();
  if(!user)return;
  const {error}=await db.from("atividades_sistema").insert({utilizador_id:user.id,entidade:"sessao",acao,resumo,metadados:{origem:"web-v3.8",contexto:"autenticacao"}});
  if(error)console.warn("Evento de autenticação não registado:",error.message);
}

async function authorizedSession(user){
  if(!user)return null;
  const profile=await getProfile(user.id);
  if(profile.ativo===false){
    await db.auth.signOut();
    throw new Error("Esta conta está desativada. Contacte o administrador.");
  }
  if(!ALLOWED_ROLES.has(profile.role)){
    await db.auth.signOut();
    throw new Error("Esta conta não tem um perfil de acesso válido.");
  }
  return {user,profile};
}

export async function login(email,password){
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error)throw error;
  const current=await authorizedSession(data.user);
  await recordAuthActivity("entrou","Entrada no DISTAK ERP");
  return current;
}

export async function logout(){await recordAuthActivity("saiu","Saída do DISTAK ERP");await db.auth.signOut()}

export function passwordIssues(password=""){
  const issues=[];
  if(password.length<10)issues.push("pelo menos 10 caracteres");
  if(!/[a-z]/.test(password))issues.push("uma letra minúscula");
  if(!/[A-Z]/.test(password))issues.push("uma letra maiúscula");
  if(!/\d/.test(password))issues.push("um número");
  if(!/[^A-Za-z0-9]/.test(password))issues.push("um símbolo");
  return issues;
}

export async function requestPasswordRecovery(email){
  const redirectTo=new URL(".",window.location.href);
  redirectTo.search="";
  redirectTo.hash="";
  const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:redirectTo.href});
  if(error)throw error;
}

export async function updateRecoveredPassword(password){
  const issues=passwordIssues(password);
  if(issues.length)throw new Error(`A palavra-passe precisa de ${issues.join(", ")}.`);
  const {error}=await db.auth.updateUser({password});
  if(error)throw error;
  await recordAuthActivity("recuperou_acesso","Palavra-passe recuperada pelo utilizador");
}

export function onPasswordRecovery(callback){
  return db.auth.onAuthStateChange(event=>{if(event==="PASSWORD_RECOVERY")callback()});
}

export async function session(){
  const {data:sessionData,error:sessionError}=await db.auth.getSession();
  if(sessionError)throw sessionError;
  if(!sessionData.session)return null;
  const {data,error}=await db.auth.getUser();
  if(error)throw error;
  return authorizedSession(data.user);
}
