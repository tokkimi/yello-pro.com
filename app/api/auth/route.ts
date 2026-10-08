import {NextResponse} from 'next/server';
import {authClient,configured} from '@/lib/supabase';
import {sameOrigin} from '@/lib/access';
export async function POST(req:Request){if(!sameOrigin(req))return NextResponse.json({error:'Origine refusée.'},{status:403});if(!configured())return NextResponse.json({error:'Les comptes sécurisés seront disponibles après activation de la base de données.'},{status:503});const {email,password,action}=await req.json();const auth=await authClient();if(action==='logout'){await auth.auth.signOut();return NextResponse.json({ok:true});}const {error}=await auth.auth.signInWithPassword({email,password});return error?NextResponse.json({error:'Courriel ou mot de passe incorrect.'},{status:401}):NextResponse.json({ok:true});}
