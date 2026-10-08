import Login from '@/components/login';
import {configured,identity} from '@/lib/supabase';
import {redirect} from 'next/navigation';
export const metadata={title:'Connexion',robots:{index:false,follow:false}};
export default async function Page(){if(configured()&&await identity())redirect('/admin');return <Login ready={configured()}/>}
