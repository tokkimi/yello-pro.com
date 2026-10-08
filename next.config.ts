import type { NextConfig } from 'next';
import original from './content/original.json';
import articles from './content/blog.json';
const config: NextConfig = {poweredByHeader:false,async redirects(){return [{source:'/services/blogue',destination:'/blogue',permanent:true},...articles.map(a=>({source:'/blogue/'+a.slug+'.php',destination:'/blogue/'+a.slug,permanent:true})),...original.pages.filter(p=>p.path!=='/').map(p=>({source:p.path,destination:p.slug==='approche'?'/#approche':p.slug==='realisations'?'/#realisations':p.slug==='a-propos'?'/a-propos':p.slug==='blogue'?'/blogue':`/services/${p.slug}`,permanent:true}))]},async headers(){return [{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'}]}]}};
export default config;
