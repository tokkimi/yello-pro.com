import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTranscript,parseModelAnalysis} from '../lib/analyze';
import {materialLine,convertMaterialPrice,findMaterial,floorArea,wallArea,materialsBySurface} from '../lib/materials';

test('voice note is split into draft lines with detected quantity, price and materials',()=>{
 const a=analyzeTranscript('Refaire le plancher de la cuisine, environ 120 pi². Ensuite installer un comptoir en quartz. Peinture des murs à 2500 $. Prévoir céramique pour le dosseret.');
 assert.ok(a.lines.length>=3);
 const floor=a.lines.find(l=>l.unit==='pi²');
 assert.equal(floor?.quantity,120);
 assert.ok(a.lines.some(l=>l.price===2500));
 assert.match(a.materials,/Quartz/);
 assert.equal(a.source,'heuristic');
});
test('empty-ish dictation still yields at least one editable line and never invents a price',()=>{
 const a=analyzeTranscript('travaux divers à préciser');
 assert.equal(a.lines.length,1);
 assert.equal(a.lines[0].price,0);
});
test('model JSON is parsed defensively and junk is rejected',()=>{
 const ok=parseModelAnalysis('voici le résultat {"lines":[{"description":"Démolition","quantity":1,"unit":"forfait","price":800}],"scope":"x","materials":"Quartz","summary":"s"} fin');
 assert.equal(ok?.lines.length,1);
 assert.equal(ok?.lines[0].price,800);
 assert.equal(ok?.source,'model');
 assert.equal(parseModelAnalysis('pas de json ici'),null);
 assert.equal(parseModelAnalysis('{"lines":[]}'),null);
});
test('material line prices a surface by its area and switching material changes the price',()=>{
 const room={name:'Cuisine',length:14,width:12,height:8,unit:'pi'};
 assert.equal(floorArea(room),168);
 assert.equal(wallArea(room),416);
 const oak=findMaterial('bois-franc-chene')!;
 const vinyl=findMaterial('vinyle-lvt')!;
 const l1=materialLine(room,'floor',oak);
 assert.equal(l1.quantity,168);
 assert.equal(l1.unit,'pi²');
 assert.equal(l1.price,12.9);
 assert.equal(l1.materialId,'bois-franc-chene');
 const l2=materialLine(room,'floor',vinyl);
 assert.ok(l2.price<l1.price);
});
test('metre rooms convert the per-pi² rate so totals stay correct',()=>{
 const oak=findMaterial('bois-franc-chene')!;
 assert.equal(convertMaterialPrice(oak,'pi'),12.9);
 assert.equal(convertMaterialPrice(oak,'m'),138.85);
 assert.equal(materialLine({name:'X',length:4,width:3,height:2.4,unit:'m'},'floor',oak).unit,'m²');
});
test('each surface exposes several priced options for the picker',()=>{
 for(const s of ['floor','wall','counter'] as const)assert.ok(materialsBySurface(s).length>=4);
});
