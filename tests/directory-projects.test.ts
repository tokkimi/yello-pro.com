import test from 'node:test';
import assert from 'node:assert/strict';
import {duplicateGroups,parseCsv,previewImport,directoryCsv,type DirectoryEntry} from '../lib/directory';
import {presetRange,inRange,resultLabel} from '../lib/project-filters';
import {fit,geogratisPoint,project} from '../lib/geo';

const entry=(id:string,patch:Partial<DirectoryEntry>):DirectoryEntry=>({id,kind:'client',name:'',email:'',phone:'',company:'',trade:'',address:'',archived:false,source:'record',...patch});

test('duplicates are detected by e-mail, phone or full name, never merged',()=>{
 const groups=duplicateGroups([entry('a',{name:'Léa Tremblay',email:'LEA@example.test'}),entry('b',{name:'Lea Tremblay',kind:'professional',email:'lea@example.test'}),entry('c',{name:'Autre',phone:'1 (514) 555-0101'}),entry('d',{name:'Encore',phone:'514-555-0101'}),entry('e',{name:'Seul'})]);
 assert.equal(groups.length,2);
 assert.deepEqual(groups.map(g=>g.entries.map(e=>e.id).sort()),[['a','b'],['c','d']]);
 assert.ok(groups[0].reasons.includes('même courriel'));
});

test('CSV import is previewed: invalid rows, duplicates and quotes handled before any write',()=>{
 const rows=parseCsv('﻿Nom;Courriel;Téléphone;Entreprise\r\n"Bois, Inc.";bois@example.test;514 555 0000;"Scierie ""Nord"""\r\n;sans-nom@example.test;;\r\nPlomberie X;pas-un-courriel;;\r\nDouble;LEA@example.test;;\r\n');
 assert.equal(rows[1][0],'Bois, Inc.');assert.equal(rows[1][3],'Scierie "Nord"');
 const preview=previewImport('Nom;Courriel;Téléphone;Entreprise\n"Bois, Inc.";bois@example.test;514 555 0000;Scierie\n;sans-nom@example.test;;\nPlomberie X;pas-un-courriel;;\nDouble;LEA@example.test;;\n',[entry('a',{name:'Léa',email:'lea@example.test'})]);
 assert.equal(preview.valid.length,1);
 assert.deepEqual(preview.invalid.map(x=>x.line),[3,4]);
 assert.deepEqual(preview.duplicates,[{line:5,match:'Léa'}]);
 assert.match(previewImport('Courriel\nx@y.z',[]).invalid[0].errors[0],/Nom/);
});

test('export neutralises spreadsheet formulas',()=>{
 const csv=directoryCsv([entry('a',{name:'=HYPERLINK("x")',email:'a@b.c'})]);
 assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
});

test('project date presets and the zero-result footer',()=>{
 assert.deepEqual(presetRange('7 derniers jours','2026-10-08'),{from:'2026-10-02',to:'2026-10-08'});
 assert.deepEqual(presetRange('Trimestre à ce jour','2026-11-15'),{from:'2026-10-01',to:'2026-11-15'});
 assert.deepEqual(presetRange('Année en cours','2026-10-08'),{from:'2026-01-01',to:'2026-10-08'});
 assert.equal(inRange('2026-10-05T10:00:00Z',{from:'2026-10-01',to:'2026-10-08'}),true);
 assert.equal(inRange('',{from:'2026-10-01',to:''}),false,'a missing date never matches an active date filter');
 assert.equal(resultLabel(0,1,20),'0 résultat');
 assert.equal(resultLabel(45,3,20),'41 à 45 sur 45 résultats');
});

test('geocoding answer and map projection',()=>{
 assert.deepEqual(geogratisPoint([{title:'Laval',geometry:{type:'Point',coordinates:[-73.75,45.6]}}]),{lon:-73.75,lat:45.6,label:'Laval'});
 assert.equal(geogratisPoint([{title:'x'}]),null);
 const a={lat:45.5,lon:-73.6},b={lat:45.6,lon:-73.7};
 const {zoom}=fit([a,b],800,460);
 const pa=project(a,zoom),pb=project(b,zoom);
 assert.ok(Math.abs(pa.x-pb.x)<=720&&Math.abs(pa.y-pb.y)<=380);
 assert.ok(project({lat:46,lon:-73},10).y<project({lat:45,lon:-73},10).y,'north is up');
});
