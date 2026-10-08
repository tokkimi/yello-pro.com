import {db,identity} from './supabase';
import {canUse,planFrom,type Feature} from './plans';
export function subscriptionUsable(sub:any,at=new Date()){if(!sub)return false;if(sub.status==='trialing')return !!sub.trial_ends_at&&new Date(sub.trial_ends_at)>at;return sub.status==='active'&&(!sub.period_end||new Date(sub.period_end)>at)}
export async function subscription(){return (await (await db()).from('subscriptions').select('*').maybeSingle()).data}
export async function featureAllowed(feature:Feature){if((await identity())?.platform_owner)return true;const sub=await subscription();return subscriptionUsable(sub)&&canUse(sub?.plan_code,feature)}
export function featureForKind(kind:string):Feature|undefined{return ({quote:'quotes',invoice:'invoices',contract:'contracts',specification:'contracts',visit:'visits',expense:'expenses',journal:'reports',partner_quote:'procurement'} as Record<string,Feature>)[kind]}
