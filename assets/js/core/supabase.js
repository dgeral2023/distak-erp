export const db=window.supabase.createClient(window.DISTAK_CONFIG.SUPABASE_URL,window.DISTAK_CONFIG.SUPABASE_KEY);

export async function getProfile(id){
  const {data,error}=await db.from("profiles").select("*").eq("id",id).single();
  if(error)throw error;
  return data;
}

export async function query(table,select="*"){
  const rows=[],pageSize=1000;
  for(let from=0;;from+=pageSize){
    const {data,error}=await db.from(table).select(select).order("id",{ascending:false}).range(from,from+pageSize-1);
    if(error)throw error;
    rows.push(...(data||[]));
    if(!data||data.length<pageSize)break;
  }
  return rows;
}

export async function save(table,payload,id){
  const q=id?db.from(table).update(payload).eq("id",id):db.from(table).insert(payload);
  const {data,error}=await q.select("id").maybeSingle();
  if(error)throw error;
  if(!data?.id)throw new Error(id?"O registo já não existe ou não pode ser alterado.":"O registo não foi criado.");
  await audit(table,data.id,id?"atualizou":"criou",payload);
  return data;
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

export async function saveBudgetWithItems(payload,items,id){
  const {data,error}=await db.rpc("guardar_orcamento_com_itens",{
    p_orcamento:payload,
    p_itens:items,
    p_orcamento_id:id||null
  });
  if(error){
    if(error.code==="23505")throw new Error("Já existe um orçamento com este número.");
    throw error;
  }
  if(!data)throw new Error("O orçamento não foi guardado.");
  await audit("orcamentos",data,id?"atualizou":"criou",payload);
  return {id:data};
}

export async function remove(table,id){
  const {data,error}=await db.from(table).delete().eq("id",id).select("id").maybeSingle();
  if(error)throw error;
  if(!data?.id)throw new Error("O registo já não existe ou não pode ser eliminado.");
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
  if(table==="campo_registos")labels[table]="registo de campo";
  if(table==="inteligencia_avaliacoes")labels[table]="análise de gestão";
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

export async function signStorageRows(bucket,rows,pathKey,urlKey="url",expiresIn=3600){
  const source=Array.isArray(rows)?rows:[];
  const paths=[...new Set(source.map(row=>row?.[pathKey]).filter(Boolean))];
  if(!paths.length)return source.map(row=>({...row,[urlKey]:null}));
  const {data,error}=await db.storage.from(bucket).createSignedUrls(paths,expiresIn);
  if(error)throw error;
  const urls=new Map((data||[]).map(item=>[item.path,item.signedUrl||item.signedURL||null]));
  return source.map(row=>({...row,[urlKey]:row?.[pathKey]?urls.get(row[pathKey])||null:null}));
}

export async function removeStorage(bucket,paths){
  const clean=(Array.isArray(paths)?paths:[paths]).filter(Boolean);
  if(!clean.length)return;
  const {error}=await db.storage.from(bucket).remove(clean);
  if(error)throw error;
}
