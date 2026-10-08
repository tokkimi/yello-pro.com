import {z} from 'zod';
export const roomSchema=z.object({id:z.string().max(80),name:z.string().min(1).max(80),x:z.number().min(0).max(200),y:z.number().min(0).max(200),length:z.number().positive().max(100),width:z.number().positive().max(100),height:z.number().positive().max(20),phase:z.enum(['existing','new','remove']),floor:z.string().regex(/^#[0-9a-fA-F]{6}$/),wall:z.string().regex(/^#[0-9a-fA-F]{6}$/),furniture:z.enum(['none','living','bedroom','kitchen','bath']),door:z.boolean(),window:z.boolean(),floorFinish:z.enum(['wood','tile','concrete']).default('wood'),wallFinish:z.enum(['paint','brick']).default('paint')});
export const planElementSchema=z.object({id:z.string().max(80),kind:z.enum(['wall','door','window','counter','island','fixture','stairs','note']),label:z.string().max(100),x:z.number().min(0).max(200),y:z.number().min(0).max(200),length:z.number().positive().max(100),width:z.number().positive().max(100),height:z.number().min(0).max(20).default(.9),phase:z.enum(['existing','new','remove']).default('existing')});
export const planSchema=z.object({rooms:z.array(roomSchema).min(1).max(40),elements:z.array(planElementSchema).max(160).default([]),style:z.enum(['nature','contemporary','classic','industrial']),validated:z.boolean(),revision:z.number().int().min(1).max(100000)});
export type Plan=z.infer<typeof planSchema>;export type PlanRoom=z.infer<typeof roomSchema>;export type PlanElement=z.infer<typeof planElementSchema>;
export const palettes={nature:{name:'Nature chaleureuse',floor:'#bd9669',wall:'#f0eadf'},contemporary:{name:'Contemporain',floor:'#a9aaa5',wall:'#faf9f5'},classic:{name:'Classique doux',floor:'#94704e',wall:'#e8e0d3'},industrial:{name:'Industriel',floor:'#777976',wall:'#bdb5aa'}};
export function fromRooms(rooms:any[]=[]):Plan {let x=0;return {revision:1,validated:false,style:'nature',elements:[],rooms:(rooms.length?rooms:[{name:'Pièce',length:12,width:10,height:8,unit:'pi'}]).map((r,i)=>{const f=r.unit==='m'?1:.3048;const room:PlanRoom={id:String(i),name:r.name||`Pièce ${i+1}`,x,y:0,length:Math.round(Math.max(0,Number(r.length)||0)*f*10000)/10000,width:Math.round(Math.max(0,Number(r.width)||0)*f*10000)/10000,height:Math.round(Math.max(0,Number(r.height)||0)*f*10000)/10000,phase:'existing',floor:'#bd9669',wall:'#f0eadf',furniture:'none',door:false,window:false,floorFinish:'wood',wallFinish:'paint'};x+=room.length+.15;return room;})};}
export function extensionTemplate():Plan{return {revision:1,validated:false,style:'nature',rooms:[
 {id:'salon',name:'Salon existant',x:0,y:0,length:6.3,width:7.4,height:2.5,phase:'existing',floor:'#bd9669',wall:'#f0eadf',furniture:'living',door:true,window:true,floorFinish:'wood',wallFinish:'paint'},
 {id:'bureau',name:'Bureau',x:6.5,y:0,length:3.2,width:4.0,height:2.5,phase:'existing',floor:'#bd9669',wall:'#f0eadf',furniture:'none',door:true,window:true,floorFinish:'wood',wallFinish:'paint'},
 {id:'chambre-existante',name:'Chambre existante',x:9.9,y:0,length:3.6,width:4.8,height:2.5,phase:'existing',floor:'#bd9669',wall:'#f0eadf',furniture:'bedroom',door:true,window:true,floorFinish:'wood',wallFinish:'paint'},
 {id:'sdb-existante',name:'Salle de bain existante',x:9.9,y:4.9,length:3.6,width:3.0,height:2.5,phase:'existing',floor:'#bd9669',wall:'#f0eadf',furniture:'bath',door:true,window:true,floorFinish:'tile',wallFinish:'paint'},
 {id:'cuisine',name:'Nouvelle cuisine',x:0,y:7.6,length:7.0,width:6.0,height:2.6,phase:'new',floor:'#bd9669',wall:'#f0eadf',furniture:'kitchen',door:true,window:true,floorFinish:'tile',wallFinish:'paint'},
 {id:'buanderie',name:'Salle de bain / buanderie',x:7.1,y:4.2,length:2.6,width:3.4,height:2.5,phase:'new',floor:'#bd9669',wall:'#f0eadf',furniture:'bath',door:true,window:false,floorFinish:'tile',wallFinish:'paint'},
 {id:'chambre-1',name:'Chambre 1',x:8.0,y:8.0,length:2.45,width:5.2,height:2.5,phase:'new',floor:'#bd9669',wall:'#f0eadf',furniture:'bedroom',door:true,window:true,floorFinish:'wood',wallFinish:'paint'},
 {id:'chambre-2',name:'Chambre 2',x:10.7,y:8.0,length:2.45,width:5.2,height:2.5,phase:'new',floor:'#bd9669',wall:'#f0eadf',furniture:'bedroom',door:true,window:true,floorFinish:'wood',wallFinish:'paint'}
],elements:[
 {id:'mur-cuisine',kind:'wall',label:'Nouvelle cloison',x:0,y:7.45,length:7.0,width:.14,height:2.6,phase:'new'},
 {id:'ilot',kind:'island',label:'Îlot 4 × 10',x:2.3,y:9.4,length:3.05,width:1.22,height:.92,phase:'new'},
 {id:'comptoir',kind:'counter',label:'Comptoir cuisine',x:.35,y:12.75,length:5.5,width:.62,height:.92,phase:'new'},
 {id:'evier',kind:'fixture',label:'Évier',x:3.0,y:12.75,length:.8,width:.48,height:.95,phase:'new'},
 {id:'cuisson',kind:'fixture',label:'Cuisinière',x:6.1,y:10.5,length:.7,width:.7,height:.95,phase:'new'},
 {id:'escalier',kind:'stairs',label:'Escalier existant',x:.15,y:3.6,length:1.35,width:2.9,height:2.5,phase:'existing'},
 {id:'porte-cuisine',kind:'door',label:'Porte-patio',x:.15,y:10.3,length:.18,width:2.45,height:2.2,phase:'new'},
 {id:'fenetre-cuisine',kind:'window',label:'Fenêtre cuisine',x:3.0,y:13.45,length:1.25,width:.14,height:1.1,phase:'new'},
 {id:'note-ouverture',kind:'note',label:'Ouverture vers aire existante',x:4.1,y:7.1,length:2.1,width:.25,height:0,phase:'remove'}
]};}
export function clientPlan(plan:Plan){return planSchema.parse(plan);}
export function bounds(plan:Plan){return {w:Math.max(1,...plan.rooms.map(r=>r.x+r.length)),h:Math.max(1,...plan.rooms.map(r=>r.y+r.width))};}
