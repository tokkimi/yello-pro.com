import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyContractSignature,signatureInput} from '../lib/contract-signatures';
import type {RecordItem} from '../lib/model';

const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const contract:RecordItem={id:'contract',kind:'contract',client_id:'client',project_id:'project',version:1,created_at:'2026-09-28',updated_at:'2026-09-28',data:{status:'Envoyé',terms:'Travaux convenus'}};
const input={signature_name:'Camille Laurent',signature_image:image,signature_consent:true,terms:'Remplacement non autorisé'};

test('a signature requires consent and a bounded PNG image',()=>{
 assert.equal(signatureInput({...input,signature_consent:false}),null);
 assert.equal(signatureInput({...input,signature_image:'data:image/svg+xml;base64,AAAA'}),null);
 assert.equal(signatureInput({...input,signature_image:image+'A'.repeat(300000)}),null);
 assert.ok(signatureInput(input));
});
test('a client signature preserves the agreed terms and awaits MG Pro',()=>{
 const signed=applyContractSignature(contract,{id:'client-user',name:'Camille',role:'client'},input);
 assert.equal(signed?.terms,'Travaux convenus');assert.equal(signed?.status,'Envoyé');
 assert.equal(applyContractSignature({...contract,data:signed!},{id:'client-user',name:'Camille',role:'client'},input),null);
 const completed=applyContractSignature({...contract,data:signed!},{id:'admin',name:'Mohamed',role:'admin'},input);
 assert.equal(completed?.status,'Signé');assert.equal(completed?.signatures.length,2);
});
test('a contractor agreement needs the contractor rather than a client signature',()=>{
 const partyContract={...contract,data:{...contract.data,partner_id:'worker'}};
 const adminSigned=applyContractSignature(partyContract,{id:'admin',name:'Mohamed',role:'admin'},input)!;
 const completed=applyContractSignature({...partyContract,data:adminSigned},{id:'worker',name:'Prestataire',role:'worker'},input);
 assert.equal(completed?.status,'Signé');
 assert.equal(applyContractSignature({...contract,data:{...contract.data,status:'Brouillon'}},{id:'admin',name:'Mohamed',role:'admin'},input),null);
});
