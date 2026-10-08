import Anthropic from '@anthropic-ai/sdk';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {identity,db} from '@/lib/supabase';
import {sameOrigin} from '@/lib/access';
import {activeRecords} from '@/lib/client-trash';
import {assistantContext} from '@/lib/routines';
import {aiInstructions} from '@/lib/settings-model';
import type {RecordItem} from '@/lib/model';

export const dynamic='force-dynamic';
const MODEL='claude-opus-5-5';
const schema=z.object({messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().min(1).max(6000)})).min(1).max(20)});

/** Read-only business assistant for administrators. It answers from a computed summary and never changes data. */
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Origine refusée.'},{status:403});
 const user=await identity();
 if(!user)return NextResponse.json({error:'Connexion requise.'},{status:401});
 if(user.role!=='admin')return NextResponse.json({error:'Accès refusé.'},{status:403});
 if(!process.env.ANTHROPIC_API_KEY)return NextResponse.json({error:'Assistant non configuré : la clé ANTHROPIC_API_KEY doit être ajoutée aux variables du projet Vercel, puis redéployée.',configured:false},{status:503});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success||parsed.data.messages[0].role!=='user'||parsed.data.messages.at(-1)!.role!=='user')return NextResponse.json({error:'Conversation invalide.'},{status:400});
 const {data,error}=await (await db()).from('records').select('*').in('kind',['project','invoice','expense','quote','request','task','settings','client']);
 if(error)return NextResponse.json({error:'Données indisponibles.'},{status:503});
 const records=activeRecords((data||[]) as RecordItem[]);
 const settings=records.find(r=>r.kind==='settings')?.data||{};
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Montreal'});
 const system=`Tu es l’assistant de gestion de ${settings.name||'Yello Pro'}, entrepreneur en rénovation au Québec. Réponds en français, brièvement, uniquement à partir des données ci-dessous. Si une information n’y figure pas, dis-le. Tu ne peux rien modifier, envoyer ni créer : propose seulement des actions que l’utilisateur fera lui-même dans Yello Pro. ${aiInstructions(settings.ai_preferences)}\n\nDonnées calculées :\n${assistantContext(records,today,settings)}`;
 try{
  const client=new Anthropic();
  const response=await client.beta.messages.create({model:MODEL,max_tokens:4000,output_config:{effort:'low'},betas:['server-side-fallback-2026-07-01'],fallbacks:'default',system,messages:parsed.data.messages});
  if(response.stop_reason==='refusal')return NextResponse.json({error:'L’assistant a refusé de répondre à cette demande.'},{status:422});
  const text=response.content.map(block=>block.type==='text'?block.text:'').join('').trim();
  return NextResponse.json({reply:text||'Aucune réponse.'},{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){
  if(e instanceof Anthropic.AuthenticationError)return NextResponse.json({error:'Clé IA refusée par le service. Vérifiez ANTHROPIC_API_KEY.'},{status:502});
  if(e instanceof Anthropic.RateLimitError)return NextResponse.json({error:'Service IA saturé, réessayez dans un instant.'},{status:429});
  if(e instanceof Anthropic.APIError)return NextResponse.json({error:`Service IA indisponible (${e.status}).`},{status:502});
  return NextResponse.json({error:'Service IA injoignable.'},{status:502});
 }
}
