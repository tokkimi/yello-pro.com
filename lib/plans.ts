export const features={projects:'Projets et tâches',contacts:'Contacts',calendar:'Calendrier',files:'Fichiers et notes',quotes:'Devis et catalogue',invoices:'Factures et paiements',contracts:'Contrats et signatures',visits:'Visites, photos et notes vocales',portal:'Portail client',expenses:'Dépenses',schedule:'Échéancier de chantier',timesheets:'Feuilles de temps',procurement:'Demandes de prix et achats',health:'Santé des projets et budgets',reports:'Rapports et exports comptables',automation:'Routines et IA'} as const;
export type Feature=keyof typeof features;
const basics:Feature[]=['projects','contacts','calendar','files'];
const business:Feature[]=[...basics,'quotes','invoices','contracts','visits','portal','expenses'];
const team:Feature[]=[...business,'schedule','timesheets','procurement','health','reports'];
export const plans=[
 {code:'essential',name:'Essentiel',description:'Organiser son activité sans la complexité.',monthly:19,annual:180,admins:1,workers:2,projects:5,storageGB:2,features:basics},
 {code:'business',name:'Business',description:'Du premier rendez-vous à la facture finale.',monthly:179,annual:1788,admins:2,workers:5,projects:30,storageGB:20,features:business},
 {code:'team',name:'Équipe',description:'Coordonner les équipes, les achats et les marges.',monthly:399,annual:3948,admins:5,workers:15,projects:100,storageGB:100,features:team},
 {code:'scale',name:'Scale',description:'Piloter plusieurs équipes avec les outils avancés.',monthly:699,annual:6948,admins:10,workers:30,projects:300,storageGB:250,features:[...team,'automation'] as Feature[]}
] as const;
export type PlanCode=typeof plans[number]['code'];
export function planFrom(code:unknown){return plans.find(p=>p.code===code)||plans[0]}
export function canUse(code:unknown,feature:Feature){return (planFrom(code).features as readonly Feature[]).includes(feature)}
export const formatPrice=(amount:number)=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(amount);
