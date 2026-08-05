export const db=window.supabase.createClient(window.DISTAK_CONFIG.SUPABASE_URL,window.DISTAK_CONFIG.SUPABASE_KEY);

export async function getProfile(id){
  const {data,error}=await db.from("profiles").select("*").eq("id",id).single();
  if(error)throw error;
  return data;
}

export async function query(table,select="*"){
  const {data,error}=await db.from(table).select(select).order("id",{ascending:false});
  if(error)throw error;
  return data||[];
}

export async function save(table,payload,id){
  const q=id?db.from(table).update(payload).eq("id",id):db.from(table).insert(payload);
  const {error}=await q;
  if(error)throw error;
  await audit(table,id,id?"atualizou":"criou",payload);
}

export async function saveReturning(table,payload,id){
  const q=id
    ?db.from(table).update(payload).eq("id",id).select().single()
    :db.from(table).insert(payload).select().single();
  const {data,error}=await q;
  if(error)throw error;
  await audit(table,data?.id||id,id?"atualizou":"criou",payload);
  return data;
}

export async function remove(table,id){
  const {error}=await db.from(table).delete().eq("id",id);
  if(error)throw error;
  await audit(table,id,"eliminou",{});
}

async function audit(table,id,acao,payload){
  if(table==="atividades_sistema")return;
  const {data:{user}}=await db.auth.getUser();
  if(!user)return;
  const labels={clientes:"cliente",obras:"obra",orcamentos:"orçamento",custos:"custo",pagamentos:"pagamento",funcionarios:"funcionário",funcionario_horas:"registo de horas",agenda_tarefas:"tarefa"};
  if(table==="financeiro_previsoes")labels[table]="previsão financeira";
  if(table==="compras_pedidos")labels[table]="pedido de compra";
  if(table==="compras_propostas")labels[table]="proposta de fornecedor";
  if(table==="medicoes_autos")labels[table]="auto de medição";
  if(table==="medicoes_itens")labels[table]="linha de medição";
  const entidade=labels[table]||table;
  const obraId=table==="obras"?(id||null):(payload?.obra_id||null);
  const row={utilizador_id:user.id,obra_id:obraId,entidade,entidade_id:id||null,acao,resumo:`${entidade[0].toUpperCase()+entidade.slice(1)} ${acao}`,metadados:{origem:"web-v3"}};
  const {error}=await db.from("atividades_sistema").insert(row);
  if(error)console.warn("Histórico não registado:",error.message);
}

export async function uploadStorage(bucket,path,file){
  const {data,error}=await db.storage.from(bucket).upload(path,file,{
    cacheControl:"3600",
    upsert:false,
    contentType:file.type||undefined
  });
  if(error)throw error;
  return data;
}

export function publicStorageUrl(bucket,path){
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function removeStorage(bucket,paths){
  const clean=(Array.isArray(paths)?paths:[paths]).filter(Boolean);
  if(!clean.length)return;
  const {error}=await db.storage.from(bucket).remove(clean);
  if(error)throw error;
}
