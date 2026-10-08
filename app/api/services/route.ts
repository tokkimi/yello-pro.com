import {NextResponse} from 'next/server';
import {identity} from '@/lib/supabase';
import {serviceStatus} from '@/lib/services';

export async function GET(){
 const user=await identity();
 if(!user)return NextResponse.json({error:'Connexion requise.'},{status:401});
 if(user.role!=='admin')return NextResponse.json({error:'Accès refusé.'},{status:403});
 return NextResponse.json({services:serviceStatus()},{headers:{'Cache-Control':'private, no-store'}});
}
