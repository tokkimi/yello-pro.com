import {NextResponse} from 'next/server';
import {identity,db} from '@/lib/supabase';
import {aiInstructions} from '@/lib/settings-model';
import {sameOrigin} from '@/lib/access';
import {z} from 'zod';
import {analyzeTranscript,buildAnalysisMessages,parseModelAnalysis,ANALYZE_MODEL,Analysis} from '@/lib/analyze';
export const dynamic='force-dynamic';
const schema=z.object({transcript:z.string().min(1).max(20000),context:z.object({scope:z.string().max(6000).optional(),rooms:z.array(z.object({name:z.string().optional(),length:z.number().optional(),width:z.number().optional(),height:z.number().optional(),unit:z.string().optional()})).max(40).optional()}).optional()});
// Analyse a dictated visit note into draft quote lines. Claude refines the result
// when ANTHROPIC_API_KEY is set; otherwise the deterministic heuristic answers.
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Origine refusée.'},{status:403});
 const user=await identity();if(user?.role!=='admin')return NextResponse.json({error:'Accès refusé.'},{status:403});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:'Note vocale invalide.'},{status:400});
 const {transcript,context={}}=parsed.data;
 const fallback:Analysis=analyzeTranscript(transcript,context);
 const key=process.env.ANTHROPIC_API_KEY;
 if(key){
  try{
   const built=buildAnalysisMessages(transcript,context),messages=built.messages;const preferences=(await (await db()).from('records').select('data').eq('kind','settings').limit(1).maybeSingle()).data?.data?.ai_preferences;const system=`${built.system}\n\n${aiInstructions(preferences)}`;
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
   const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:controller.signal,headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:ANALYZE_MODEL,max_tokens:1500,system,messages})}).finally(()=>clearTimeout(timer));
   if(res.ok){
    const data=await res.json();
    const textOut=Array.isArray(data?.content)?data.content.filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('\n'):'';
    const analysis=parseModelAnalysis(textOut);
    if(analysis)return NextResponse.json({analysis});
   }
  }catch{/* fall through to the deterministic analysis */}
 }
 return NextResponse.json({analysis:fallback,note:key?'Analyse locale utilisée (le service IA n’a pas répondu).':undefined});
}
