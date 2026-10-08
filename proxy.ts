import {NextResponse,NextRequest} from 'next/server';
import {createServerClient} from '@supabase/ssr';
export async function proxy(request:NextRequest){
 const locale=request.nextUrl.pathname==='/en'||request.nextUrl.pathname.startsWith('/en/')?'en-CA':'fr-CA';
 const headers=new Headers(request.headers);headers.set('x-site-locale',locale);
 const response=NextResponse.next({request:{headers}});
 if(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY&&request.cookies.getAll().some(c=>c.name.startsWith('sb-'))){
 const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 // Refresh expiring session cookies while verifying signed claims. Route handlers
 // still make every authorisation decision on the server.
 await auth.auth.getClaims();
 response.headers.set('Cache-Control','private, no-store');
 }
 return response;
}
export const config={matcher:['/((?!_next|.*\\..*).*)']};
