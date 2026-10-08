'use client';
import {Eye,Users} from 'lucide-react';
import {Data,Profile} from '@/lib/model';

type Person=Profile&{active?:boolean;photo?:string;avatar?:string};
type Props={data:Data;client?:Data;projectId?:string|null;users:Person[];memberships:{project_id:string;user_id:string}[];isDocument?:boolean;onChange:(data:Data)=>void};
export default function SharingAccess({data,client,projectId,users,memberships,isDocument=false,onChange}:Props){
 const access=data.access||{};
 const assigned=users.filter(person=>person.role==='worker'&&person.active!==false&&memberships.some(member=>member.project_id===projectId&&member.user_id===person.id));
 const allowedWorkers:Array<string>=Array.isArray(access.workers)?access.workers:assigned.map(person=>person.id);
 const clientEnabled=isDocument?data.visibility==='client'&&access.client!==false:access.client!==false;
 const setClient=(checked:boolean)=>onChange({...data,access:{client:checked,workers:allowedWorkers},...(isDocument?{visibility:checked?'client':'internal'}:{})});
 const setWorker=(id:string,checked:boolean)=>onChange({...data,access:{client:clientEnabled,workers:checked?Array.from(new Set([...allowedWorkers,id])):allowedWorkers.filter(userId=>userId!==id)}});
 const portrait=(person:{name?:string;photo?:string;avatar?:string})=>person.photo||person.avatar?<img src={person.photo||person.avatar} alt=""/>:<span>{String(person.name||'?').split(' ').map(part=>part[0]).slice(0,2).join('')}</span>;
 return <section className="sharing-access" aria-label="Accès au dossier"><header><Users size={17}/><div><h3>Personnes associées</h3><p>Choisissez qui peut consulter cet élément.</p></div></header>
  {client&&<label className="sharing-person"><span className="sharing-avatar">{portrait(client)}</span><span><b>{client.name||'Client du dossier'}</b><small>Client concerné · {client.email||'courriel à compléter'}</small></span><input type="checkbox" checked={clientEnabled} onChange={event=>setClient(event.target.checked)} aria-label="Visible par le client"/><em><Eye size={14}/> Voir</em></label>}
  {assigned.map(person=><label className="sharing-person" key={person.id}><span className="sharing-avatar">{portrait(person)}</span><span><b>{person.name}</b><small>Prestataire associé · {person.email}</small></span><input type="checkbox" checked={allowedWorkers.includes(person.id)} onChange={event=>setWorker(person.id,event.target.checked)} aria-label={'Visible par '+person.name}/><em><Eye size={14}/> Voir</em></label>)}
  {!assigned.length&&<p className="sharing-empty">Aucun prestataire affecté à ce projet. Ajoutez-le depuis « Équipe & accès ».</p>}
 </section>;
}
