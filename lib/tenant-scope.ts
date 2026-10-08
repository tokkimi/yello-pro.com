/** Mandatory tenant scoping for all business tables, including service-key queries. */
const tables=new Set(['records','profiles','memberships','audit_log','deliveries','subscriptions','platform_payments','plan_shares']);
export function scopeClient<T>(client:T,workspaceId:string):T{
 if(!/^[0-9a-f-]{36}$/i.test(workspaceId))throw new Error('Espace de travail invalide.');
 const raw=client as any;
 const values=(input:any)=>{const add=(row:any)=>{if(row.workspace_id&&row.workspace_id!==workspaceId)throw new Error('Écriture inter-entreprises refusée.');return {...row,workspace_id:workspaceId}};return Array.isArray(input)?input.map(add):add(input)};
 return new Proxy(raw,{get(target,key){
  if(key==='from')return (table:string)=>{if(!tables.has(table))throw new Error('Table non autorisée.');const query=target.from(table);return new Proxy(query,{get(q,method){if(method==='insert'||method==='upsert')return (data:any,...args:any[])=>q[method](values(data),...args);if(['select','update','delete'].includes(String(method)))return (...args:any[])=>{if(method==='update'&&args[0]?.workspace_id)throw new Error('Transfert inter-entreprises refusé.');return q[method](...args).eq('workspace_id',workspaceId)};const v=q[method];return typeof v==='function'?v.bind(q):v}})};
  if(key==='rpc')return (name:string,args:any)=>{if(name==='rate_limit')return target.rpc(name,{...args,p_key:workspaceId+':'+args.p_key});if(name==='finance_operation')return target.rpc(name,{...args,p_workspace:workspaceId});throw new Error('Opération réservée à la plateforme.')};
  if(key==='storage')return {from:(bucket:string)=>{if(bucket!=='documents')throw new Error('Stockage non autorisé.');const store=target.storage.from(bucket),path=(p:string)=>{if(!p||p.startsWith('/')||p.includes('\\')||p.split('/').some(part=>part==='..'||part==='.'||!part))throw new Error('Chemin de stockage invalide.');return `${workspaceId}/${p}`};return new Proxy(store,{get(s,method){if(['upload','download','createSignedUrl','update'].includes(String(method)))return (p:string,...args:any[])=>s[method](path(p),...args);if(method==='remove')return (paths:string[])=>s.remove(paths.map(path));throw new Error('Opération de stockage non autorisée.')}})}};
  const v=target[key];return typeof v==='function'?v.bind(target):v;
 }}) as T;
}
