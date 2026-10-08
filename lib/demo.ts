import {RecordItem,Kind,Data,defaults} from './model';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const row=(n:number,kind:Kind,data:Data,client:number|null=null,project:number|null=null):RecordItem=>({id:id(n),kind,data,client_id:client?id(client):null,project_id:project?id(project):null,version:1,created_at:'2026-09-14T09:00:00Z',updated_at:'2026-09-14T09:00:00Z'});
export const demoRecords:RecordItem[]=[
row(1,'client',{name:'Camille Laurent',email:'camille@example.com',phone:'514-555-0101',address:'Maison de démonstration · Sainte-Rose, Laval',notes:'Cuisine ouverte, matériaux naturels. Préfère être contactée par courriel.',status:'Actif'}),
row(2,'client',{name:'Alex Martin',email:'alex@example.com',phone:'514-555-0102',address:'Maison de démonstration · Montréal',status:'Actif'}),
row(3,'client',{name:'Sophie Dubois',email:'sophie@example.com',phone:'450-555-0103',address:'Maison de démonstration · Blainville',status:'Prospect'}),
row(11,'project',{title:'Une nouvelle cuisine à Sainte-Rose',service:'Cuisine',status:'En cours',start:'2026-09-07',end:'2026-10-09',budget:42500,notes:'Cuisine ouverte avec îlot central et comptoir en quartz.',address:'Sainte-Rose, Laval',geo:{lat:45.6106,lon:-73.7866,label:'Sainte-Rose, Laval (centre du secteur, démonstration)',source:'demo'}},1),
row(12,'project',{title:'Salle de bain · Montréal',service:'Salle de bain',status:'En cours',start:'2026-09-10',end:'2026-09-30',budget:24800,address:'Montréal',geo:{lat:45.5019,lon:-73.5674,label:'Montréal (centre-ville, démonstration)',source:'demo'}},2),
row(13,'project',{title:'Aménagement du sous-sol',service:'Sous-sol',status:'Planifié',start:'2026-10-05',end:'2026-11-02',budget:38000,address:'Blainville'},3),
row(21,'task',{title:'Valider le choix du comptoir',status:'À faire',due:'2026-09-16',assignee:'Alex Demo',priority:'Haute',description:'Présenter les échantillons et confirmer la teinte.'},1,11),
row(22,'task',{title:'Installer les armoires basses',status:'En cours',due:'2026-09-18',assignee:'Équipe chantier',priority:'Normale',description:'Vérifier le niveau, les alignements et les réservations.'},1,11),
row(23,'task',{title:'Vérifier l’étanchéité de la douche',status:'À valider',due:'2026-09-15',assignee:'Équipe chantier',priority:'Haute',completion_note:'Test réalisé. À contrôler avant pose des carreaux.'},2,12),
row(24,'task',{title:'Protection des surfaces',status:'Validée',due:'2026-09-10',assignee:'Équipe chantier',priority:'Normale'},1,11),
row(31,'request',{name:'Sophie Dubois',email:'sophie@example.com',phone:'450-555-0103',address:'Blainville',service:'Sous-sol',budget:'25 000 à 50 000 $',timeline:'Dans les 3 mois',description:'Créer une salle familiale et un espace de travail.',status:'Nouvelle',source:'Site web'}),
row(32,'request',{name:'Thomas Robert',email:'thomas@example.com',phone:'514-555-0104',address:'Laval',service:'Salle de bain',budget:'25 000 à 50 000 $',timeline:'Cette année',description:'Remplacer la baignoire par une douche et moderniser la pièce.',status:'À contacter',source:'Site web'}),
row(41,'visit',{title:'Visite cuisine — Camille Laurent',date:'2026-09-14',status:'En cours',notes:'Conserver la fenêtre existante. Prévoir un éclairage sous les armoires.',scope:'Dépose, électricité, plomberie, armoires et comptoir.',constraints:'La famille habite sur place. Protéger le passage vers le salon.',materials:'Quartz clair, chêne naturel',rooms:[{name:'Cuisine',length:14,width:12,height:8,unit:'pi',notes:'Îlot de 7 pieds. Deux prises supplémentaires.'}]},1,11),
row(51,'quote',{number:'DEV-2026-001',title:'Cuisine à Sainte-Rose',status:'Envoyé',date:'2026-09-12',lines:[{description:'Préparation et démolition',quantity:1,unit:'forfait',price:2800},{description:'Armoires et installation',quantity:1,unit:'forfait',price:18500},{description:'Comptoir de quartz',quantity:48,unit:'pi²',price:125},{description:'Électricité et plomberie',quantity:1,unit:'forfait',price:5400}],tps:5,tvq:9.975,discount:0,terms:defaults.terms},1,11),
row(52,'quote',{number:'DEV-2026-002',title:'Salle de bain',status:'Brouillon',date:'2026-09-14',lines:[{description:'Rénovation complète de la salle de bain',quantity:1,unit:'forfait',price:24800}],tps:5,tvq:9.975,discount:0,terms:defaults.terms},2,12),
row(61,'invoice',{number:'FAC-2026-001',title:'Acompte — cuisine',status:'Émise',date:'2026-09-12',due:'2026-09-26',lines:[{description:'Acompte de démarrage',quantity:1,unit:'forfait',price:10000}],tps:5,tvq:9.975,paid:0},1,11),
row(71,'expense',{title:'Matériaux de protection',supplier:'Fournisseur démo',date:'2026-09-12',category:'Matériaux',net:450,tps:22.5,tvq:44.89,total:517.39,status:'Payée'},1,11),
row(81,'message',{body:'Bonjour, est-ce que nous pouvons voir les échantillons de quartz lors de la prochaine visite ?',sender:'Camille Laurent',visibility:'client'},1,11),
row(82,'message',{body:'Bonjour Camille, oui, nous les apporterons à la visite de mercredi.',sender:'Alex Demo',visibility:'client'},1,11),
row(91,'settings',defaults)
];
export const demoUser={id:id(100),name:'Alex Demo',email:'',role:'admin' as const,client_id:null};
