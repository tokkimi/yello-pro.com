import {z} from 'zod';

export const ccSchema=z.string().max(2000).optional().default('').transform(value=>value.split(/[;,\n]/).map(email=>email.trim().toLowerCase()).filter(Boolean)).pipe(z.array(z.email()).max(20)).transform(emails=>[...new Set(emails)]);

export function recipients(primary:string,cc:string[]){return {to:[primary],...(cc.length?{cc}: {})};}
