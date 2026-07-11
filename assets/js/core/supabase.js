export const db=window.supabase.createClient(window.DISTAK_CONFIG.SUPABASE_URL,window.DISTAK_CONFIG.SUPABASE_KEY);
export async function getProfile(id){const {data,error}=await db.from("profiles").select("*").eq("id",id).single();if(error)throw error;return data}
export async function query(table,select="*"){const {data,error}=await db.from(table).select(select).order("id",{ascending:false});if(error)throw error;return data||[]}
export async function save(table,payload,id){const q=id?db.from(table).update(payload).eq("id",id):db.from(table).insert(payload);const {error}=await q;if(error)throw error}
export async function remove(table,id){const {error}=await db.from(table).delete().eq("id",id);if(error)throw error}
