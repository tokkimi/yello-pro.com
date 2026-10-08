import {scheduleFrom,ScheduleActivity} from './schedule';
import {Data} from './model';

export const catalogueTabs=['Gabarits de départ','Mes soumissions','Mon catalogue','Mes catégories','Codes de coût','Échéanciers de départ','Mes échéanciers','Tâches','Produits','Sélections'] as const;
export type CatalogueTab=typeof catalogueTabs[number];
export type CatalogueEntry={id:string;tab:CatalogueTab;name:string;description:string;category:string;code:string;unit:string;price:number;material:number;labour:number;lines:Data[];steps:Data[];color:string;activities:ScheduleActivity[];brand:string;sku:string;finish:string;markup:number};
const colors=['#466952','#627c9e','#a47d45','#8b6b92'];
export function catalogueFrom(value:unknown):CatalogueEntry[]{
 if(!Array.isArray(value))return [];
 return value.filter(x=>x&&typeof x==='object'&&catalogueTabs.includes(x.tab)).map(x=>({id:String(x.id),tab:x.tab,name:String(x.name||''),description:String(x.description||''),category:String(x.category||''),code:String(x.code||''),unit:String(x.unit||'unité'),price:Math.max(0,Number(x.price)||0),material:Math.max(0,Number(x.material)||0),labour:Math.max(0,Number(x.labour)||0),activities:scheduleFrom(x.activities),brand:String(x.brand||''),sku:String(x.sku||''),finish:String(x.finish||''),markup:Math.max(0,Number(x.markup)||0),lines:Array.isArray(x.lines)?structuredClone(x.lines):[],steps:Array.isArray(x.steps)?structuredClone(x.steps):[],color:/^#[0-9a-f]{6}$/i.test(x.color)?x.color:colors[0]}));
}
const line=(category:string,description:string)=>({category,description,quantity:1,unit:'forfait',price:0});
export const starterCatalogue:CatalogueEntry[]=catalogueFrom([
 ...[
  ['Rénovation de cuisine',['Protection du chantier','Démolition','Plomberie','Électricité','Armoires et comptoirs','Finitions']],
  ['Rénovation de salle de bain',['Protection du chantier','Démolition','Plomberie','Étanchéité','Céramique','Appareils et finitions']],
  ['Aménagement de sous-sol',['Préparation','Ossature','Électricité','Isolation','Gypse','Revêtements et peinture']],
  ['Agrandissement',['Préparation et permis','Excavation','Fondations','Structure','Enveloppe','Mécanique','Finitions']],
 ].map(([name,categories],index)=>({id:'starter-'+index,tab:'Gabarits de départ',name,description:'Structure de départ à adapter et à chiffrer selon le chantier.',lines:(categories as string[]).map(name=>line(name,name)),color:colors[index]})),
 ...['Cuisine','Salle de bain','Sous-sol','Agrandissement','Nouvelle construction','Garage','Rénovation complète','Revêtements extérieurs','Aménagement intérieur'].map((name,index)=>({id:'schedule-starter-'+index,tab:'Échéanciers de départ',name,description:'Activités proposées par Yello Pro, durées à adapter au chantier.',activities:['Préparation','Protection du chantier','Travaux préparatoires','Travaux principaux','Finitions','Inspection et livraison'].map((title,i)=>({id:'activity-'+i,title,kind:'activity',days:1,start:'',progress:0,assignee:'',predecessor:i?'activity-'+(i-1):'',color:colors[index%colors.length]}))}))
]);
export function catalogueLines(entry:CatalogueEntry):Data[]{
 // A snapshot: changing a library entry must never change a previously created quote.
 if(entry.lines.length)return structuredClone(entry.lines).map(({internal_notes,admin_notes,notebook,...line})=>line);
 return [{description:entry.name,notes:entry.description,category:entry.tab==='Mes catégories'?entry.name:entry.category,cost_code:entry.code,quantity:1,unit:entry.unit,margin:entry.markup,price:entry.material+entry.labour||entry.price,...(entry.material+entry.labour>0?{pricing_mode:'split',material_cost:entry.material,labour_cost:entry.labour}:{})}];
}
export function exportCatalogue(entries:CatalogueEntry[]){return JSON.stringify({format:'yello-pro-catalogue',version:1,entries},null,2)}
export function importCatalogue(text:string):CatalogueEntry[]{const source=JSON.parse(text);if(source.format!=='yello-pro-catalogue'||source.version!==1||!Array.isArray(source.entries))throw new Error('Choisissez un export de catalogue Yello Pro (version 1).');const entries=catalogueFrom(source.entries);if(entries.length!==source.entries.length||entries.some(x=>!x.name.trim()))throw new Error('Le fichier contient des éléments incomplets ou des onglets inconnus.');if(entries.length>2000)throw new Error('Import limité à 2 000 éléments par fichier.');return entries;}
