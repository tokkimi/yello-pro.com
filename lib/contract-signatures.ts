import type {Data,RecordItem} from './model';

export function signatureInput(data:Record<string,unknown>){
 const name=String(data.signature_name||'').trim(),image=String(data.signature_image||'');
 if(data.signature_consent!==true||name.length<2||name.length>120||image.length>300000||!/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(image))return null;
 return {name,image};
}

export function applyContractSignature(old:RecordItem,user:{id:string;name:string;role:string},input:Record<string,unknown>):Data|null{
 const signature=signatureInput(input);
 if(!signature||!['Envoyé','Signé'].includes(String(old.data.status)))return null;
 const signatures=Array.isArray(old.data.signatures)?old.data.signatures:[];
 if(signatures.some((item:any)=>item.user_id===user.id))return null;
 const next=[...signatures,{...signature,user_id:user.id,role:user.role,signed_at:new Date().toISOString()}];
 const partyRole=old.data.partner_id?'worker':'client';
 return {...old.data,signatures:next,status:next.some((item:any)=>item.role==='admin')&&next.some((item:any)=>item.role===partyRole)?'Signé':'Envoyé'};
}
