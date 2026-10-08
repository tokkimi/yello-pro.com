import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');
const base=process.env.SMOKE_URL||'http://localhost:3000';
const access=fs.readFileSync('.owner-access.txt','utf8');
const email=access.match(/Courriel : (.+)/)[1].trim();const password=access.match(/Mot de passe : (.+)/)[1].trim();
const supa=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ids=[];let cookie='';
async function call(path,data){const r=await fetch(base+path,{method:data?'POST':'GET',headers:{origin:base,...(data?{'content-type':'application/json'}:{}),cookie},...(data?{body:JSON.stringify(data)}:{})});return r}
try{
assert.equal((await call('/api/records')).status,401);
const login=await call('/api/auth',{email,password});assert.equal(login.status,200);cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');assert(cookie);
let r=await call('/api/records');assert.equal(r.status,200);assert.equal((await r.json()).user.role,'admin');console.log('PASS protected access and owner login');
r=await call('/api/requests',{name:'TEST MGPRO VERIFICATION',email:'verification@example.invalid',phone:'5145550100',address:'Adresse de vérification',service:'Cuisine',budget:'À définir',timeline:'À définir',description:'Demande technique de vérification temporaire',consent:true,website:''});assert.equal(r.status,200);ids.push((await r.json()).id);
r=await call('/api/records');assert((await r.json()).records.some(x=>x.id===ids[0]));console.log('PASS request submission visible in admin');
r=await call('/api/records',{kind:'client',data:{name:'TEST MGPRO VERIFICATION',email:'verification@example.invalid'}});assert.equal(r.status,200);const client=(await r.json()).record;ids.push(client.id);
r=await call('/api/records',{kind:'quote',client_id:client.id,data:{number:'TEST-VERIFY',status:'Brouillon',lines:[{description:'Vérification temporaire',quantity:2,price:100,unit:'unité'}],tps:5,tvq:9.975}});assert.equal(r.status,200);const quote=(await r.json()).record;ids.push(quote.id);assert.equal(quote.data.totals.total,229.95);
r=await call('/api/pdf?id='+quote.id);assert.equal(r.status,200);assert((await r.arrayBuffer()).byteLength>1000);console.log('PASS quote creation, taxes and PDF');
r=await call('/api/records',{...quote,data:{...quote.data,notes:'Vérification de version'},version:0});assert.equal(r.status,409);console.log('PASS concurrent modification protection');
}finally{if(ids.length){await supa.from('audit_log').delete().in('record_id',ids);const result=await supa.from('records').delete().in('id',ids);if(result.error)throw result.error;}console.log('Temporary test records removed');}
