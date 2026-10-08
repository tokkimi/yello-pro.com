import {PDFDocument,StandardFonts,rgb,PDFFont,PDFPage} from 'pdf-lib';
import {lineSale,unitSale} from './pricing';
import {brandingFrom} from './settings-model';
import {Data,defaults,totals,money,paymentRows,defaultPaymentSchedule} from './model';
// Professional soumission / facture / report layout built on pdf-lib. Keeps the
// original signature so existing callers (quote, invoice, visit, accounting) work.
const INK=rgb(.11,.15,.13),MUTED=rgb(.42,.46,.42),GOLD=rgb(.67,.52,.28),FOREST=rgb(.13,.25,.2),SOFT=rgb(.96,.965,.94),LINE=rgb(.85,.87,.83);
export async function makePdf(title:string,data:Data,client:Data={},settings:Data=defaults,photos:{bytes:Uint8Array;mime:string;caption:string}[]=[]){
 const branding=brandingFrom(settings.branding);
 const accent=branding.accent;
 const FOREST=rgb(parseInt(accent.slice(1,3),16)/255,parseInt(accent.slice(3,5),16)/255,parseInt(accent.slice(5,7),16)/255),GOLD=FOREST;
 const pdf=await PDFDocument.create();
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const W=595,H=842,L=45,R=550,top=800,bottom=60;
 let page=pdf.addPage([W,H]);let y=top;
 const clean=(s:any)=>String(s??'').replace(/[  ]/g,' ').replace(/[–—]/g,'-').replace(/[’]/g,"'").replace(/[^\x20-\x7e\xa0-\xff\n]/g,'');
 const width=(s:string,size:number,f=font)=>f.widthOfTextAtSize(s,size);
 const ensure=(space:number)=>{if(y-space<bottom){page=pdf.addPage([W,H]);y=top;}};
 const wrap=(s:string,size:number,maxW:number,f=font)=>{const out:string[]=[];for(const raw of clean(s).split('\n')){let cur='';for(const w of raw.split(/\s+/)){if(!w)continue;const t=cur?cur+' '+w:w;if(width(t,size,f)>maxW&&cur){out.push(cur);cur=w;}else cur=t;}out.push(cur);}return out;};
 const draw=(s:string,x:number,size:number,{f=font,color=INK}:{f?:PDFFont;color?:any}={})=>{page.drawText(clean(s),{x,y,size,font:f,color});};
 const right=(s:string,x:number,size:number,{f=font,color=INK}:{f?:PDFFont;color?:any}={})=>{page.drawText(clean(s),{x:x-width(clean(s),size,f),y,size,font:f,color});};
 const para=(s:string,x:number,size:number,maxW:number,{f=font,color=INK,gap=5}:{f?:PDFFont;color?:any;gap?:number}={})=>{for(const ln of wrap(s,size,maxW,f)){ensure(size+gap);page.drawText(ln,{x,y,size,font:f,color});y-=size+gap;}};

 // Accounting report keeps a simple, dense layout.
 if(data.reportLines){
  draw(settings.name||defaults.name,L,20,{f:bold});y-=26;draw(title,L,15,{f:bold,color:FOREST});y-=22;
  for(const l of data.reportLines)para(l,L,10,R-L,{color:MUTED,gap:6});
  return finish();
 }

 // ---- Header band ----
 if(branding.showLogo&&branding.logo){try{const bytes=Uint8Array.from(atob(branding.logo.split(',')[1]),c=>c.charCodeAt(0));const image=branding.logo.startsWith('data:image/png')?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);const d=image.scaleToFit(110,50);page.drawImage(image,{x:L,y:y-d.height,width:d.width,height:d.height});y-=d.height+14;}catch{}}

 if(branding.colorAccent)page.drawRectangle({x:0,y:H-6,width:W,height:6,color:GOLD});
 const num=data.number||'';
 const isInvoice=/facture/i.test(title),isQuote=/soumission|devis|ordre de changement/i.test(title),isAgreement=/contrat/i.test(title),isContract=/contrat|cahier des charges/i.test(title),view=data.client_view||{};
 const headerStart=y,headerWidth=250;
 para(settings.name||defaults.name,L,branding.header==='compact'?15:20,headerWidth,{f:bold});
 if(branding.showCompanyAddress&&settings.address)para(settings.address,L,9,headerWidth,{color:MUTED});
 const contact=branding.contactOverride||[branding.showContactName?branding.contactName:'',branding.showCompanyPhone?branding.contactPhone||settings.phone:'',branding.showCompanyEmail?branding.contactEmail||settings.email:''].filter(Boolean).join('  •  ');
 if(contact)para(contact,L,9,headerWidth,{color:MUTED});
 if(branding.showWebsite&&branding.website)para(branding.website,L,8.5,headerWidth,{color:MUTED});
 const lic=[branding.showLicence&&settings.rbq?`RBQ ${settings.rbq}`:'',branding.showTaxNumbers&&settings.tps_number?`TPS ${settings.tps_number}`:'',branding.showTaxNumbers&&settings.tvq_number?`TVQ ${settings.tvq_number}`:''].filter(Boolean).join('  •  ');
 if(lic)para(lic,L,8.5,headerWidth,{color:MUTED});
 const companyEnd=y;y=headerStart;
 para(title,325,16,R-325,{f:bold,color:FOREST});
 para(isInvoice?`Facture ${num?'# '+num:''}`:num,325,10,R-325);
 para(`${isInvoice?'Date de facturation':'Date'} : ${clean(data.date||new Date().toISOString().slice(0,10))}`,325,9,R-325,{color:MUTED});
 if(data.signed_at)para(`Signé le ${clean(data.signed_at)}`,325,9,R-325,{color:MUTED});
 y=Math.min(companyEnd,y)-12;
 page.drawLine({start:{x:L,y},end:{x:R,y},thickness:1,color:LINE});y-=22;

 // ---- Client / billing ----
 const colR=310;const startY=y;
 if(view.client!==false){draw(isAgreement?'DESTINATAIRE':'CLIENT',L,8,{f:bold,color:GOLD});y-=15;
 if(branding.showClientName&&client.name)para(client.name,L,12,colR-L-15,{f:bold});
 if(branding.showClientCompany&&client.company)para(client.company,L,10,colR-L-15,{color:MUTED});y-=3;
 for(const v of [branding.showClientEmail?client.email:null,branding.showClientPhone?client.phone:null,data.project_number?`Projet ${data.project_number}`:'',client.address].filter(Boolean)){para(String(v),L,9.5,colR-L-15,{color:MUTED,gap:4});}}
 const leftEnd=y;y=startY;
 if(branding.showBillingAddress&&client.billing_address){draw('ADRESSE DE FACTURATION',colR,8,{f:bold,color:GOLD});y-=15;para(String(client.billing_address),colR,9.5,R-colR,{color:MUTED,gap:4});}
 y=Math.min(leftEnd,y)-16;



 const t=totals(data);
 const showPrice=view.unitPrices===true||isInvoice;
 const amountWidth=Math.max(92,...(data.lines||[]).map((line:Data)=>width(clean(money(lineSale(line))),10,bold)+24),width(clean(money(t.total)),10)+24);
 const priceWidth=showPrice?Math.max(86,...(data.lines||[]).map((line:Data)=>width(clean(money(Number(line.price))),9.5)+22)):0;
 const qtyX=R-amountWidth-priceWidth-12,puX=R-amountWidth-12,amtX=R;
 const descriptionWidth=Math.max(100,qtyX-L-90);
 const fitRight=(value:string,x:number,maxWidth:number,size:number,options:{f?:PDFFont;color?:any}={})=>right(value,x,Math.min(size,maxWidth/Math.max(1,width(clean(value),size,options.f||font))*size),options);
 if(!isContract||(isAgreement&&Array.isArray(data.lines)&&data.lines.length>0)){
 // ---- Cost summary box (quotes/invoices) ----
 const summary:[string,string][]=[['Sous-total',money(t.subtotal+Number('markup' in t?t.markup:0))]];
 if(t.discount>0)summary.push(['Remise',`- ${money(t.discount)}`]);
 summary.push([`TPS (${data.tps??5} %)`,money(t.tps)],[`TVQ (${data.tvq??9.975} %)`,money(t.tvq)]);
 const boxH=40+summary.length*18+48;ensure(boxH+20);const boxBottom=y-boxH;
 page.drawRectangle({x:L,y:y-boxH,width:R-L,height:boxH,color:SOFT,borderColor:LINE,borderWidth:1});
 y-=20;draw('Résumé des coûts',L+16,11,{f:bold,color:FOREST});y-=18;
 for(const [k,v] of summary){draw(k,L+16,10,{color:MUTED});right(v,R-16,10);y-=18;}
 page.drawLine({start:{x:L+16,y:y+2},end:{x:R-16,y:y+2},thickness:1,color:LINE});y-=22;
 draw('Total',L+16,13,{f:bold,color:FOREST});right(money(t.total),R-16,14,{f:bold,color:FOREST});y=boxBottom-26;

 // ---- Line items table ----
 const header=()=>{ensure(30);page.drawRectangle({x:L,y:y-8,width:R-L,height:22,color:FOREST});const ty=y;const wl=(s:string,x:number,r=false)=>page.drawText(s,{x:r?x-width(s,8.5,bold):x,y:ty,size:8.5,font:bold,color:rgb(1,1,1)});wl('Description',L+10);if(view.quantities!==false)wl('Qté',qtyX,true);if(view.unitPrices===true||isInvoice)wl('Prix unit.',puX,true);wl('Montant',amtX-10,true);y-=24;};
 header();
 let lastSection='';
 for(const l of (data.lines||[])){
  if((l.category||l.section)&&(l.category||l.section)!==lastSection){lastSection=l.category||l.section;ensure(24);draw(String(lastSection),L+2,10.5,{f:bold,color:GOLD});y-=18;}
  const descLines=wrap(l.description||'',10,descriptionWidth,bold);
  ensure(descLines.length*14+18);
  // description (first line bold, rest normal muted)
  draw(descLines[0]||'',L+10,10,{f:bold});
  if(view.quantities!==false)fitRight(`${clean(String(l.quantity))} ${clean(l.unit||'')}`,qtyX,75,9.5,{color:MUTED});
  if(view.unitPrices===true||isInvoice)right(money(unitSale(l)),puX,9.5,{color:MUTED});
  right(money(lineSale(l)),amtX-10,10,{f:bold});
  y-=14;
  for(const dl of descLines.slice(1)){ensure(14);draw(dl,L+10,9.5,{color:MUTED});y-=13;}
  if(l.notes&&l.show_notes!==false){for(const nl of wrap(l.notes,9,descriptionWidth)){ensure(13);draw(nl,L+14,9,{color:MUTED});y-=12;}}
  page.drawLine({start:{x:L,y:y-2},end:{x:R,y:y-2},thickness:.5,color:LINE});y-=12;
 }
 y-=6;right(`Total : ${money(t.total)}`,R,13,{f:bold,color:FOREST});y-=26;

 }
 // ---- Payment schedule + validity (quotes) ----
 if((isQuote||isAgreement)&&view.payment!==false){
  const schedule=Array.isArray(data.payment_schedule)&&data.payment_schedule.length?data.payment_schedule:defaultPaymentSchedule;
  const rows=paymentRows(t.total,schedule);
  if(rows.length){ensure(30+rows.length*15);draw('Échéancier de paiement',L,11,{f:bold,color:FOREST});y-=18;
   for(const r of rows){const labels=wrap(r.label,10,puX-L-70);ensure(Math.max(20,labels.length*14+8));labels.forEach((label,index)=>page.drawText(label,{x:L+10,y:y-index*14,size:10,font,color:MUTED}));right(`${r.percent} %`,puX,10,{color:MUTED});right(money(r.amount),amtX-10,10);y-=Math.max(20,labels.length*14+8);}y-=12;}
  const validity=isQuote?(data.validity||settings.validity||defaults.validity):null;
  if(validity){ensure(20);draw(`Validité : ${validity}`,L,10,{f:bold,color:MUTED});y-=20;}
 }

 // ---- Rooms & materials ----
 if(Array.isArray(data.rooms)&&data.rooms.length){ensure(24);draw('Pièces et mesures',L,11,{f:bold,color:FOREST});y-=17;
  for(const room of data.rooms){const u=room.unit||'pi';para(`${room.name||'Pièce'} — ${Number(room.length||0)} × ${Number(room.width||0)} × ${Number(room.height||0)} ${u} · surface ${Number(room.length||0)*Number(room.width||0)} ${u}²`,L+6,9.5,R-L-6,{color:MUTED,gap:4});if(room.notes)para(room.notes,L+6,9,R-L-6,{color:MUTED,gap:4});}y-=8;}
 if(Array.isArray(data.material_selection)&&data.material_selection.length){ensure(24);draw('Matériaux sélectionnés',L,11,{f:bold,color:FOREST});y-=17;for(const m of data.material_selection)para(`• ${m.surface||''} : ${m.name||''}${m.room?` (${m.room})`:''}`,L+6,9.5,R-L-6,{color:MUTED,gap:4});y-=6;}

 // ---- Free-text sections ----
 for(const [key,label] of [['context','Contexte et besoins'],['objectives','Objectifs et résultats attendus'],['scope','Travaux prévus'],['constraints','Contraintes et accès'],['deliverables','Livrables et critères de réception'],['materials','Matériaux et finitions'],['acceptance','Critères d’acceptation'],['exclusions','Exclusions'],['timeline','Déroulement et délais'],['warranty','Garanties et réception'],['start','Début prévu'],['end','Fin prévue'],['notes','Notes'],['conditions','Conditions']] as [string,string][]) if(data[key]&&!(isAgreement&&key==='notes')&&!(['timeline','start','end'].includes(key)&&view.timeline===false)){ensure(26);draw(label,L,10.5,{f:bold,color:FOREST});y-=16;para(data[key],L,9.5,R-L,{color:MUTED,gap:5});y-=6;}
 const terms=isAgreement?data.terms:data.terms||settings.terms;
 if(terms&&view.terms!==false){ensure(26);draw('Termes et conditions',L,10.5,{f:bold,color:FOREST});y-=16;para(terms,L,8.5,R-L,{color:MUTED,gap:4});}

 // Drawn signatures remain visible on the exported document.
 const signatures=isContract?(Array.isArray(data.signatures)?data.signatures:[]):data.signature_image?[{name:data.signature_name,image:data.signature_image,signed_at:data.signed_at,role:'client'}]:[];
 if(signatures.length){ensure(34);y-=12;draw('Signatures',L,11,{f:bold,color:FOREST});y-=20;
  for(const signature of signatures){ensure(96);draw(`${signature.name||'Signataire'} · ${signature.role||''}`,L,9.5,{f:bold});y-=12;
   try{const encoded=String(signature.image||'').split(',')[1];if(encoded){const bytes=Uint8Array.from(atob(encoded),letter=>letter.charCodeAt(0));const image=await pdf.embedPng(bytes);const dimensions=image.scaleToFit(190,48);page.drawImage(image,{x:L+8,y:y-dimensions.height,width:dimensions.width,height:dimensions.height});}}catch{}
   y-=53;draw(`Enregistrée le ${signature.signed_at||'date à préciser'}`,L,8.5,{color:MUTED});y-=18;
  }
 }

 // ---- Photos ----
 if(view.attachments!==false)for(const p of photos){try{const img=p.mime==='image/png'?await pdf.embedPng(p.bytes):p.mime==='image/jpeg'?await pdf.embedJpg(p.bytes):null;if(!img)continue;const dims=img.scaleToFit(R-L,300);ensure(dims.height+24);page.drawImage(img,{x:L,y:y-dims.height,width:dims.width,height:dims.height});y-=dims.height+6;para(p.caption||'',L,9,R-L,{color:MUTED});y-=10;}catch{para('Photo non intégrable au PDF. Consultez le dossier en ligne.',L,9,R-L,{color:MUTED});}}

 return finish();

 function finish(){const pages=pdf.getPages();pages.forEach((p,i)=>{p.drawText(clean(`${settings.name||defaults.name}`),{x:L,y:34,size:8,font,color:MUTED});p.drawText(`${i+1} / ${pages.length}`,{x:R-30,y:34,size:8,font,color:MUTED});p.drawLine({start:{x:L,y:46},end:{x:R,y:46},thickness:.5,color:LINE});});return pdf.save();}
}
