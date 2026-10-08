import type {Metadata,Viewport} from 'next';
import {redirect} from 'next/navigation';
import {identity} from '@/lib/supabase';
import Workspace from '@/components/workspace';
/* Installable as a phone app for the management space only: the public site has no manifest. */
export const metadata:Metadata={title:'Espace de gestion',robots:{index:false,follow:false},manifest:'/app/manifest.webmanifest',appleWebApp:{capable:true,title:'Yello Pro',statusBarStyle:'default'},icons:{apple:'/app/apple-touch-icon.png'}};
export const viewport:Viewport={themeColor:'#ffffff',viewportFit:'cover'};
export const dynamic='force-dynamic';
export default async function Page(){const user=await identity();if(!user)redirect('/connexion');return <Workspace demo={false} initialUser={user}/>}
