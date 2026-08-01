import {store} from "../core/store.js";
import {$,esc,toast,money} from "../core/ui.js";
import {save,remove,db} from "../core/supabase.js";

let crmClienteId=null;
let crmData={};
const CLIENT_DOCUMENT_BUCKET="distak-documentos";
const safeFileName=name=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]+/g,"-");
const fileSize=value=>Number(value||0)<1048576?`${(Number(value||0)/1024).toFixed(1)} KB`:`${(Number(value||0)/1048576).toFixed(1)} MB`;

export function renderClientes(rows=store.clientes){
  $("clientesTable").innerHTML=rows.length?`<table><thead><tr><th>Nome</th><th>NIF</th><th>Email</th><th>Telefone</th><th>Tipo</th><th>Estado</th><th>Ações</th></tr></thead><tbody>${rows.map(c=>`<tr><td><button class="crm-client-link" data-view-cliente="${c.id}">${esc(c.nome)}</button></td><td>${esc(c.nif||"")}</td><td>${esc(c.email||"")}</td><td>${esc(c.telefone||"")}</td><td>${esc(c.tipo||"")}</td><td><span class="badge">${esc(c.estado||"Ativo")}</span></td><td><button class="btn small primary" data-view-cliente="${c.id}">Ficha</button> <button class="btn small light" data-edit-cliente="${c.id}">Editar</button> <button class="btn small danger" data-del-cliente="${c.id}">Apagar</button></td></tr>`).join("")}</tbody></table>`:"<p>Sem clientes.</p>";
}

