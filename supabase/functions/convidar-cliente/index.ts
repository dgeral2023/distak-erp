import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.4";

const origins=new Set(["https://dgeral2023.github.io","https://app.distaklda.com","http://127.0.0.1:8080","http://localhost:8080"]);
const headers=(origin:string)=>({"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8","Vary":"Origin"});
const response=(origin:string,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});

Deno.serve(async request=>{
  const origin=request.headers.get("origin")||"";
  if(!origins.has(origin))return new Response("Origem não autorizada",{status:403});
  if(request.method==="OPTIONS")return new Response("ok",{headers:headers(origin)});
  if(request.method!=="POST")return response(origin,{error:"Método não permitido"},405);
  const authorization=request.headers.get("authorization");
  if(!authorization?.startsWith("Bearer "))return response(origin,{error:"Sessão em falta"},401);
  const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret)return response(origin,{error:"Serviço indisponível"},503);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await admin.auth.getUser(authorization.slice(7));
  if(userError||!user)return response(origin,{error:"Sessão inválida"},401);
  const {data:profile}=await admin.from("profiles").select("role,ativo").eq("id",user.id).single();
  if(profile?.role!=="admin"||profile.ativo===false)return response(origin,{error:"Acesso reservado ao administrador"},403);
  let body:{email?:unknown;nome?:unknown;cliente_id?:unknown};try{body=await request.json()}catch{return response(origin,{error:"Pedido inválido"},400)}
  const email=String(body.email||"").trim().toLowerCase(),nome=String(body.nome||"").trim(),clienteId=String(body.cliente_id||"").trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||nome.length<2||nome.length>120||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clienteId))return response(origin,{error:"Dados do convite inválidos"},400);
  const {data:client}=await admin.from("clientes").select("id").eq("id",clienteId).single();
  if(!client)return response(origin,{error:"Cliente não encontrado"},404);
  const redirectTo=origin==="https://app.distaklda.com"?"https://app.distaklda.com/":"https://dgeral2023.github.io/distak-erp/";
  const {data:invitation,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{data:{nome,role:"cliente"},redirectTo});
  if(inviteError||!invitation.user)return response(origin,{error:inviteError?.message||"Não foi possível criar o convite"},409);
  const invitedId=invitation.user.id;
  const {error:profileError}=await admin.from("profiles").upsert({id:invitedId,email,nome,role:"cliente",ativo:true},{onConflict:"id"});
  if(profileError)return response(origin,{error:"Convite criado, mas o perfil requer revisão administrativa"},500);
  const {error:accessError}=await admin.from("cliente_portal_acessos").upsert({user_id:invitedId,cliente_id:clienteId,ativo:true,criado_por:user.id},{onConflict:"user_id,cliente_id"});
  if(accessError)return response(origin,{error:"Convite criado, mas a associação ao cliente requer revisão"},500);
  return response(origin,{ok:true,user_id:invitedId,message:"Convite enviado e acesso associado"},201);
});
