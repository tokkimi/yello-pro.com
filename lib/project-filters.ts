/** Date presets of the advanced project filters (same eight choices as the reference screen). */
export const datePresets=['7 derniers jours','4 dernières semaines','3 derniers mois','12 derniers mois','Mois à ce jour','Trimestre à ce jour','Année en cours','Dates choisies'] as const;
export type DatePreset=typeof datePresets[number];
export type DateFilter={preset:DatePreset|'';from:string;to:string};
const iso=(d:Date)=>d.toISOString().slice(0,10);
const at=(value:string)=>new Date(value+'T12:00:00Z');
export function presetRange(preset:DatePreset|'',today:string,custom:{from:string;to:string}={from:'',to:''}):{from:string;to:string}{
 const t=at(today),y=t.getUTCFullYear(),m=t.getUTCMonth();
 const back=(days:number)=>{const d=at(today);d.setUTCDate(d.getUTCDate()-days);return iso(d)};
 const monthsBack=(n:number)=>{const d=at(today);d.setUTCMonth(d.getUTCMonth()-n);return iso(d)};
 switch(preset){
  case '7 derniers jours':return {from:back(6),to:today};
  case '4 dernières semaines':return {from:back(27),to:today};
  case '3 derniers mois':return {from:monthsBack(3),to:today};
  case '12 derniers mois':return {from:monthsBack(12),to:today};
  case 'Mois à ce jour':return {from:iso(new Date(Date.UTC(y,m,1,12))),to:today};
  case 'Trimestre à ce jour':return {from:iso(new Date(Date.UTC(y,m-m%3,1,12))),to:today};
  case 'Année en cours':return {from:`${y}-01-01`,to:today};
  case 'Dates choisies':return {from:custom.from,to:custom.to};
  default:return {from:'',to:''};
 }
}
export function inRange(value:unknown,range:{from:string;to:string}){
 const date=String(value||'').slice(0,10);
 if(!range.from&&!range.to)return true;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
 return (!range.from||date>=range.from)&&(!range.to||date<=range.to);
}
/** "0 résultat" instead of the inconsistent "1 à 20 sur 0" observed in the reference. */
export function resultLabel(total:number,page:number,size:number){if(!total)return '0 résultat';const first=(page-1)*size+1,last=Math.min(total,page*size);return `${first} à ${last} sur ${total} résultat${total>1?'s':''}`}
export function csvCell(value:unknown){return '"'+String(value??'').replace(/^([\s]*[=+@-])/,"'$1").replaceAll('"','""')+'"'}
