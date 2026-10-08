import {platformDb,workspaceDb} from './supabase';
import {publicInvoiceAllowed} from './billing';
import type {RecordItem} from './model';

/** One authorization check for the HTML and PDF versions of an invoice link. */
export async function publicInvoice(token:string){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token))return null;
 const invoice=(await platformDb().from('records').select('*').eq('kind','invoice').eq('data->>public_token',token).maybeSingle()).data as RecordItem|null;
 if(!invoice||!(invoice as any).workspace_id)return null;
 const clientDb=workspaceDb((invoice as any).workspace_id);
 const [client,project]=await Promise.all([
  invoice.client_id?clientDb.from('records').select('*').eq('id',invoice.client_id).eq('kind','client').maybeSingle():Promise.resolve({data:null}),
  invoice.project_id?clientDb.from('records').select('*').eq('id',invoice.project_id).eq('kind','project').maybeSingle():Promise.resolve({data:null})
 ]);
 if(!publicInvoiceAllowed(invoice,client.data as RecordItem|null,project.data as RecordItem|null))return null;
 return {invoice,client:client.data as RecordItem};
}
