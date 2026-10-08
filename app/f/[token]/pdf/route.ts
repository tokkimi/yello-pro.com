import {db,workspaceDb} from '@/lib/supabase';
import {defaults,type RecordItem} from '@/lib/model';
import {makePdf} from '@/lib/pdf';
import {redact} from '@/lib/redact';
import {publicInvoice} from '@/lib/public-invoice';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** PDF of a publicly linked invoice, rendered from the client-safe projection (no costs, no internal notes). */
export async function GET(_req:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!uuid.test(token))return new Response('Introuvable',{status:404});
 const found=await publicInvoice(token);if(!found)return new Response('Introuvable',{status:404});const raw=found.invoice;
 const invoice=redact({id:'public',name:'',email:'',role:'client',client_id:raw.client_id},raw);
 const client=found.client.data;
 const settings=(await workspaceDb((invoice as any).workspace_id).from('records').select('data').eq('kind','settings').limit(1).maybeSingle()).data?.data||defaults;
 const bytes=await makePdf('Facture',invoice.data,client,settings);
 return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${String(raw.data.number||'facture')}.pdf"`,'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
}
