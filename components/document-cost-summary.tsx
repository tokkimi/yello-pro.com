'use client';
import {money,totals,type Data} from '@/lib/model';
import {documentRule,markupToMargin,withDocumentRule,type PriceBasis} from '@/lib/pricing';

export default function DocumentCostSummary({data,onChange}:{data:Data;onChange:(data:Data)=>void}){
 const lines:Data[]=data.lines||[],result:Data=totals(data);
 const materials=lines.reduce((sum,line)=>sum+(line.pricing_mode==='split'?Number(line.quantity||0)*Number(line.material_cost||0):0),0);
 const labour=lines.reduce((sum,line)=>sum+(line.pricing_mode==='split'?Number(line.quantity||0)*Number(line.labour_cost||0):0),0);
 const other=lines.reduce((sum,line)=>sum+(line.pricing_mode!=='split'?Number(line.quantity||0)*Number(line.price||0):0),0);
 const rule=documentRule(data);
 return <section className="document-cost-summary"><h3>Détails des coûts · avant taxes</h3><dl><div><dt>Matériaux</dt><dd>{money(materials)}</dd></div><div><dt>Main-d’œuvre</dt><dd>{money(labour)}</dd></div>{other>0&&<div><dt>Autres postes à prix unitaire</dt><dd>{money(other)}</dd></div>}<div><dt>Profit des lignes</dt><dd>{money(Number(result.lineMargin||0))}</dd></div><div><dt>Profit global</dt><dd>{money(Number(result.markup||0))}</dd></div></dl><div className="form-grid"><label>Profit global<select value={rule.basis} onChange={e=>onChange(withDocumentRule(data,e.target.value as PriceBasis,e.target.value==='margin'?markupToMargin(Number(data.markup||0)):Number(data.markup||0)))}><option value="markup">Majoration sur le sous-total</option><option value="margin">Marge de profit sur le prix de vente</option></select></label><label>{rule.basis==='margin'?'Marge globale (%)':'Majoration globale (%)'}<input type="number" min="0" max={rule.basis==='margin'?99.99:undefined} step=".01" value={Math.round(rule.rate*100)/100} onChange={e=>onChange(withDocumentRule(data,rule.basis,Number(e.target.value)||0))}/></label></div><p>Le profit global s’ajoute aux profits des lignes. Laissez-le à zéro si le profit est déjà inclus dans chaque ligne.</p></section>;
}
