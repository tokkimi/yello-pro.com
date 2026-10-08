import {readFileSync} from 'node:fs';
import {demoRecords} from '../lib/demo';

const values=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>line.includes('=')).map(line=>{const index=line.indexOf('=');return [line.slice(0,index),line.slice(index+1).trim().replace(/^['"]|['"]$/g,'')]}));
const url=values.NEXT_PUBLIC_SUPABASE_URL;
const key=values.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('La configuration Supabase est absente.');
const rows=demoRecords.filter(row=>row.kind!=='settings').map(({id,kind,data,client_id,project_id,version,created_at,updated_at})=>({id,kind,data,client_id,project_id,version,created_at,updated_at}));
const response=await fetch(url+'/rest/v1/records?on_conflict=id',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'resolution=ignore-duplicates,return=representation','Content-Type':'application/json'},body:JSON.stringify(rows)});
if(!response.ok)throw new Error('Import impossible : '+response.status+' '+await response.text());
const inserted=await response.json() as {id:string}[];
console.log(JSON.stringify({requested:rows.length,inserted:inserted.length},null,2));
