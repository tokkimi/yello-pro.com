import Decimal from 'decimal.js';
import {Data,RecordItem,money} from './model';
export function accountingReport(rows:RecordItem[],from='',to='9999-12-31'){
 const journals=rows.filter(r=>r.kind==='journal'&&String(r.data.date||r.created_at.slice(0,10))<=to).sort((a,b)=>String(a.data.date).localeCompare(String(b.data.date)));
 const movement:Record<string,Decimal>={},closing:Record<string,Decimal>={};
 const period=journals.filter(r=>String(r.data.date||r.created_at.slice(0,10))>=from);
 for(const r of journals)for(const e of r.data.entries||[]){const delta=new Decimal(e.debit||0).minus(e.credit||0);closing[e.account]=(closing[e.account]||new Decimal(0)).plus(delta);if(period.includes(r))movement[e.account]=(movement[e.account]||new Decimal(0)).plus(delta);}
 const numeric=(v:Record<string,Decimal>)=>Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,n])=>[k,n.toDecimalPlaces(2).toNumber()]));
 const balance=numeric(closing),activity=numeric(movement);
 const sum=(prefix:string[],factor=1)=>Object.entries(activity).filter(([k])=>prefix.some(p=>k.startsWith(p))).reduce((n,[,v])=>n.plus(new Decimal(v).times(factor)),new Decimal(0)).toNumber();
 const revenue=sum(['4'],-1),costs=sum(['5','6']),result=new Decimal(revenue).minus(costs).toNumber();
 const reportLines=[`Période : ${from||'origine'} au ${to==='9999-12-31'?'aujourd’hui':to}`,'Résultat de la période',`Revenus : ${money(revenue)}`,`Charges : ${money(costs)}`,`Résultat : ${money(result)}`,'Situation des comptes à la fin de période',...Object.entries(balance).map(([a,v])=>`${a} | Débit ${money(Math.max(v,0))} | Crédit ${money(Math.max(-v,0))}`),'Mouvements de taxes de la période',...Object.entries(activity).filter(([a])=>/^(1200|1210|2100|2110)/.test(a)).map(([a,v])=>`${a} : ${money(v)}`),'Journal de la période',...period.flatMap(r=>[`${r.data.date} | ${r.data.title} | ${r.data.reference||''}`,...(r.data.entries||[]).map((e:Data)=>`${e.account} | Débit ${money(e.debit)} | Crédit ${money(e.credit)}`)])];
 return {balance,activity,revenue,costs,result,journals:period,reportLines};
}
export function journalCsv(rows:RecordItem[]){const escape=(v:unknown)=>'"'+String(v??'').replace(/^([\s]*[=+@-])/,"'$1").replaceAll('"','""')+'"';return '\ufeff'+[['Date','Libellé','Compte','Débit','Crédit','Référence'],...rows.flatMap(j=>(j.data.entries||[]).map((e:Data)=>[j.data.date,j.data.title,e.account,e.debit,e.credit,j.data.reference]))].map(r=>r.map(escape).join(';')).join('\r\n');}
