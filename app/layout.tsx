import {Plus_Jakarta_Sans} from 'next/font/google';
import CookieConsent from '@/components/cookie-consent';
import type {Metadata} from 'next';
import {headers} from 'next/headers';
import './globals.css';
import './responsive.css';
import './brand.css';
const jakarta=Plus_Jakarta_Sans({subsets:['latin'],display:'swap',variable:'--font-yello'});
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://yello-pro.vercel.app'),title:{default:'Yello Pro — Votre activité en toute clarté',template:'%s | Yello Pro'},description:'Projets, équipes, devis et finances dans un espace partagé.',icons:{icon:'/yello-icon.svg',apple:'/yello-icon.svg'}};
export default async function Layout({children}:{children:React.ReactNode}){const locale=(await headers()).get('x-site-locale')==='en-CA'?'en-CA':'fr-CA';return <html lang={locale}><body className={jakarta.variable} spellCheck={true}>{children}<CookieConsent/></body></html>}
import './atelier.css';

import './modules.css';

import './yello.css';