export function openCliente(c={}){
  clienteId.value=c.id||"";
  clienteNome.value=c.nome||"";
  clienteNif.value=c.nif||"";
  clienteMorada.value=c.mor…21505 tokens truncated…</div>
  </form>
</dialog>


<dialog id="photoEditDialog" class="photo-edit-dialog">
  <form id="photoEditForm" class="modal-form">
    <h3>Editar fotografia</h3>
    <input id="photoEditId" type="hidden">
    <label>Categoria
      <select id="photoEditCategoria">
        <option>Antes</option><option>Durante</option><option>Depois</option><option>Patologias</option><option>Outros</option>
      </select>
    </label>
    <label>Zona<input id="photoEditZona"></label>
    <label>Data<input id="photoEditData" type="date"></label>
    <label>Título<input id="photoEditTitulo"></label>
    <label class="full">Descrição<textarea id="photoEditDescricao" rows="4"></textarea></label>
    <div class="actions">
      <button type="button" class="btn light" data-close="photoEditDialog">Cancelar</button>
      <button class="btn primary">Guardar alterações</button>
    </div>
  </form>
</dialog>

<dialog id="photoLightbox" class="photo-lightbox">
  <button type="button" class="photo-lightbox-close" data-close="photoLightbox" aria-label="Fechar">×</button>
  <button id="photoLightboxPrev" type="button" class="photo-lightbox-nav prev" aria-label="Anterior">‹</button>
  <figure>
    <img id="photoLightboxImage" alt="">
    <figcaption>
      <strong id="photoLightboxTitle"></strong>
      <span id="photoLightboxMeta"></span>
      <p id="photoLightboxDescription"></p>
    </figcaption>
  </figure>
  <button id="photoLightboxNext" type="button" class="photo-lightbox-nav next" aria-label="Seguinte">›</button>
</dialog>


<dialog id="orcamentoDialog" class="orcamento-dialog"><form id="orcamentoForm" class="modal-form orcamento-form">
  <header class="orcamento-form-head"><div><span>Proposta comercial</span><h3>Novo / editar orçamento</h3></div><button type="button" class="crm-close dark" data-close="orcamentoDialog" aria-label="Fechar">×</button></header>
  <input type="hidden" id="orcamentoId">
  <label>Cliente<select id="orcamentoClienteId" required></select></label><label>Obra<select id="orcamentoObraId"></select></label>
  <label>Número<input id="orcamentoNumero" required></label><label>Referência<input id="orcamentoReferencia" placeholder="Ex.: Pedido por email de 01/08"></label>
  <label>Data de emissão<input id="orcamentoDataEmissao" type="date" required></label><label>Validade em dias<input id="orcamentoValidadeDias" type="number" min="1" max="365" value="15" required></label>
  <label class="full">Descrição / objeto do orçamento<textarea id="orcamentoDescricao" rows="2" required></textarea></label>
  <section class="full orcamento-itens-section">
    <header><div><strong>Trabalhos e materiais</strong><small>Adicione todas as linhas que serão apresentadas ao cliente.</small></div><button id="orcamentoAddItem" class="btn light small" type="button">+ Adicionar linha</button></header>
    <div class="orcamento-item-head"><span>Descrição</span><span>Unidade</span><span>Quantidade</span><span>Preço unitário</span><span>Total</span><span></span></div>
    <div id="orcamentoItens"></div>
  </section>
  <label>Desconto (€)<input id="orcamentoDesconto" type="number" min="0" step="0.01" value="0"></label><label>IVA %<select id="orcamentoIva"><option value="0">0%</option><option value="6">6%</option><option value="23">23%</option></select></label>
  <label>Estado<select id="orcamentoEstado"><option>Rascunho</option><option>Enviado</option><option>Aprovado</option><option>Recusado</option></select></label><label class="full">Condições comerciais<textarea id="orcamentoCondicoes" rows="3" placeholder="Prazo, forma de pagamento, exclusões e observações."></textarea></label>
  <label class="full">Notas internas<textarea id="orcamentoNotas" rows="2" placeholder="Estas notas não aparecem no relatório entregue ao cliente."></textarea></label>
  <div class="full orcamento-total-box"><span>Subtotal <strong id="orcamentoSubtotalPreview">0,00 €</strong></span><span>Desconto <strong id="orcamentoDescontoPreview">0,00 €</strong></span><span>IVA <strong id="orcamentoIvaPreview">0,00 €</strong></span><span class="grand">Total <strong id="orcamentoTotalPreview">0,00 €</strong></span></div>
  <div class="actions full"><button type="button" class="btn light" data-close="orcamentoDialog">Cancelar</button><button id="orcamentoSubmit" class="btn primary">Guardar orçamento</button></div>
</form></dialog>

<dialog id="custoDialog"><form id="custoForm" class="modal-form">
  <h3>Novo / editar custo</h3><input type="hidden" id="custoId">
  <label>Obra<select id="custoObraId" required></select></label><label>Categoria<select id="custoCategoria"><option>Materiais</option><option>Mão de obra</option><option>Subempreiteiros</option><option>Máquinas</option><option>Andaimes</option><option>Entulho</option><option>Combustível</option><option>Portagens</option><option>Ferramentas</option><option>Seguros</option><option>Outros</option></select></label>
  <label>Nome da empresa / fornecedor<input id="custoNomeEmpresa" placeholder="Ex.: Fornecedor, Lda."></label><label>Nº da fatura<input id="custoNumeroFatura" placeholder="Ex.: FT 2026/123"></label>
  <label>Descrição<input id="custoDescricao" required></label><label>Valor sem IVA<input id="custoValor" type="number" step="0.01" required></label>
  <label>IVA %<select id="custoIva"><option value="0">0%</option><option value="6">6%</option><option value="23">23%</option></select></label><label>Data<input id="custoData" type="date"></label>
  <label>Estado do pagamento<select id="custoEstadoPagamento"><option value="pendente">Pendente</option><option value="pago">Pago</option></select></label><label>Data de vencimento<input id="custoDataVencimento" type="date"></label>
  <label class="full">Fatura (PDF ou imagem, máximo 25 MB)<input id="custoAnexo" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"></label>
  <div id="custoAnexoAtual" class="full custo-anexo-atual hidden"></div>
  <div class="full custo-total-preview"><span>Total com IVA</span><strong id="custoTotalPreview">0,00 €</strong></div>
  <div class="actions"><button type="button" class="btn light" data-close="custoDialog">Cancelar</button><button class="btn primary">Guardar</button></div>
</form></dialog>

<dialog id="custoPagamentoDialog"><form id="custoPagamentoForm" class="modal-form">
  <h3>Pagamentos ao fornecedor</h3><input type="hidden" id="custoPagamentoCustoId">
  <div id="custoPagamentoResumo" class="full custo-total-preview"></div>
  <label>Valor pago<input id="custoPagamentoValor" type="number" min="0.01" step="0.01" required></label>
  <label>Data<input id="custoPagamentoData" type="date" required></label>
  <label>Método<select id="custoPagamentoMetodo"><option>Transferência</option><option>Cartão</option><option>Numerário</option><option>Cheque</option><option>Débito direto</option><option>Outro</option></select></label>
  <label>Referência<input id="custoPagamentoReferencia" placeholder="Ex.: comprovativo ou operação"></label>
  <label class="full">Observações<textarea id="custoPagamentoObservacoes" rows="2"></textarea></label>
  <div id="custoPagamentoLista" class="full"></div>
  <div class="actions"><button type="button" class="btn light" data-close="custoPagamentoDialog">Fechar</button><button class="btn primary">Registar pagamento</button></div>
</form></dialog>

<dialog id="pagamentoDialog"><form id="pagamentoForm" class="modal-form">
  <h3>Novo / editar pagamento</h3><input type="hidden" id="pagamentoId">
  <label>Obra<select id="pagamentoObraId" required></select></label><label>Descrição<input id="pagamentoDescricao" required></label>
  <label>Valor<input id="pagamentoValor" type="number" step="0.01" required></label><label>Data<input id="pagamentoData" type="date"></label>
  <label>Estado<select id="pagamentoEstado"><option>Recebido</option><option>Pendente</option><option>Em atraso</option></select></label>
  <div class="actions"><button type="button" class="btn light" data-close="pagamentoDialog">Cancelar</button><button class="btn primary">Guardar</button></div>
</form></dialog>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/config.js"></script>
<script type="module" src="assets/js/app.js"></script>
</body>
</html>
