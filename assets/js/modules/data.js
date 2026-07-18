import {query} from "../core/supabase.js";
import {store} from "../core/store.js";

export async function refreshData(){
  store.clientes=await query("clientes");

  store.obras=await query("obras","*,clientes(nome,nif,email,telefone)");

  const orcamentos=await query("orcamentos","*,obras(nome,cliente_id,clientes(nome))");
  store.orcamentos=orcamentos.map(o=>({
    ...o,
    clientes:o.obras?.clientes||null,
    descricao:o.descricao||`Orçamento ${o.numero||""}`.trim(),
    valor_sem_iva:Number(o.mao_obra||0)+Number(o.materiais||0)+Number(o.logistica||0),
    estado:o.estado||"Registado"
  }));

  const custos=await query("custos","*,obras(nome)");
  store.custos=custos.map(c=>({
    ...c,
    categoria:c.tipo||c.categoria||"Outro",
    valor_sem_iva:Number(c.valor||c.valor_sem_iva||0),
    iva:Number(c.iva||0)
  }));

  const pagamentos=await query("pagamentos","*,obras(nome)");
  store.pagamentos=pagamentos.map(p=>({
    ...p,
    descricao:p.descricao||p.observacoes||p.metodo||"Pagamento",
    estado:p.estado||"Recebido"
  }));
}
