import Decimal from 'decimal.js';
import {Data,round,totals} from './model';
import {lineAmounts} from './pricing';

/** Publish sale prices without publishing the contractor's hidden purchase costs. */
export function clientPricing(data:Data):Data{
 const result=totals(data) as Data,lines:Array<Data>=Array.isArray(data.lines)?data.lines:[];
 const target=round(Number(result.subtotal)+Number(result.markup||0));let allocated=0,cumulative=0;
 const prices=lines.map((line,index)=>{
  const quantity=Number(line.quantity||0),{base,sale}=lineAmounts(line);
  cumulative=round(cumulative+sale);
  const share=Number(result.subtotal)?round(new Decimal(target).mul(cumulative).div(Number(result.subtotal)).toNumber()):0;
  const amount=round(share-allocated);allocated=share;
  const output:Data={description:line.description,category:line.category,section:line.section,quantity,unit:line.unit,price:quantity?new Decimal(amount).div(quantity).toNumber():0,notes:line.show_notes===false?undefined:line.notes,show_notes:line.show_notes};
  if(data.client_view?.materials===true){output.material_cost=line.material_cost;output.labour_cost=line.labour_cost;}
  if(data.client_view?.margin===true)output.display_margin=round(sale-base);
  return output;
 });
 return {...data,lines:prices,markup:0,markup_basis:undefined,profit_margin:undefined};
}
