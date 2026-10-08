/*
 * Unified directory: clients (records), professionals without software access (settings.directory),
 * employees/subcontractors and administrators (profiles). Presence is never simulated.
 */
export type DirectoryKind='client'|'professional'|'employee'|'administrator';
export type DirectoryEntry={id:string;kind:DirectoryKind;name:string;email:string;phone:string;company:string;trade:string;address:string;archived:boolean;photo?:string;projects?:number;source:'record'|'directory'|'profile'};
export type Professional={id:string;name:string;email:string;phone:string;company:string;trade:string;address:string;notes:string;archived:boolean};

const text=(v:unknown,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
export function professionalsFrom(value:unknown):Professional[]{
 return Array.isArray(value)?value.filter(x=>x&&typeof x==='object').map((x:any)=>({id:text(x.id,60)||crypto.randomUUID(),name:text(x.name),email:text(x.email).toLowerCase(),phone:text(x.phone,40),company:text(x.company),trade:text(x.trade,80),address:text(x.address,300),notes:text(x.notes,2000),archived:x.archived===true})):[];
}
export const normalEmail=(v:string)=>v.trim().toLowerCase();
export const normalPhone=(v:string)=>{const digits=v.replace(/\D/g,'');return digits.length===11&&digits.startsWith('1')?digits.slice(1):digits};
export const normalName=(v:string)=>v.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const validEmail=(v:string)=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Groups of entries that look like the same person: same e-mail, same phone (≥ 10 digits) or same full name + company. */
export function duplicateGroups(entries:DirectoryEntry[]){
 const parent=new Map<string,string>();const find=(id:string):string=>{const p=parent.get(id)||id;if(p===id)return id;const r=find(p);parent.set(id,r);return r};const join=(a:string,b:string)=>{const ra=find(a),rb=find(b);if(ra!==rb)parent.set(ra,rb)};
 const seen=new Map<string,string>();const reason=new Map<string,Set<string>>();
 for(const e of entries){
  const keys:[string,string][]=[];
  if(e.email)keys.push(['email:'+normalEmail(e.email),'même courriel']);
  const phone=normalPhone(e.phone);if(phone.length>=10)keys.push(['phone:'+phone,'même téléphone']);
  const name=normalName(e.name);if(name.split(' ').length>=2)keys.push(['name:'+name+'|'+normalName(e.company),'même nom']);
  for(const [key,label] of keys){const other=seen.get(key);if(other){join(e.id,other);reason.set(e.id,(reason.get(e.id)||new Set()).add(label));reason.set(other,(reason.get(other)||new Set()).add(label))}else seen.set(key,e.id)}
 }
 const groups=new Map<string,DirectoryEntry[]>();
 for(const e of entries){const root=find(e.id);if(!groups.has(root))groups.set(root,[]);groups.get(root)!.push(e)}
 return [...groups.values()].filter(g=>g.length>1).map(group=>({entries:group,reasons:[...new Set(group.flatMap(e=>[...(reason.get(e.id)||[])]))]}));
}

/** Minimal RFC 4180 parser accepting ; or , as separator and a UTF-8 BOM. */
export function parseCsv(input:string){
 const source=input.replace(/^﻿/,'');
 const firstLine=source.split(/\r?\n/,1)[0]||'';
 const sep=(firstLine.match(/;/g)||[]).length>=(firstLine.match(/,/g)||[]).length?';':',';
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<source.length;i++){
  const c=source[i];
  if(quoted){if(c==='"'){if(source[i+1]==='"'){cell+='"';i++}else quoted=false}else cell+=c;continue}
  if(c==='"')quoted=true;else if(c===sep){row.push(cell);cell=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&source[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=c;
 }
 if(cell||row.length){row.push(cell);rows.push(row)}
 return rows.filter(r=>r.some(x=>x.trim()));
}
const headerMap:Record<string,keyof Professional>={nom:'name',name:'name',courriel:'email',email:'email','e-mail':'email',telephone:'phone','téléphone':'phone',phone:'phone',entreprise:'company',company:'company',metier:'trade','métier':'trade',trade:'trade',adresse:'address',address:'address',notes:'notes'};
export type ImportPreview={valid:Omit<Professional,'id'|'archived'>[];invalid:{line:number;errors:string[]}[];duplicates:{line:number;match:string}[]};
/** Validate an import before anything is written. Rows matching an existing entry are reported, not merged silently. */
export function previewImport(csv:string,existing:DirectoryEntry[]):ImportPreview{
 const rows=parseCsv(csv);if(!rows.length)return {valid:[],invalid:[{line:1,errors:['Fichier vide.']}],duplicates:[]};
 const header=rows[0].map(h=>headerMap[normalName(h).replace(/ /g,'')]||headerMap[h.trim().toLowerCase()]);
 if(!header.includes('name'))return {valid:[],invalid:[{line:1,errors:['Colonne « Nom » introuvable dans l’en-tête.']}],duplicates:[]};
 if(rows.length>2001)return {valid:[],invalid:[{line:1,errors:['Import limité à 2 000 lignes par fichier.']}],duplicates:[]};
 const result:ImportPreview={valid:[],invalid:[],duplicates:[]};
 const emails=new Map(existing.filter(e=>e.email).map(e=>[normalEmail(e.email),e.name]));const phones=new Map(existing.filter(e=>normalPhone(e.phone).length>=10).map(e=>[normalPhone(e.phone),e.name]));
 rows.slice(1).forEach((cells,index)=>{
  const line=index+2;const value:Record<string,string>={};header.forEach((key,i)=>{if(key)value[key]=(cells[i]||'').trim()});
  const entry={name:value.name||'',email:normalEmail(value.email||''),phone:value.phone||'',company:value.company||'',trade:value.trade||'',address:value.address||'',notes:value.notes||''};
  const errors=[!entry.name&&'Nom manquant.',!validEmail(entry.email)&&`Courriel invalide : ${entry.email}.`,entry.name.length>200&&'Nom trop long.'].filter(Boolean) as string[];
  if(errors.length){result.invalid.push({line,errors});return}
  const match=(entry.email&&emails.get(entry.email))||(normalPhone(entry.phone).length>=10&&phones.get(normalPhone(entry.phone)));
  if(match){result.duplicates.push({line,match:String(match)});return}
  if(entry.email)emails.set(entry.email,entry.name);if(normalPhone(entry.phone).length>=10)phones.set(normalPhone(entry.phone),entry.name);
  result.valid.push(entry);
 });
 return result;
}
export function directoryCsv(entries:DirectoryEntry[]){
 const cell=(v:unknown)=>'"'+String(v??'').replace(/^([\s]*[=+@-])/,"'$1").replaceAll('"','""')+'"';
 const labels:Record<DirectoryKind,string>={client:'Client',professional:'Professionnel',employee:'Employé / prestataire',administrator:'Administrateur'};
 return '﻿'+[['Type','Nom','Courriel','Téléphone','Entreprise','Métier','Adresse','Archivé'],...entries.map(e=>[labels[e.kind],e.name,e.email,e.phone,e.company,e.trade,e.address,e.archived?'Oui':'Non'])].map(r=>r.map(cell).join(';')).join('\r\n');
}
