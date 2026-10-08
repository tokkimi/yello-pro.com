/** Only explicitly configured Auth UUIDs can manage the whole SaaS. Enterprise admins cannot. */
export function isPlatformOwner(id:unknown,allowlist=process.env.YELLO_PLATFORM_ADMIN_IDS||''){
 return typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)&&allowlist.split(',').map(x=>x.trim()).filter(Boolean).includes(id);
}
