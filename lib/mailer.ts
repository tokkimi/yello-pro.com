import {brandedEmail} from './email-branding';
import type {Data} from './model';
/** Transactional e-mail through Resend. Without configuration nothing is sent and the caller is told so. */
export type MailResult={status:'envoyé'|'non configuré'|'échec';id?:string;error?:string};
export async function sendMail(input:{to:string;settings?:Data;cc?:string[];subject:string;text:string;idempotencyKey:string;attachments?:{filename:string;content:string}[]}):Promise<MailResult>{
 if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)return {status:'non configuré'};
 if(process.env.MAIL_DOMAIN_VERIFIED==='false')return {status:'non configuré',error:'Le domaine d’envoi Yello Pro attend sa validation DNS dans Resend.'};
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':input.idempotencyKey},body:JSON.stringify({from:process.env.MAIL_FROM,...(process.env.MAIL_REPLY_TO?{reply_to:process.env.MAIL_REPLY_TO}:{}),to:[input.to],...(input.cc?.length?{cc:input.cc}:{}),subject:input.subject,text:input.text,html:brandedEmail(input.text,input.settings),...(input.attachments?{attachments:input.attachments}:{})}),signal:AbortSignal.timeout(15000)});
  const body=await response.json().catch(()=>({}));
  return response.ok?{status:'envoyé',id:body.id}:{status:'échec',error:String(body.message||response.status)};
 }catch(e){return {status:'échec',error:(e as Error).message}}
}
export const siteUrl=(req?:Request)=>process.env.NEXT_PUBLIC_SITE_URL||(req?new URL(req.url).origin:'https://yello-pro.vercel.app');
