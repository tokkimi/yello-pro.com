import {RecordItem} from './model';
export function clientTrash(records:RecordItem[]){return records.filter(record=>record.kind==='client'&&Boolean(record.data.deleted_at));}
export function activeRecords(records:RecordItem[]){const deleted=new Set(clientTrash(records).map(record=>record.id));return records.filter(record=>!deleted.has(record.kind==='client'?record.id:record.client_id||''));}
