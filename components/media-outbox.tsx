 'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {mediaKeys,mediaStore} from '@/lib/local-media';
import type {RecordItem} from '@/lib/model';
type Item={id:string;parent:string;file:File;visibility:string;caption:string;transcript:string;duration:number};
async function uploadFile(file:File):Promise<File>{
 if(file.size<=10*1024*1024)return file;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Le fichier dépasse 4 Mo. Choisissez une version plus légère.');
 const bitmap=await createImageBitmap(file);try{const ratio=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);const ctx=canvas.getContext('2d');if(!ctx)throw Error('Préparation de la photo impossible.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Compression impossible.')),'image/jpeg',.88));if(blob.size>4*1024*1024)throw Error('Cette photo reste trop volumineuse.');return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'})}finally{bitmap.close()}
}
export function useMediaOutbox(userId:string,onUploaded:(r:RecordItem)=>void){
 const prefix=`outbox-${userId}-`;const running=useRef(false);const callback=useRef(onUploaded);callback.current=onUploaded;const [pending,setPending]=useState(0),[message,setMessage]=useState('');
 const sync=useCallback(async()=>{if(running.current)return;running.current=true;try{const keys=await mediaKeys(prefix);setPending(keys.length);if(!navigator.onLine){if(keys.length)setMessage('Hors connexion : fichiers conservés sur cet appareil.');return}for(const key of keys){const item=await mediaStore<Item>(key);if(!item)continue;const form=new FormData();const prepared=await uploadFile(item.file);form.set('file',prepared,prepared.name);form.set('upload_id',item.id);form.set('parent_id',item.parent);form.set('visibility',item.visibility);form.set('caption',item.caption);form.set('transcript',item.transcript);form.set('duration',String(item.duration));const r=await fetch('/api/documents',{method:'POST',body:form});const data=await r.json();if(!r.ok)throw Error(data.error||'Transfert interrompu.');callback.current(data.record);await mediaStore(key,undefined,true);setPending(n=>Math.max(0,n-1))}setMessage('Tous les fichiers ont été transférés.')}catch(e){setMessage(`${(e as Error).message} Les fichiers restent sur cet appareil.`)}finally{running.current=false}},[prefix]);
 useEffect(()=>{sync();window.addEventListener('online',sync);const timer=setInterval(sync,30000);return()=>{window.removeEventListener('online',sync);clearInterval(timer)}},[sync]);
 async function enqueue(parent:RecordItem,file:File,visibility='internal',caption='',transcript='',duration=0){if(file.size>10*1024*1024)throw Error('Choisissez un fichier de moins de 10 Mo.');const id=crypto.randomUUID();await mediaStore(prefix+id,{id,parent:parent.id,file,visibility,caption,transcript,duration});setPending(n=>n+1);setMessage('Fichier sauvegardé sur cet appareil, transfert en cours…');void sync()}
 return {enqueue,pending,message,sync};
}
