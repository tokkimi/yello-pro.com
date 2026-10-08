import type {RecordItem} from './model';
// A blank preview: no seeded clients, contacts, invoices or personal names.
export const demoRecords:RecordItem[]=[];
export const demoUser={id:'00000000-0000-4000-8000-000000000100',name:'',email:'',role:'admin' as const,client_id:null};
