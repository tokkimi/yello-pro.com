import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
let id;let docs=[];
try {
 const f=new FormData();f.set('data',JSON.stringify({name:'TEST PHOTO MGPRO',email:'test@example.invalid',phone:'5145550100',address:'Adresse de vérification',service:'Cuisine',budget:'À définir',timeline:'À définir',description:'Vérification temporaire du formulaire avec photo',consent:true,website:''}));f.append('photos',new Blob([fs.readFileSync('public/images/logo-mgpro-v2.png')],{type:'image/png'}),'verification.png');
 const r=await fetch('http://localhost:3000/api/requests',{method:'POST',headers:{origin:'http://localhost:3000'},body:f});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));id=data.id;assert.equal(data.photoCount,1);
 const result=await db.from('records').select('*').eq('kind','document').eq('data->>parent_id',id);docs=result.data||[];assert.equal(docs.length,1);assert.equal(docs[0].data.visibility,'internal');
 assert.equal((await fetch('http://localhost:3000/api/documents?id='+docs[0].id,{redirect:'manual'})).status,401);console.log('PASS multipart request, private photo storage, anonymous download denied');
}finally{if(docs.length){await db.storage.from('documents').remove(docs.map(d=>d.data.path));await db.from('records').delete().in('id',docs.map(d=>d.id))}if(id)await db.from('records').delete().eq('id',id);console.log('Test data cleaned')}
