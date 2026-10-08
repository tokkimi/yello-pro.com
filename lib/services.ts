/** Which external services are really configured. Only booleans leave the server, never a value. */
export function serviceStatus(env:Record<string,string|undefined>=process.env){
 const has=(key:string)=>typeof env[key]==='string'&&env[key]!.trim().length>0;
 return [
  {id:'database',label:'Base de données et stockage (Supabase)',ready:has('NEXT_PUBLIC_SUPABASE_URL')&&has('SUPABASE_SERVICE_ROLE_KEY'),missing:['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].filter(k=>!has(k)),effect:'Sans elle, seul le mode démonstration fonctionne.'},
  {id:'email',label:'Envoi de courriels (Resend)',ready:has('RESEND_API_KEY')&&has('MAIL_FROM')&&env.MAIL_DOMAIN_VERIFIED!=='false',missing:[...['RESEND_API_KEY','MAIL_FROM'].filter(k=>!has(k)),...(env.MAIL_DOMAIN_VERIFIED==='false'?['Validation DNS du domaine d’envoi dans Resend']:[])],effect:'Sans ce service, aucun document, rappel ou invitation n’est envoyé ; les statuts restent des suivis manuels.'},
  {id:'ai',label:'Analyse IA des notes et soumissions (Anthropic)',ready:has('ANTHROPIC_API_KEY'),missing:has('ANTHROPIC_API_KEY')?[]:['ANTHROPIC_API_KEY'],effect:'Sans clé, l’analyse utilise un repli déterministe annoncé comme tel.'},
  {id:'site',label:'Adresse publique du site',ready:has('NEXT_PUBLIC_SITE_URL'),missing:has('NEXT_PUBLIC_SITE_URL')?[]:['NEXT_PUBLIC_SITE_URL'],effect:'Utilisée pour les liens absolus (sitemap, liens partagés).'},
  {id:'cron',label:'Tâches quotidiennes (rappels automatiques, routines)',ready:has('CRON_SECRET'),missing:has('CRON_SECRET')?[]:['CRON_SECRET'],effect:'Sans ce secret, la tâche planifiée refuse de s’exécuter : aucun rappel ni routine automatique.'},
  {id:'sms',label:'SMS',ready:false,missing:['Aucun fournisseur SMS intégré'],effect:'Les préférences SMS restent désactivées.'},
  {id:'accounting',label:'QuickBooks / Zapier',ready:false,missing:['Aucune connexion OAuth intégrée'],effect:'Les exports CSV/ZIP restent la voie de transfert comptable.'}
 ];
}
