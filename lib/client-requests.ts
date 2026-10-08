import type {Data} from './model';
export type ClientRequest={id:string;title:string;description:string;status:'Nouvelle'|'En étude'|'Acceptée'|'Refusée'|'Réalisée';createdAt:string;author:string;response:string};
export const requestStatuses=['Nouvelle','En étude','Acceptée','Refusée','Réalisée'] as const;
export function clientRequestsFrom(value:unknown):ClientRequest[]{return Array.isArray(value)?value.filter(x=>x&&typeof x==='object').map((x:Data)=>({id:String(x.id),title:String(x.title||'').slice(0,160),description:String(x.description||'').slice(0,4000),status:(requestStatuses as readonly string[]).includes(x.status)?x.status:'Nouvelle',createdAt:String(x.createdAt||''),author:String(x.author||'').slice(0,120),response:String(x.response||'').slice(0,4000)})):[]}
