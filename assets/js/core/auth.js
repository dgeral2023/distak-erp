import {db,getProfile} from "./supabase.js";

const ALLOWED_ROLES=new Set(["admin","escritorio","encarregado","funcionario"]);

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
  return authorizedSession(data.user);
}

export async function logout(){await db.auth.signOut()}

export async function session(){
  const {data,error}=await db.auth.getUser();
  if(error)throw error;
  return authorizedSession(data.user);
}
