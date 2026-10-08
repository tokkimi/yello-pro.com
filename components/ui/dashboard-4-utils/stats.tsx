'use client';
import {Banknote,Receipt,Wallet,ArrowDownToLine} from 'lucide-react';
import {money} from '@/lib/model';
import {useDashboard} from './context';
export function DashboardStats(){const {stats}=useDashboard();return <>{[{label:'Facturé',value:stats.billed,detail:`${stats.invoices} facture(s) émises`,Icon:Receipt},{label:'Encaissé',value:stats.paid,detail:'Paiements enregistrés',Icon:Banknote},{label:'Dépenses',value:stats.spent,detail:`${stats.expenses} dépense(s) comptabilisées`,Icon:Wallet},{label:'À encaisser',value:stats.outstanding,detail:'Solde des factures',Icon:ArrowDownToLine}].map(({label,value,detail,Icon})=><article className="dashboard4-stat dashboard4-card" key={label}><header><span>{label}</span><Icon size={17}/></header><strong>{money(value)}</strong><small>{detail}</small></article>)}</>}
