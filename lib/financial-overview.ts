import {Data,RecordItem,totals} from './model';

export function financialYears(records:RecordItem[],today=new Date().getFullYear()){
 const years=new Set<number>([today-1,today,today+1,today+2]);
 for(const record of records)if(['invoice','expense','journal'].includes(record.kind)){const year=Number(String(record.data.date||record.created_at||'').slice(0,4));if(year>=2000&&year<=2100)years.add(year);}
 return [...years].sort((a,b)=>b-a);
}
export function financialOverview(records:RecordItem[],year:number,clientId='',projectId=''){
 const scoped=records.filter(record=>['invoice','expense'].includes(record.kind)&&String(record.data.date||record.created_at||'').startsWith(String(year))&&(!clientId||record.client_id===clientId)&&(!projectId||record.project_id===projectId));
 const invoices=scoped.filter(record=>record.kind==='invoice'&&!['Brouillon','Annulée'].includes(record.data.status));
 const expenses=scoped.filter(record=>record.kind==='expense'&&record.data.posted);
 const billed=invoices.reduce((sum,record)=>sum+totals(record.data).total,0);
 const paid=invoices.reduce((sum,record)=>sum+Math.min(totals(record.data).total,Number(record.data.paid||0)),0);
 const spent=expenses.reduce((sum,record)=>sum+Number(record.data.net||0)+Number(record.data.tps||0)+Number(record.data.tvq||0),0);
 const monthly=Array.from({length:12},(_,month)=>{
  const inMonth=(record:RecordItem)=>Number(String(record.data.date||record.created_at||'').slice(5,7))===month+1;
  return {month,billed:invoices.filter(inMonth).reduce((sum,record)=>sum+totals(record.data).total,0),spent:expenses.filter(inMonth).reduce((sum,record)=>sum+Number(record.data.net||0)+Number(record.data.tps||0)+Number(record.data.tvq||0),0)};
 });
 return {billed,paid,spent,outstanding:Math.max(0,billed-paid),invoices:invoices.length,expenses:expenses.length,monthly};
}

export function expenseTotal(data:Data){return Number(data.net||0)+Number(data.tps||0)+Number(data.tvq||0);}
