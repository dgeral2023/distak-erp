import {$,esc,money,parseEuroValue} from "../core/ui.js";
import {audit,db} from "../core/supabase.js";
import {calculateWorkFinancialValuesFromRate,normalizeWorkVatRate} from "../core/work-finance.js";
import {summarizeWorkVatParts,WORK_VAT_NON_TAXED,workVatPartValues} from "../core/work-vat-parts.js";

let parts=[],ready=false;
const regimes=[["23","IVA 23%"],["6","IVA 6%"],["autoliquidacao","IVA — autoliquidação"],["isento","Isento — indicar artigo"],["nao_sujeito","Não sujeito — indicar fundamento"],["outro","Outro enquadramento sem IVA"]];
const blank=(index,base=0)=>({descricao:`Parcela ${index+1}`,valor_base:base||"",regime_iva:index?"autoliquidacao":"tributado",taxa_iva:index?0:23,motivo_nao_liquidacao:""});
const partRegime=part=>part.regime_iva==="tributado"?String(part.taxa_iva):part.regime_iva;

function splitHalf(){
  const current=parts.length?summarizeWorkVatParts(parts).base:parseEuroValue($("obraValor").value);
  const first=Number.isFinite(current)&&current>0?Math.round(current*50)/100:0;
  parts=[blank(0,first),blank(1,current?Math.round((current-first)*100)/100:0)];
}

function renderParts(){
  $("obraIvaParcelas").innerHTML=parts.map((part,index)=>{
    const untaxed=WORK_VAT_NON_TAXED.has(part.regime_iva),values=workVatPartValues(part);
    return `<fieldset class="client-form-section"><legend>Parcela ${index+1}</legend><div class="client-form-grid"><label>Descrição<input data-vat-index="${index}" data-vat-field="descricao" maxlength="120" value="${esc(part.descricao)}"></label><label>Base sem IVA<input data-vat-index="${index}" data-vat-field="valor_base" inputmode="decimal" maxlength="24" value="${esc(part.valor_base)}" placeholder="Ex.: 5.000,00 €"></label><label>Tratamento de IVA<select data-vat-index="${index}" data-vat-field="regime">${regimes.map(([value,label])=>`<option value="${value}" ${partRegime(part)===value?"selected":""}>${label}</option>`).join("")}</select></label><label class="${untaxed?"":"hidden"}">Motivo fiscal<input data-vat-index="${index}" data-vat-field="motivo_nao_liquidacao" maxlength="240" value="${esc(part.motivo_nao_liquidacao||"")}" placeholder="Ex.: IVA — autoliquidação"></label></div><div class="actions"><span class="field-help">IVA ${money(values.vat)} · Total ${money(values.total)}</span><button class="btn small danger" type="button" data-vat-remove="${index}" ${parts.length<=2?"disabled":""}>Remover</button></div></fieldset>`;
  }).join("");
  renderPreview();
}

function setMode(mode){
  const mixed=mode==="misto";
  $("obraIvaUnicoCampos").classList.toggle("hidden",mixed);
  $("obraIvaParcelasSection").classList.toggle("hidden",!mixed);
  if(mixed&&!parts.length){splitHalf();renderParts()}
  if(!mixed&&parts.length)$("obraValor").value=summarizeWorkVatParts(parts).base||"";
  renderPreview();
}

function syncPart(target){
  const index=Number(target.dataset.vatIndex),part=parts[index];
  if(!part)return;
  if(target.dataset.vatField==="regime"){
    const value=target.value;
    part.regime_iva=["23","6"].includes(value)?"tributado":value;
    part.taxa_iva=part.regime_iva==="tributado"?Number(value):0;
    renderParts();
    return;
  }
  part[target.dataset.vatField]=target.value;
  renderPreview();
}

function configure(){
  if(ready)return;ready=true;
  $("obraIvaModo").addEventListener("change",event=>setMode(event.target.value));
  $("obraValor").addEventListener("input",renderPreview);
  $("obraIvaTaxa").addEventListener("change",renderPreview);
  $("obraIvaAdicionar").addEventListener("click",()=>{parts.push(blank(parts.length));renderParts()});
  $("obraIvaDividir").addEventListener("click",()=>{splitHalf();renderParts()});
  $("obraIvaParcelas").addEventListener("input",event=>{if(event.target.dataset.vatField)syncPart(event.target)});
  $("obraIvaParcelas").addEventListener("change",event=>{if(event.target.dataset.vatField)syncPart(event.target)});
  $("obraIvaParcelas").addEventListener("click",event=>{const index=event.target.closest("[data-vat-remove]")?.dataset.vatRemove;if(index!==undefined&&parts.length>2){parts.splice(Number(index),1);renderParts()}});
}

function renderPreview(){
  const mixed=$("obraIvaModo").value==="misto";
  const finance=mixed?summarizeWorkVatParts(parts):calculateWorkFinancialValuesFromRate(parseEuroValue($("obraValor").value),normalizeWorkVatRate($("obraIvaTaxa").value));
  $("obraIvaValorPreview").textContent=money(finance.vat);
  $("obraTotalPreview").textContent=money(finance.total);
  $("obraIvaResumo").textContent=mixed?`${parts.length} parcelas · Base ${money(finance.base)} · IVA misto`:"Uma taxa aplicada ao valor base total.";
}

export async function openWorkVatForm(work={}){
  configure();parts=[];
  if(work.id){
    const {data,error}=await db.from("obra_iva_parcelas").select("*").eq("obra_id",work.id).order("ordem");
    if(error&&!["42P01","PGRST205"].includes(error.code))throw error;
    parts=data||[];
  }
  $("obraIvaModo").value=parts.length?"misto":"unico";
  if(parts.length)renderParts();
  setMode($("obraIvaModo").value);
}

export function readWorkVatForm(){
  if($("obraIvaModo").value!=="misto"){
    const base=parseEuroValue($("obraValor").value),rate=normalizeWorkVatRate($("obraIvaTaxa").value);
    if(!Number.isFinite(base)||base<0||rate===null)throw new Error("Introduza um valor válido e escolha a taxa de IVA.");
    return {finance:calculateWorkFinancialValuesFromRate(base,rate),parts:[]};
  }
  if(parts.length<2||parts.length>20)throw new Error("O IVA misto deve ter entre 2 e 20 parcelas.");
  const normalized=parts.map((part,index)=>{
    const base=parseEuroValue(part.valor_base),descricao=String(part.descricao||"").trim(),motivo=String(part.motivo_nao_liquidacao||"").trim();
    if(!Number.isFinite(base)||base<=0)throw new Error(`Introduza um valor válido na parcela ${index+1}.`);
    if(descricao.length<2)throw new Error(`Descreva a parcela ${index+1}.`);
    if(WORK_VAT_NON_TAXED.has(part.regime_iva)&&motivo.length<5)throw new Error(`Indique o motivo fiscal da parcela ${index+1}.`);
    return {descricao,valor_base:base,regime_iva:part.regime_iva,taxa_iva:Number(part.taxa_iva||0),motivo_nao_liquidacao:WORK_VAT_NON_TAXED.has(part.regime_iva)?motivo:null};
  });
  return {finance:summarizeWorkVatParts(normalized),parts:normalized};
}

export async function saveWorkWithVatParts(payload,vatParts,id){
  const {data,error}=await db.rpc("guardar_obra_com_iva_parcelas",{p_obra:payload,p_parcelas:vatParts,p_obra_id:id||null});
  if(error)throw error;
  if(!data)throw new Error("A obra não foi guardada.");
  await audit("obras",data,id?"atualizou":"criou",payload);
  return {id:data};
}
