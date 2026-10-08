import {brandingFrom} from './settings-model';
import type {Data} from './model';
const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** Plain text is escaped before rendering: customer content never becomes executable markup. */
export function brandedEmail(text:string,settings:Data={}){
 const b=brandingFrom(settings.branding),name=escape(settings.name||'Yello Pro'),color=b.emailSameColor?b.accent:'#193f39';
 const identity=`<strong style="color:${color}">${name}</strong>`;
 return `<div style="background:#f5f7f5;padding:24px;font-family:Arial,sans-serif;color:#25352d"><div style="max-width:600px;margin:auto;background:white;border-radius:16px;border-top:5px solid ${color};padding:24px">${b.emailLogo==='top'?identity:''}<div style="white-space:pre-wrap;line-height:1.6;margin:20px 0">${escape(text)}</div><div style="white-space:pre-wrap;border-top:1px solid #e0e7e1;padding-top:16px">${escape(b.signature)}</div>${b.emailLogo==='signature'?identity:''}</div></div>`;
}
