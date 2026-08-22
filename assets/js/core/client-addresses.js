const clean=value=>String(value??"").trim().replace(/\s+/g," ");

export const clientAddressKey=value=>clean(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"")
  .toLocaleLowerCase("pt-PT");

export function formatClientAddress(row={}){
  const street=clean(row.morada);
  if(!street)return "";
  const postalLocality=clean([row.codigo_postal,row.localidade].map(clean).filter(Boolean).join(" "));
  const parts=[street];
  if(postalLocality&&!clientAddressKey(street).includes(clientAddressKey(postalLocality)))parts.push(postalLocality);
  const country=clean(row.pais);
  if(country&&clientAddressKey(country)!=="portugal"&&!clientAddressKey(parts.join(" ")).includes(clientAddressKey(country)))parts.push(country);
  return parts.join(", ");
}

export function clientAddressSuggestions(client={},rows=[]){
  const clientId=String(client.id??""),candidates=[];
  if(!clientId)return [];
  const main=formatClientAddress(client);
  if(main)candidates.push({value:main,label:"Morada principal",priority:0});
  for(const row of rows){
    if(String(row.cliente_id??"")!==clientId)continue;
    const value=formatClientAddress(row);
    if(!value)continue;
    const type=clean(row.tipo)||"Morada adicional";
    candidates.push({value,label:row.principal?`${type} · Principal`:type,priority:row.principal?1:2});
  }
  const unique=new Map();
  for(const item of candidates.sort((a,b)=>a.priority-b.priority||a.label.localeCompare(b.label,"pt-PT"))){
    const key=clientAddressKey(item.value);
    if(!unique.has(key))unique.set(key,item);
  }
  return [...unique.values()].map(({value,label})=>({value,label}));
}
