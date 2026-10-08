import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/demo','/connexion','/compte','/api/','/auth/','/f/']},sitemap:`${process.env.NEXT_PUBLIC_SITE_URL||'https://yello-pro.vercel.app'}/sitemap.xml`}}

