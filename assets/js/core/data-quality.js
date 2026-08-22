export const normalizeEmail=value=>String(value||"").trim().toLowerCase();

export const normalizeNif=value=>String(value||"").replace(/\D/g,"").slice(0,9);

export const normalizePostalCode=value=>{
  const digits=String(value||"").replace(/\D/g,"").slice(0,7);
  return digits.length>4?`${digits.slice(0,4)}-${digits.slice(4)}`:digits;
};

export const portuguesePhoneDigits=value=>{
  const digits=String(value||"").replace(/\D/g,"");
  return digits.length===12&&digits.startsWith("351")?digits.slice(3):digits;
};

export function isValidPortugueseNif(value){
  const nif=normalizeNif(value);
  if(!/^[1-9]\d{8}$/.test(nif))return false;
  const sum=nif.slice(0,8).split("").reduce((total,digit,index)=>total+Number(digit)*(9-index),0);
  const remainder=11-(sum%11),checkDigit=remainder>=10?0:remainder;
  return checkDigit===Number(nif[8]);
}

export const isValidPortuguesePostalCode=value=>/^\d{4}-\d{3}$/.test(normalizePostalCode(value));
export const isValidPortuguesePhone=value=>/^\d{9}$/.test(portuguesePhoneDigits(value));

export function validateClientData(client){
  const errors={};
  const portugal=!client?.pais||String(client.pais).trim().toLowerCase()==="portugal";
  if(!String(client?.nome||"").trim())errors.nome="Indique o nome do cliente.";
  if(portugal&&client?.nif&&!isValidPortugueseNif(client.nif))errors.nif="Introduza um NIF português válido com 9 algarismos.";
  if(portugal&&client?.telefone&&!isValidPortuguesePhone(client.telefone))errors.telefone="Introduza um telefone português com 9 algarismos.";
  if(portugal&&client?.telefone_alternativo&&!isValidPortuguesePhone(client.telefone_alternativo))errors.telefone_alternativo="Introduza um telefone alternativo com 9 algarismos.";
  if(portugal&&client?.codigo_postal&&!isValidPortuguesePostalCode(client.codigo_postal))errors.codigo_postal="Use o formato 0000-000.";
  if(Number(client?.limite_credito||0)<0)errors.limite_credito="O limite de crédito não pode ser negativo.";
  return errors;
}

export function findDuplicateClient(clients,candidate,currentId=null){
  const nif=normalizeNif(candidate?.nif);
  const email=normalizeEmail(candidate?.email);
  return (clients||[]).find(client=>{
    if(String(client.id)===String(currentId||""))return false;
    return (nif&&normalizeNif(client.nif)===nif)||(email&&normalizeEmail(client.email)===email);
  })||null;
}
