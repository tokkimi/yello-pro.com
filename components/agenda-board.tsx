'use client';

import {CalendarDays,ChevronLeft,ChevronRight,FolderKanban,Plus,Users} from 'lucide-react';
import {useMemo,useState,type CSSProperties} from 'react';

export type AgendaEvent={id:string;date:string;title:string;client:string;status:string;provider:string;color:string;time:string;project?:string};
export type AgendaContact={id:string;name:string;role:string;detail:string;photo?:string;kind:'client'|'partner'};

type Props={events:AgendaEvent[];contacts:AgendaContact[];onCreate:(date:string)=>void;onOpen:(id:string)=>void;onOpenContact:(id:string)=>void};

const weekdays=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const dateKey=(day:Date)=>new Date(day.getTime()-day.getTimezoneOffset()*60000).toISOString().slice(0,10);
const initials=(name:string)=>name.split(' ').filter(Boolean).map(part=>part[0]).slice(0,2).join('').toUpperCase()||'?';

export default function AgendaBoard({events,contacts,onCreate,onOpen,onOpenContact}:Props){
 const [mode,setMode]=useState<'month'|'week'|'planning'>('month');
 const [month,setMonth]=useState(()=>new Date());
 const [dependencies,setDependencies]=useState(true);
 const [workdays,setWorkdays]=useState(true);
 const today=dateKey(new Date());
 const [selectedDate,setSelectedDate]=useState(today);
 const selectedEvents=events.filter(event=>event.date===selectedDate);
 const period=useMemo(()=>new Intl.DateTimeFormat('fr-CA',{month:'long',year:'numeric'}).format(month),[month]);
 const offset=(new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7;
 const cells=Array.from({length:42},(_,index)=>new Date(month.getFullYear(),month.getMonth(),index-offset+1));
 const weekStart=new Date(month);weekStart.setDate(month.getDate()-((month.getDay()+6)%7));
 const week=Array.from({length:7},(_,index)=>{const day=new Date(weekStart);day.setDate(weekStart.getDate()+index);return day});
 const planDays=Array.from({length:workdays?15:21},(_,index)=>{const day=new Date(month);day.setDate(month.getDate()+index);return day}).filter(day=>!workdays||![0,6].includes(day.getDay()));
 const forDay=(day:Date)=>events.filter(event=>event.date===dateKey(day));
 const dateLabel=(day:Date)=>new Intl.DateTimeFormat('fr-CA',{weekday:'short',day:'numeric'}).format(day);
 const navigate=(amount:number)=>setMonth(current=>mode==='month'?new Date(current.getFullYear(),current.getMonth()+amount,1):new Date(current.getFullYear(),current.getMonth(),current.getDate()+amount*(mode==='week'?7:14)));
 const goToday=()=>{setMonth(new Date());setSelectedDate(today)};
 const chooseDay=(date:string)=>{if(window.matchMedia('(max-width:680px)').matches)setSelectedDate(date);else onCreate(date)};
 return <section className="panel agenda-panel agenda-board">
  <div className="agenda-board-toolbar">
   <div className="agenda-view-switch" aria-label="Mode d’affichage">{[['month','Mois'],['week','Semaine'],['planning','Planning']].map(([key,label])=><button type="button" key={key} className={mode===key?'active':''} onClick={()=>setMode(key as typeof mode)}>{key==='planning'?<FolderKanban size={15}/>:<CalendarDays size={15}/>} {label}</button>)}</div>
   <div className="agenda-options"><label><input type="checkbox" checked={dependencies} onChange={event=>setDependencies(event.target.checked)}/><i/>Afficher dépendances</label><label><input type="checkbox" checked={workdays} onChange={event=>setWorkdays(event.target.checked)}/><i/>Jours ouvrés</label></div>
   <div className="agenda-navigation"><button type="button" className="btn secondary" onClick={goToday}>Aujourd’hui</button><span><button type="button" className="icon-button" aria-label="Période précédente" onClick={()=>navigate(-1)}><ChevronLeft size={18}/></button><button type="button" className="icon-button" aria-label="Période suivante" onClick={()=>navigate(1)}><ChevronRight size={18}/></button></span><button type="button" className="btn primary" onClick={()=>onCreate(today)}><Plus size={17}/>Activité</button></div>
  </div>
  <div className="agenda-board-heading"><div><p className="eyebrow">PLANIFICATION DU CHANTIER</p><h2>{mode==='planning'?'Planning des activités':mode==='week'?'Semaine de travail':'Agenda des visites'}</h2><small>{events.length} activité{events.length>1?'s':''} · cliquez sur une date pour en ajouter une</small></div><strong>{period}</strong></div>
  <div className="agenda-board-layout">
   <div className={'agenda-board-content mode-'+mode}>
    {mode==='month'&&<section className="agenda-mobile-day" aria-label="Activités du jour sélectionné"><header><h3>{new Intl.DateTimeFormat('fr-CA',{weekday:'long',day:'numeric',month:'long'}).format(new Date(selectedDate+'T12:00:00'))}</h3><button type="button" className="btn secondary" onClick={()=>onCreate(selectedDate)}><Plus size={15}/>Ajouter</button></header>{selectedEvents.map(item=><button type="button" className="agenda-mobile-event" key={item.id} onClick={()=>onOpen(item.id)} style={{'--event-color':item.color} as CSSProperties}><time>{item.time||'À confirmer'}</time><strong>{item.title}</strong><span>{item.client} · {item.provider}</span><small>{item.status}</small></button>)}{!selectedEvents.length&&<p>Aucune activité ce jour.</p>}</section>}
    {mode==='planning'&&<section className="agenda-mobile-planning" aria-label="Planning des activités sur mobile">{events.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).map(item=><button type="button" className="agenda-mobile-event" key={item.id} onClick={()=>onOpen(item.id)} style={{'--event-color':item.color} as CSSProperties}><time>{new Intl.DateTimeFormat('fr-CA',{day:'numeric',month:'short',year:'numeric'}).format(new Date(item.date+'T12:00:00'))} · {item.time||'À confirmer'}</time><strong>{item.title}</strong><span>{item.client} · {item.provider}</span><small>{item.status}</small></button>)}{!events.length&&<p>Aucune activité planifiée.</p>}</section>}
    {mode==='month'&&<><div className="agenda-weekdays">{weekdays.map(day=><span key={day}>{day}</span>)}</div><div className="agenda-grid">{cells.map(day=>{const date=dateKey(day),items=forDay(day),weekend=[0,6].includes(day.getDay());return <button type="button" key={date} className={'agenda-day '+(day.getMonth()===month.getMonth()?'':'outside ') +(date===today?'today ':'')+(weekend?'weekend ':'')+(date===selectedDate?'selected ':'')} onClick={()=>chooseDay(date)}><time dateTime={date}>{day.getDate()}</time>{items.length>0&&<span className="agenda-day-count" aria-label={`${items.length} activités`}>{items.length}</span>}{items.slice(0,3).map(item=><span key={item.id} className="agenda-event" style={{'--event-color':item.color} as CSSProperties} onClick={event=>{event.stopPropagation();onOpen(item.id)}}><b>{item.time||'À confirmer'}</b><span>{item.title}</span><small>{item.provider}</small></span>)}{items.length>3&&<small className="agenda-more">+{items.length-3} activité(s)</small>}</button>})}</div></>}
    {mode==='week'&&<div className="agenda-week-view">{week.filter(day=>!workdays||![0,6].includes(day.getDay())).map(day=>{const items=forDay(day);return <section key={dateKey(day)} className={dateKey(day)===today?'today':''}><header><b>{dateLabel(day)}</b><button type="button" onClick={()=>onCreate(dateKey(day))}><Plus size={14}/></button></header>{items.map(item=><button key={item.id} className="agenda-week-event" style={{'--event-color':item.color} as CSSProperties} onClick={()=>onOpen(item.id)}><small>{item.time||'À confirmer'}</small><b>{item.title}</b><span>{item.client}</span></button>)}{!items.length&&<button className="agenda-week-empty" onClick={()=>onCreate(dateKey(day))}>Ajouter une activité</button>}</section>})}</div>}
    {mode==='planning'&&<div className="agenda-planning-scroll"><div className="agenda-planning" style={{'--day-count':planDays.length} as CSSProperties}><div className="agenda-planning-head"><span>Activités</span><div>{planDays.map(day=><time key={dateKey(day)} className={dateKey(day)===today?'today':''}>{day.getDate()}</time>)}</div></div>{events.slice().sort((a,b)=>a.date.localeCompare(b.date)).map((item,index)=>{const dayIndex=Math.max(0,planDays.findIndex(day=>dateKey(day)>=item.date));return <div className="agenda-planning-row" key={item.id}><button onClick={()=>onOpen(item.id)}><span className="contact-avatar tiny">{initials(item.client)}</span><span><b>{item.title}</b><small>{item.client} · {item.provider}</small></span></button><div className="planning-track">{dependencies&&index>0&&<i className="planning-dependency"/>}<button className="planning-bar" style={{gridColumn:`${Math.min(dayIndex+1,planDays.length)} / span ${Math.min(3,planDays.length-dayIndex)}`,background:item.color}} onClick={()=>onOpen(item.id)}>{item.time||'Planifié'}</button></div></div>})}{!events.length&&<div className="agenda-planning-empty"><CalendarDays size={24}/><p>Ajoutez une activité pour construire le planning du chantier.</p><button className="btn secondary" onClick={()=>onCreate(today)}><Plus size={16}/>Ajouter une activité</button></div>}</div></div>}
   </div>
   <aside className="agenda-contact-rail"><header><div><p className="eyebrow">CONTACTS DU DOSSIER</p><h3>Clients & prestataires</h3></div><Users size={18}/></header><div className="agenda-contact-tabs"><span>{contacts.filter(contact=>contact.kind==='client').length} clients</span><span>{contacts.filter(contact=>contact.kind==='partner').length} prestataires</span></div>{contacts.map(contact=><button key={contact.id} className="agenda-contact" onClick={()=>onOpenContact(contact.id)}><span className="contact-avatar">{contact.photo?<img src={contact.photo} alt=""/>:initials(contact.name)}</span><span><b>{contact.name}</b><small>{contact.role}</small><em>{contact.detail}</em></span></button>)}{!contacts.length&&<p className="muted">Les contacts liés aux dossiers apparaîtront ici.</p>}</aside>
  </div>
 </section>;
}
