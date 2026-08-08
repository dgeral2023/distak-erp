export function safeHttpsUrl(value){
  try{const url=new URL(String(value||""));return url.protocol==="https:"&&!url.username&&!url.password&&url.href.length<=2048?url.href:""}catch{return ""}
}
export function publicationState({published=false,url="",requiresUrl=false}={}){
  const normalized=url?safeHttpsUrl(url):"";
  if(requiresUrl&&!normalized)return {valid:false,error:"Indique um endereço HTTPS válido, sem credenciais."};
  if(url&&!normalized)return {valid:false,error:"Apenas endereços HTTPS válidos e sem credenciais podem ser publicados."};
  return {valid:true,published:Boolean(published),url:normalized||null};
}
