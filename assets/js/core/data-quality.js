export const normalizeEmail=value=>String(value||"").trim().toLowerCase();

export const normalizeNif=value=>String(value||"").replace(/\D/g,"").slice(0,9);

export function findDuplicateClient(clients,candidate,currentId=null){
  const nif=normalizeNif(candidate?.nif);
  const email=normalizeEmail(candidate?.email);
  return (clients||[]).find(client=>{
    if(String(client.id)===String(currentId||""))return false;
    return (nif&&normalizeNif(client.nif)===nif)||(email&&normalizeEmail(client.email)===email);
  })||null;
}
