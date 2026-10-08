'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
export function alternatePath(path:string){if(path==='/en')return '/';if(path.startsWith('/en/'))return path.slice(3).replace(/^\/about$/,'/a-propos').replace(/^\/privacy$/,'/confidentialite').replace(/^\/blog(?=\/|$)/,'/blogue');return path==='/'?'/en':'/en'+path.replace(/^\/a-propos$/,'/about').replace(/^\/confidentialite$/,'/privacy').replace(/^\/blogue(?=\/|$)/,'/blog')}
export default function LanguageSwitch(){const path=usePathname();const en=path==='/en'||path.startsWith('/en/');return <Link className="language-switch" href={alternatePath(path)} hrefLang={en?'fr-CA':'en-CA'} lang={en?'fr':'en'} aria-label={en?'Lire cette page en français':'Read this page in English'}>{en?'FR':'EN'}</Link>}
