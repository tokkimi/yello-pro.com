'use client';

import {useState} from 'react';
import {ChevronRight,Download,FileText,Folder,FolderLock,MoreHorizontal,Search} from 'lucide-react';
import type {Data,RecordItem} from '@/lib/model';
import {folderContent,projectFiles,systemFolders,type FileEntry} from '@/lib/files';

type Props={projects:RecordItem[];records:RecordItem[];clients:RecordItem[];canEdit:boolean;onSave:(document:RecordItem,data:Data)=>Promise<unknown>;onDelete:(document:RecordItem)=>Promise<unknown>;onOpenRecord:(id:string)=>void};
const date=(v:string)=>v?new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short',year:'numeric'}).format(new Date(v)):'—';

/** Folder tree: All files → My projects → project → nine system folders. Files are identified by id, never by name. */
export default function FileBrowser({projects,records,clients,canEdit,onSave,onDelete,onOpenRecord}:Props){
 const [path,setPath]=useState<{projectId?:string;folder?:string}>({}),[query,setQuery]=useState(''),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[moving,setMoving]=useState<FileEntry|null>(null),[target,setTarget]=useState('');
 const project=projects.find(p=>p.id===path.projectId);
 const files=project?projectFiles(project,records):[];
 const record=(f:FileEntry)=>records.find(r=>r.id===f.recordId);
 async function act(label:string,work:()=>Promise<unknown>){setBusy(label);setMessage('');try{await work();setMessage(`${label} : fait.`)}catch(e){setMessage((e as Error).message)}finally{setBusy('')}}
 const menu=(f:FileEntry)=><details className="project-row-menu"><summary aria-label={`Actions pour ${f.name}`}><MoreHorizontal size={17}/></summary><div>
  {f.href?<a href={f.href} download>Télécharger</a>:<button type="button" onClick={()=>onOpenRecord(f.recordId)}>Ouvrir le document</button>}
  {canEdit&&f.kind==='upload'&&<button type="button" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');const doc=record(f);if(!doc)return;if(!window.confirm(f.sharedWithClient?`Retirer « ${f.name} » de l’espace client ?`:`Partager « ${f.name} » avec le client du projet ? Il pourra le consulter et le télécharger.`))return;void act('Partage',()=>onSave(doc,{...doc.data,visibility:f.sharedWithClient?'internal':'client'}))}}>{f.sharedWithClient?'Retirer du client':'Partager avec le client'}</button>}
  {canEdit&&f.movable&&<button type="button" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setMoving(f);setTarget(f.folder)}}>Déplacer dans le dossier</button>}
  {canEdit&&f.kind==='upload'&&<button type="button" className="danger" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');const doc=record(f);if(!doc)return;if(!window.confirm(`Supprimer définitivement « ${f.name} » (${date(f.updated)}) ? Les autres fichiers du même nom ne sont pas touchés.`))return;void act('Suppression',()=>onDelete(doc))}}>Supprimer</button>}
  {f.kind==='document'&&<small>Document généré : déplacement et suppression désactivés.</small>}
 </div></details>;
 const crumbs=<nav className="file-crumbs" aria-label="Fil d’Ariane"><button type="button" onClick={()=>setPath({})}>Tous les fichiers</button>{path.projectId!==undefined&&<><ChevronRight size={14}/><button type="button" onClick={()=>setPath({projectId:''})}>Mes projets</button></>}{project&&<><ChevronRight size={14}/><button type="button" onClick={()=>setPath({projectId:project.id})}>{String(project.data.title||'Projet')}</button></>}{path.folder&&<><ChevronRight size={14}/><span aria-current="page">{path.folder}</span></>}</nav>;
 let body:React.ReactNode;
 if(path.projectId===undefined){
  body=<ul className="file-list"><li><button type="button" className="file-folder" onClick={()=>setPath({projectId:''})}><FolderLock size={18}/><b>Mes projets</b><small>{projects.length} dossier(s) · dossier système</small></button></li></ul>;
 }else if(!project){
  const shown=projects.filter(p=>`${p.data.title||''} ${p.data.number||''}`.toLowerCase().includes(query.toLowerCase()));
  body=<><label className="module-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un projet" aria-label="Rechercher un dossier projet"/></label><ul className="file-list">{shown.map(p=>{const count=projectFiles(p,records).length;return <li key={p.id}><button type="button" className="file-folder" onClick={()=>{setPath({projectId:p.id});setQuery('')}}><Folder size={18}/><b>{String(p.data.number?`${p.data.number} · `:'')}{String(p.data.title||'Projet')}</b><small>{count} fichier(s) · {clients.find(c=>c.id===p.client_id)?.data.name||'Client à préciser'} · {date(p.updated_at)}</small></button></li>})}</ul></>;
 }else if(!path.folder){
  body=<ul className="file-list">{[...systemFolders,'Autres fichiers'].map(folder=><li key={folder}><button type="button" className="file-folder" onClick={()=>setPath({projectId:project.id,folder})}><FolderLock size={18}/><b>{folder}</b><small>{folderContent(files,folder).length} fichier(s){folder==='Partagé avec le client'?' · tout ce que le client peut voir dans son espace':''}</small></button></li>)}</ul>;
 }else{
  const content=folderContent(files,path.folder).filter(f=>f.name.toLowerCase().includes(query.toLowerCase()));
  body=<>{content.length?<div className="vendor-table" role="region" aria-label={path.folder} tabIndex={0}><table><thead><tr><th>Nom</th><th>Dernière mise à jour</th><th>Téléversé par</th><th>Type</th><th>Client</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{content.map(f=><tr key={f.id}><th scope="row"><span className="directory-name"><FileText size={16}/>{f.name}</span></th><td>{date(f.updated)}</td><td>{f.author}</td><td>{f.type}</td><td>{f.sharedWithClient?'Partagé':'Interne'}</td><td>{menu(f)}</td></tr>)}</tbody></table></div>:<div className="portal-empty"><p>Ce dossier est vide.</p></div>}</>;
 }
 return <section className="panel file-browser">
  <div className="module-section-heading"><div><h2>Fichiers</h2><p>Dossiers système par projet. Ajoutez des fichiers depuis le projet ou une visite ; ils se classent ici sans publication automatique.</p></div>{project&&<a className="btn secondary" href="#" onClick={e=>{e.preventDefault();files.filter(f=>f.href).forEach((f,i)=>setTimeout(()=>{const a=document.createElement('a');a.href=f.href!;a.download='';a.click()},i*400))}}><Download size={15}/>Télécharger les fichiers téléversés</a>}</div>
  {crumbs}
  {message&&<p role="status" className="muted">{message}</p>}
  {busy&&<p role="status">{busy}…</p>}
  {moving&&<div className="filter-drawer" role="dialog" aria-label="Déplacer le fichier"><h3>Déplacer « {moving.name} »</h3><label>Dossier de destination<select value={target} onChange={e=>setTarget(e.target.value)}>{[...systemFolders.filter(f=>f!=='Partagé avec le client'),'Autres fichiers'].map(f=><option key={f}>{f}</option>)}</select></label><p className="muted">Le partage avec le client ne change pas : utilisez « Partager avec le client » pour cela.</p><div className="module-actions"><button className="btn secondary" onClick={()=>setMoving(null)}>Annuler</button><button className="btn primary" disabled={target===moving.folder} onClick={()=>{const doc=record(moving);if(!doc)return;void act('Déplacement',()=>onSave(doc,{...doc.data,folder:target}));setMoving(null)}}>Confirmer</button></div></div>}
  {body}
 </section>;
}
