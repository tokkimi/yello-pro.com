import Decimal from 'decimal.js';

/*
 * Single pricing rule used by the editor, totals, client projection and PDF.
 * - Markup (majoration) r: sale = cost × (1 + r)          450 @ 25 % → 562.50
 * - Profit margin (marge) m: sale = cost ÷ (1 − m), m < 100 % 7 500 @ 15 % → 8 823.53
 * A 20 % margin and a 25 % markup give the same sale price.
 * Historical lines only carry `margin`, which has always been a markup percentage; they keep their price.
 */
export type PriceBasis='markup'|'margin';
type Line={quantity?:unknown;price?:unknown;margin?:unknown;price_basis?:unknown;profit_margin?:unknown};
const cent=(n:Decimal)=>n.toDecimalPlaces(2,Decimal.ROUND_HALF_UP);
const finite=(n:unknown)=>{const value=Number(n);return Number.isFinite(value)?value:0};

export function marginToMarkup(margin:number){if(!(margin<100))throw new Error('La marge de profit doit être inférieure à 100 %.');return new Decimal(margin).div(new Decimal(100).minus(margin)).times(100).toNumber()}
export function markupToMargin(markup:number){return new Decimal(markup).div(new Decimal(100).plus(markup)).times(100).toNumber()}

/** Basis and percentage of a line or a document-level adjustment. */
export function priceRule(source:Line,keys:{basis:string;margin:string;markup:string}={basis:'price_basis',margin:'profit_margin',markup:'margin'}):{basis:PriceBasis;rate:number}{
 const record=source as Record<string,unknown>;
 if(record[keys.basis]==='margin')return {basis:'margin',rate:Math.min(99.99,Math.max(0,finite(record[keys.margin])))}; // validated on save; clamped so a bad row never breaks rendering
 return {basis:'markup',rate:Math.max(0,finite(record[keys.markup]))};
}
/** Server/UI validation: a profit margin must stay below 100 %. */
export function pricingErrors(data:{lines?:unknown;markup_basis?:unknown;profit_margin?:unknown}){
 const errors:string[]=[];
 const lines=Array.isArray(data.lines)?data.lines as Record<string,unknown>[]:[];
 lines.forEach((line,index)=>{if(line&&line.price_basis==='margin'&&!(finite(line.profit_margin)<100))errors.push(`Ligne ${index+1} : la marge de profit doit être inférieure à 100 %.`);if(line&&!Number.isFinite(Number(line.quantity??0)))errors.push(`Ligne ${index+1} : quantité invalide.`)});
 if(data.markup_basis==='margin'&&!(finite(data.profit_margin)<100))errors.push('La marge globale doit être inférieure à 100 %.');
 return errors;
}
/** Profit added on top of a cost, rounded to the cent. */
export function profitOn(cost:Decimal,rule:{basis:PriceBasis;rate:number}){
 if(!rule.rate)return new Decimal(0);
 return cent(rule.basis==='margin'?cost.div(new Decimal(1).minus(new Decimal(rule.rate).div(100))).minus(cost):cost.times(rule.rate).div(100));
}
export function lineAmounts(line:Line){
 const base=cent(new Decimal(finite(line.quantity)).times(finite(line.price)));
 const profit=profitOn(new Decimal(finite(line.quantity)).times(finite(line.price)),priceRule(line));
 return {base:base.toNumber(),profit:profit.toNumber(),sale:base.plus(profit).toNumber()};
}
export const lineSale=(line:Line)=>lineAmounts(line).sale;
/** Unit sale price for display; the line total stays the reference amount. */
export function unitSale(line:Line){const quantity=finite(line.quantity);return quantity?new Decimal(lineSale(line)).div(quantity).toDecimalPlaces(4).toNumber():lineAmounts({...line,quantity:1}).sale}
/** Patch a line so its rule is stored explicitly, keeping `margin` as the equivalent markup for older readers. */
export function withRule(line:Record<string,unknown>,basis:PriceBasis,rate:number){
 const value=Math.max(0,finite(rate));
 if(basis==='margin'){const safe=Math.min(99.99,value);return {...line,price_basis:'margin',profit_margin:safe,margin:marginToMarkup(safe)}}
 return {...line,price_basis:'markup',margin:value,profit_margin:undefined};
}
export const documentRule=(data:Record<string,unknown>)=>priceRule(data,{basis:'markup_basis',margin:'profit_margin',markup:'markup'});
export function withDocumentRule(data:Record<string,unknown>,basis:PriceBasis,rate:number){
 const value=Math.max(0,finite(rate));
 if(basis==='margin'){const safe=Math.min(99.99,value);return {...data,markup_basis:'margin',profit_margin:safe,markup:marginToMarkup(safe)}}
 return {...data,markup_basis:'markup',markup:value,profit_margin:undefined};
}
