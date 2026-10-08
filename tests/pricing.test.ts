import test from 'node:test';
import assert from 'node:assert/strict';
import {totals} from '../lib/model';
import {clientPricing} from '../lib/client-pricing';
import {lineAmounts,marginToMarkup,markupToMargin,pricingErrors,withDocumentRule,withRule} from '../lib/pricing';

test('profit margin and markup are distinct and equivalent where they should be',()=>{
 assert.equal(marginToMarkup(20),25);
 assert.equal(markupToMargin(25),20);
 assert.deepEqual(lineAmounts(withRule({quantity:1,price:7500},'margin',15)),{base:7500,profit:1323.53,sale:8823.53});
 assert.deepEqual(lineAmounts(withRule({quantity:1,price:450},'markup',25)),{base:450,profit:112.5,sale:562.5});
 assert.equal(lineAmounts(withRule({quantity:3,price:100},'margin',20)).sale,lineAmounts(withRule({quantity:3,price:100},'markup',25)).sale);
 assert.equal(lineAmounts(withRule({quantity:1,price:7500},'markup',15)).sale,8625,'15 % markup is not 15 % margin');
});

test('legacy lines keep their price: margin field has always been a markup',()=>{
 assert.deepEqual(lineAmounts({quantity:2,price:100,margin:10}),{base:200,profit:20,sale:220});
 const t=totals({lines:[{quantity:2,price:100,margin:10}],tps:5,tvq:9.975});
 assert.equal(t.total,252.95);
});

test('document totals, client projection and global margin share one engine',()=>{
 const data=withDocumentRule({lines:[withRule({quantity:1,price:150},'markup',0),withRule({quantity:1,price:300},'markup',0)],tps:5,tvq:9.975,discount:0},'markup',0);
 assert.equal(totals(data).total,517.39,'450 $ before taxes / 517,39 $ TTC (browser check of the previous lot)');
 const withMargin=withDocumentRule({lines:[withRule({quantity:1,price:1000},'margin',20)]},'margin',10);
 const t=totals(withMargin) as any;
 assert.equal(t.lineMargin,250);assert.equal(t.markup,138.89);assert.equal(t.subtotal,1250);
 const client=clientPricing(withMargin);
 assert.equal(totals(client).total,totals(withMargin).total,'client projection keeps the exact total');
 assert.equal(client.markup_basis,undefined);assert.equal(client.profit_margin,undefined);
 assert.equal(JSON.stringify(client).includes('"profit_margin"'),false,'internal margin is not published');
});

test('a margin of 100 % or more is rejected on save and never divides by zero',()=>{
 assert.match(pricingErrors({lines:[{quantity:1,price:10,price_basis:'margin',profit_margin:100}]}).join(),/inférieure à 100/);
 assert.match(pricingErrors({lines:[],markup_basis:'margin',profit_margin:120}).join(),/globale/);
 assert.deepEqual(pricingErrors({lines:[withRule({quantity:1,price:10},'margin',99.99)]}),[]);
 assert.ok(Number.isFinite(lineAmounts({quantity:1,price:10,price_basis:'margin',profit_margin:100}).sale));
});
