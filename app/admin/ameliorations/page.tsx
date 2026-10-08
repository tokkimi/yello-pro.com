import Link from 'next/link';
import {redirect} from 'next/navigation';
import {identity} from '@/lib/supabase';
import audit from '@/docs/mgpro-improvements.json';

export const metadata={title:'Suivi des améliorations Yello Pro',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function Page(){
 const user=await identity();
 if(!user)redirect('/connexion');
 if(user.role!=='admin')redirect('/compte');
 return <main className="improvement-report"><Link href="/admin">← Retour à l’administration</Link><header><p>MISE À JOUR · {audit.updated}</p><h1>{audit.title}</h1><p>{audit.notice}</p></header><section><h2>Livré dans cette mise à jour</h2><ul>{audit.delivered.map(item=><li key={item}>{item}</li>)}</ul><h2>Limites encore ouvertes</h2><ul>{audit.limits.map(item=><li key={item}>{item}</li>)}</ul></section><div className="improvement-legend"><span>P0 · Fiabilité et blocages</span><span>P1 · Parcours métier</span><span>P2 · Intégrations et migration</span></div>{audit.modules.map(module=><details key={module.id} open={module.priority==='P0'}><summary><span>{module.priority}</span><strong>{module.title}</strong><small>{module.status}</small></summary><ul>{module.items.map(item=><li key={item}>{item}</li>)}</ul></details>)}</main>;
}
