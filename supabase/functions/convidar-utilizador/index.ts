import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.57.4";

const origins=new Set(["https://dgeral2023.github.io","https://app.distaklda.com","http://127.0.0.1:8080","http://localhost:8080"]);
const teamRoles=new Set(["escritorio","encarregado","funcionario"]),uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers=(origin:string)=>({"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8","Vary":"Origin"});
const respond=(origin:string,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});

Deno.serve(async request=>{
  const origin=request.headers.get("origin")||"";
  if(!origins.has(origin))return new Response("Origem não autorizada",{status:403});
  if(request.method==="OPTIONS")return new Response("ok",{headers:headers(origin)});
  if(request.method!=="POST")return respond(origin,{error:"Método não permitido"},405);
  const authorization=request.headers.get("authorization");
  if(!authorization?.startsWith("Bearer "))return respond(origin,{error:"Sessão em falta"},401);
  const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret)return respond(origin,{error:"Serviço indisponível"},503);
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await admin.auth.getUser(authorization.slice(7));
  if(userError||!user)return respond(origin,{error:"Sessão inválida"},401);
  const {data:profile}=await admin.from("profiles").select("role,ativo").eq("id",user.id).single();
  if(profile?.role!=="admin"||profile.ativo===false)return respond(origin,{error:"Acesso reservado ao administrador"},403);

  let body:{email?:unknown;nome?:unknown;role?:unknown;cliente_id?:unknown;obra_ids?:unknown};
  try{body=await request.json()}catch{return respond(origin,{error:"Pedido inválido"},400)}
  const email=String(body.email||"").trim().toLowerCase(),nome=String(body.nome||"").trim(),role=String(body.role||""),clienteId=String(body.cliente_id||"").trim();
  const workIds=Array.isArray(body.obra_ids)?[...new Set(body.obra_ids.map(value=>String(value)))]:[];
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||nome.length<2||nome.length>120||(!teamRoles.has(role)&&role!=="cliente")||workIds.length>100||workIds.some(id=>!uuid.test(id)))return respond(origin,{error:"Dados do convite inválidos"},400);
  if(role==="cliente"&&(!uuid.test(clienteId)||workIds.length))return respond(origin,{error:"O convite de cliente exige um cliente e não aceita obras operacionais"},400);
  if(teamRoles.has(role)&&clienteId)return respond(origin,{error:"Contas de equipa não podem receber vínculo de cliente"},400);

  const since=new Date(Date.now()-60*60*1000).toISOString();
  const {count:recentInvites,error:limitError}=await admin.from("atividades_sistema").select("id",{count:"exact",head:true}).eq("utilizador_id",user.id).eq("entidade","convite").gte("criado_em",since);
  if(limitError)return respond(origin,{error:"Não foi possível validar o limite de convites"},503);
  if((recentInvites||0)>=5)return respond(origin,{error:"Limite de cinco convites por hora atingido"},429);
  if(role==="cliente"){
    const {data:client}=await admin.from("clientes").select("id").eq("id",clienteId).single();
    if(!client)return respond(origin,{error:"Cliente não encontrado"},404);
  }else if(workIds.length){
    const {data:works}=await admin.from("obras").select("id").in("id",workIds);
    if((works||[]).length!==workIds.length)return respond(origin,{error:"Uma ou mais obras não foram encontradas"},404);
  }

  const redirectTo=origin==="https://app.distaklda.com"?"https://app.distaklda.com/":"https://dgeral2023.github.io/distak-erp/";
  const {data:invitation,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{data:{nome,role},redirectTo});
  if(inviteError||!invitation.user)return respond(origin,{error:inviteError?.message||"Não foi possível criar o convite"},409);
  const invitedId=invitation.user.id;
  const rollback=async()=>{await admin.auth.admin.deleteUser(invitedId)};
  const {error:profileError}=await admin.from("profiles").upsert({id:invitedId,email,nome,role,ativo:true},{onConflict:"id"});
  if(profileError){await rollback();return respond(origin,{error:"Não foi possível preparar o perfil; o convite foi cancelado"},500)}
  if(role==="cliente"){
    const {error}=await admin.from("cliente_portal_acessos").upsert({user_id:invitedId,cliente_id:clienteId,ativo:true,criado_por:user.id},{onConflict:"user_id,cliente_id"});
    if(error){await rollback();return respond(origin,{error:"Não foi possível associar o cliente; o convite foi cancelado"},500)}
  }else if(workIds.length){
    const rows=workIds.map(obraId=>({obra_id:obraId,user_id:invitedId,atribuido_por:user.id,ativo:true}));
    const {error}=await admin.from("obra_utilizadores").upsert(rows,{onConflict:"obra_id,user_id"});
    if(error){await rollback();return respond(origin,{error:"Não foi possível atribuir as obras; o convite foi cancelado"},500)}
  }
  const {error:auditError}=await admin.from("atividades_sistema").insert({utilizador_id:user.id,entidade:"convite",entidade_id:invitedId,acao:"criou",resumo:"Convite de utilizador enviado",metadados:{origem:"web-v3.8",role,cliente_associado:role==="cliente",obras_atribuidas:workIds.length}});
  if(auditError){await rollback();return respond(origin,{error:"Não foi possível registar a auditoria; o convite foi cancelado"},500)}
  return respond(origin,{ok:true,message:"Convite enviado e acessos preparados"},201);
});
