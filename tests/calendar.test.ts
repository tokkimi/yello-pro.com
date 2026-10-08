import test from 'node:test';
import assert from 'node:assert/strict';
import {ics} from '../lib/calendar';

test('calendar export keeps Montreal local time and escapes client text',()=>{const text=ics({uid:'visit-1',title:'Visite, cuisine',description:`Note; privée
Nouvelle ligne`,location:'Laval, Québec',start:'2030-10-15T14:30',durationMinutes:60});assert.match(text,/DTSTART;TZID=America\/Toronto:20301015T1430/);assert.match(text,/DTEND;TZID=America\/Toronto:20301015T1530/);assert.match(text,/SUMMARY:Visite\\, cuisine/);assert.match(text,/DESCRIPTION:Note\\; privée\\nNouvelle ligne/);});
test('all-day calendar export has a next-day end date',()=>{const text=ics({uid:'visit-2',title:'Visite',start:'2030-02-28',durationMinutes:60});assert.match(text,/DTSTART;VALUE=DATE:20300228/);assert.match(text,/DTEND;VALUE=DATE:20300301/);});
