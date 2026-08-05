const DB_NAME="distak-field-v1";
const STORE_NAME="pending-records";

function openDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      const database=request.result;
      if(!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME,{keyPath:"reference"});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

function transaction(mode,callback){
  return openDatabase().then(database=>new Promise((resolve,reject)=>{
    const tx=database.transaction(STORE_NAME,mode);
    const store=tx.objectStore(STORE_NAME);
    const result=callback(store);
    tx.oncomplete=()=>{database.close();resolve(result?.result)};
    tx.onerror=()=>{database.close();reject(tx.error)};
    tx.onabort=()=>{database.close();reject(tx.error)};
  }));
}

export const queueFieldRecord=record=>transaction("readwrite",store=>store.put(record));
export const removeQueuedFieldRecord=reference=>transaction("readwrite",store=>store.delete(reference));
export const listQueuedFieldRecords=()=>transaction("readonly",store=>store.getAll()).then(rows=>(rows||[]).sort((a,b)=>a.createdAt-b.createdAt));

