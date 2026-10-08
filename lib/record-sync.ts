import type {RecordItem} from './model';
/** A refresh must never roll a just-saved local record back to an older server version. */
export function reconcileSnapshot(current:RecordItem[],incoming:RecordItem[],changedDuringRequest:boolean){
 const previous=new Map(current.map(r=>[r.id,r]));
 const result=incoming.map(r=>{const local=previous.get(r.id);return local&&local.version>r.version?local:r});
 if(changedDuringRequest){const ids=new Set(result.map(r=>r.id));for(const r of current)if(!ids.has(r.id))result.push(r)}
 return result;
}
