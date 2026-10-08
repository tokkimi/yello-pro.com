import {round} from './model';
// Indicative material rates (materials only, taxes excluded) used to preview a
// renovation and to price quote lines by surface. Prices are expressed per pi²
// unless noted; convertMaterialPrice adapts them when a room is measured in m².
export type Surface='floor'|'wall'|'counter';
export type Material={id:string;name:string;surface:Surface;unit:'pi²';price:number;color:string;texture?:string;sheen?:number;tone:'light'|'dark';description:string};
export const surfaceLabels:Record<Surface,string>={floor:'Revêtement de sol',wall:'Murs et finitions',counter:'Comptoir'};
// Woodgrain / tile / stone patterns are pure CSS so the 3D preview needs no assets.
const woodgrain='repeating-linear-gradient(92deg,#00000014 0 2px,#ffffff10 2px 5px,#0000000a 5px 9px)';
const tilegrid='linear-gradient(#00000022,#00000022) 0 0/100% 2px no-repeat,linear-gradient(90deg,#00000022,#00000022) 0 0/2px 100% no-repeat,repeating-linear-gradient(#0000 0 47px,#00000018 47px 49px),repeating-linear-gradient(90deg,#0000 0 47px,#00000018 47px 49px)';
const speckle='radial-gradient(circle at 20% 30%,#ffffff40 0 2px,#0000 3px),radial-gradient(circle at 70% 60%,#00000026 0 2px,#0000 3px),radial-gradient(circle at 45% 80%,#ffffff33 0 1px,#0000 2px),radial-gradient(circle at 85% 25%,#00000022 0 2px,#0000 3px)';
const stucco='radial-gradient(circle at 30% 30%,#0000000f 0 30%,#0000 31%),radial-gradient(circle at 75% 65%,#0000000d 0 25%,#0000 26%)';
export const materials:Material[]=[
 {id:'vinyle-lvt',name:'Vinyle de luxe (LVT)',surface:'floor',unit:'pi²',price:4.25,color:'#c9a87c',texture:woodgrain,sheen:.25,tone:'light',description:'Économique, chaleureux et étanche.'},
 {id:'stratifie',name:'Plancher stratifié',surface:'floor',unit:'pi²',price:5.5,color:'#b98e5e',texture:woodgrain,sheen:.2,tone:'light',description:'Aspect bois, pose rapide.'},
 {id:'beton-poli',name:'Béton poli',surface:'floor',unit:'pi²',price:8.25,color:'#9b9d9c',texture:speckle,sheen:.45,tone:'dark',description:'Contemporain et durable.'},
 {id:'ceramique-sol',name:'Céramique',surface:'floor',unit:'pi²',price:9.75,color:'#cdc6ba',texture:tilegrid,sheen:.35,tone:'light',description:'Résistante à l’eau, idéale salle de bain.'},
 {id:'bois-franc-chene',name:'Bois franc — chêne',surface:'floor',unit:'pi²',price:12.9,color:'#a9793f',texture:woodgrain,sheen:.3,tone:'light',description:'Chêne naturel, valeur ajoutée.'},
 {id:'porcelaine',name:'Porcelaine grand format',surface:'floor',unit:'pi²',price:14.5,color:'#d7d2c8',texture:tilegrid,sheen:.5,tone:'light',description:'Grandes dalles, joints minces.'},
 {id:'peinture-standard',name:'Peinture (2 couches)',surface:'wall',unit:'pi²',price:2.4,color:'#efece4',sheen:.1,tone:'light',description:'Finition mate lessivable.'},
 {id:'peinture-premium',name:'Peinture premium lavable',surface:'wall',unit:'pi²',price:3.2,color:'#e8e4d7',sheen:.15,tone:'light',description:'Couvrance et lavabilité supérieures.'},
 {id:'enduit-decoratif',name:'Enduit décoratif',surface:'wall',unit:'pi²',price:6.8,color:'#ddd3c2',texture:stucco,sheen:.12,tone:'light',description:'Effet minéral texturé.'},
 {id:'lambris-bois',name:'Lambris de bois',surface:'wall',unit:'pi²',price:9.4,color:'#c79a63',texture:woodgrain,sheen:.2,tone:'light',description:'Chaleur du bois, pose verticale.'},
 {id:'ceramique-murale',name:'Céramique murale',surface:'wall',unit:'pi²',price:11.5,color:'#eef0ef',texture:tilegrid,sheen:.55,tone:'light',description:'Dosseret et douche, entretien facile.'},
 {id:'stratifie-comptoir',name:'Comptoir stratifié',surface:'counter',unit:'pi²',price:48,color:'#d8d2c6',sheen:.35,tone:'light',description:'Le plus abordable, nombreux décors.'},
 {id:'bois-massif',name:'Bois massif (bloc boucher)',surface:'counter',unit:'pi²',price:78,color:'#b5854e',texture:woodgrain,sheen:.3,tone:'light',description:'Chaleureux, à huiler régulièrement.'},
 {id:'ceramique-comptoir',name:'Céramique grand format',surface:'counter',unit:'pi²',price:85,color:'#e7e3da',texture:speckle,sheen:.5,tone:'light',description:'Résistant à la chaleur et aux rayures.'},
 {id:'quartz',name:'Quartz',surface:'counter',unit:'pi²',price:92,color:'#eceae3',texture:speckle,sheen:.6,tone:'light',description:'Non poreux, aspect haut de gamme.'},
 {id:'granit',name:'Granit',surface:'counter',unit:'pi²',price:98,color:'#5f6167',texture:speckle,sheen:.65,tone:'dark',description:'Pierre naturelle unique et robuste.'}
];
export const materialsBySurface=(surface:Surface)=>materials.filter(m=>m.surface===surface);
export const findMaterial=(id?:string|null)=>materials.find(m=>m.id===id)||null;
export const PI2_PER_M2=10.7639;
// Room geometry helpers. length/width/height are in the room's own unit (pi or m).
export const floorArea=(room:{length?:number;width?:number})=>round(Number(room?.length||0)*Number(room?.width||0));
export const wallArea=(room:{length?:number;width?:number;height?:number})=>round(2*(Number(room?.length||0)+Number(room?.width||0))*Number(room?.height||0));
// Catalog prices are per pi². When a room is measured in metres, convert to a
// per-m² rate so quantity (in m²) × price stays a correct dollar amount.
export const convertMaterialPrice=(material:Material,roomUnit='pi')=>roomUnit==='m'?round(material.price*PI2_PER_M2):material.price;
export const areaUnit=(roomUnit='pi')=>`${roomUnit==='m'?'m':'pi'}²`;
// Build (or refresh) the priced quote line for one material surface of a room.
export function materialLine(room:{name?:string;length?:number;width?:number;height?:number;unit?:string},surface:Surface,material:Material){
 const unit=room?.unit||'pi';
 const area=surface==='wall'?wallArea(room):floorArea(room);
 const quantity=surface==='counter'?round(Math.max(area*0.12,10)):area;// counters priced on an estimated worktop area
 return {description:`${surfaceLabels[surface]} — ${material.name}${room?.name?` (${room.name})`:''}`,quantity,unit:areaUnit(unit),price:convertMaterialPrice(material,unit),surface,materialId:material.id,room:room?.name||''};
}
