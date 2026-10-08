import fs from 'node:fs';
import pg from 'pg';
process.loadEnvFile('.env.local');
const url=new URL(process.env.POSTGRES_URL_NON_POOLING||process.env.POSTGRES_URL);url.searchParams.delete('sslmode');
const client=new pg.Client({connectionString:url.toString(),ssl:{rejectUnauthorized:true,ca:fs.readFileSync('scripts/supabase-ca.crt','utf8')}});
try{await client.connect();await client.query('begin');await client.query('create table if not exists public.mgpro_migrations(name text primary key, applied_at timestamptz default now())');for(const name of fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort()){const {rowCount}=await client.query('select name from public.mgpro_migrations where name=$1',[name]);if(rowCount)continue;await client.query(fs.readFileSync('supabase/migrations/'+name,'utf8'));await client.query('insert into public.mgpro_migrations(name) values($1)',[name]);console.log('Applied '+name)}await client.query('commit');console.log('Database ready');}catch(e){await client.query('rollback').catch(()=>{});console.error(e.message);process.exitCode=1;}finally{await client.end()}
