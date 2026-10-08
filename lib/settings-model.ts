import {defaultPaymentSchedule,type Data,type PaymentStep} from './model';

const text=(value:unknown,fallback='',max=4000)=>typeof value==='string'?value.slice(0,max):fallback;
const bool=(value:unknown,fallback:boolean)=>typeof value==='boolean'?value:fallback;
const oneOf=<T extends string>(value:unknown,allowed:readonly T[],fallback:T):T=>allowed.includes(value as T)?value as T:fallback;

export function brandingFrom(value:unknown){
 const x=(value&&typeof value==='object'?value:{}) as Data;
 return {logo:typeof x.logo==='string'&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(x.logo)&&x.logo.length<=300000?x.logo:'',showLogo:bool(x.showLogo,true),showCompanyAddress:bool(x.showCompanyAddress,true),showCompanyEmail:bool(x.showCompanyEmail,true),showCompanyPhone:bool(x.showCompanyPhone,true),showContactName:bool(x.showContactName,true),showWebsite:bool(x.showWebsite,true),showClientName:bool(x.showClientName,true),showClientCompany:bool(x.showClientCompany,true),showBillingAddress:bool(x.showBillingAddress,true),colorAccent:bool(x.colorAccent,true),contactName:text(x.contactName,'',100),contactEmail:text(x.contactEmail,'',160),contactPhone:text(x.contactPhone,'',50),website:text(x.website,'',250),accent:/^#[0-9a-f]{6}$/i.test(String(x.accent))?String(x.accent):'#466952',header:oneOf(x.header,['classic','compact'] as const,'classic'),showLicence:bool(x.showLicence,true),showTaxNumbers:bool(x.showTaxNumbers,true),showClientPhone:bool(x.showClientPhone,true),showClientEmail:bool(x.showClientEmail,true),contactOverride:text(x.contactOverride,'',600),emailSameColor:bool(x.emailSameColor,true),emailLogo:oneOf(x.emailLogo,['top','signature','none'] as const,'top'),signature:text(x.signature,'L’équipe Yello Pro',1200)};
}
export const defaultUnits=['unité','forfait','h','pi²','m²','pi lin.','m','pi³','m³','lb','kg','jour'];
export function projectSettingsFrom(settings:Data){
 const types=Array.isArray(settings.project_types)&&settings.project_types.length?settings.project_types.map((x:unknown)=>text(x,'',80)):['Général','Cuisine','Salle de bain','Sous-sol','Agrandissement'];
 const schedule:PaymentStep[]=Array.isArray(settings.payment_schedule)&&settings.payment_schedule.length?settings.payment_schedule.map((x:Data)=>({label:text(x?.label,'Étape',80),percent:Number(x?.percent)||0})):defaultPaymentSchedule.map(x=>({...x}));
 const validity=Number(settings.validity_days)||Number(String(settings.validity||'').match(/\d+/)?.[0])||30;
 return {project_types:types as string[],default_project_type:types.includes(settings.default_project_type)?String(settings.default_project_type):types[0],payment_schedule:schedule,validity_days:Math.min(365,Math.max(1,validity)),holdback_percent:Math.min(20,Math.max(0,Number(settings.holdback_percent)||0)),work_week:Array.isArray(settings.work_week)&&settings.work_week.length?settings.work_week.map(Number).filter((x:number)=>x>=1&&x<=7):[1,2,3,4,5],holidays:Array.isArray(settings.holidays)?settings.holidays.map((x:unknown)=>text(x,'',10)):[],units:Array.isArray(settings.units)&&settings.units.length?settings.units.map((x:unknown)=>text(x,'',30)):[...defaultUnits]};
}
/** Working-day test shared by schedules: ISO weekday 1 = Monday … 7 = Sunday. */
export function isWorkingDay(date:string,workWeek:number[],holidays:string[]){const day=new Date(date+'T12:00:00Z').getUTCDay()||7;return workWeek.includes(day)&&!holidays.includes(date)}

export function aiPreferencesFrom(value:unknown){
 const x=(value&&typeof value==='object'?value:{}) as Data;
 return {tone:oneOf(x.tone,['professional','friendly','concise'] as const,'professional'),detail:oneOf(x.detail,['short','standard','detailed'] as const,'standard'),splitLabour:bool(x.splitLabour,true),listAssumptions:bool(x.listAssumptions,true),listMissing:bool(x.listMissing,true),neverInventPrices:bool(x.neverInventPrices,true),instructions:text(x.instructions,'',2000)};
}
/** Consignes ajoutées au prompt système de l'analyse IA. */
export function aiInstructions(value:unknown){
 const p=aiPreferencesFrom(value);
 const tone={professional:'professionnel',friendly:'chaleureux',concise:'concis'}[p.tone],detail={short:'courtes',standard:'standard',detailed:'détaillées'}[p.detail];
 return [`Ton ${tone}, descriptions ${detail}.`,p.splitLabour&&'Sépare matériaux et main-d’œuvre.',p.listAssumptions&&'Liste les hypothèses retenues.',p.listMissing&&'Signale les informations manquantes.',p.neverInventPrices&&'N’invente aucun prix : laisse 0 lorsqu’aucune référence n’est fournie.',p.instructions&&`Consignes de l’entreprise : ${p.instructions}`].filter(Boolean).join(' ');
}

export type JournalQuestion={id:string;title:string;type:'text'|'yesno';active:boolean;required:boolean};
export const defaultJournalQuestions:JournalQuestion[]=[
 {id:'done',title:'Travaux complétés',type:'text',active:true,required:true},
 {id:'crew',title:'Équipe présente',type:'text',active:true,required:false},
 {id:'missing',title:'Matériaux manquants',type:'text',active:true,required:false},
 {id:'issues',title:'Problèmes rencontrés',type:'text',active:true,required:false},
 {id:'delay',title:'Retard prévu',type:'yesno',active:true,required:false}
];
export function employeePortalFrom(value:unknown){
 const x=(value&&typeof value==='object'?value:{}) as Data;
 const questions=Array.isArray(x.questions)?x.questions.filter((q:unknown)=>q&&typeof q==='object').map((q:Data)=>({id:text(q.id,'',60)||crypto.randomUUID(),title:text(q.title,'',160),type:oneOf(q.type,['text','yesno'] as const,'text'),active:bool(q.active,true),required:bool(q.required,false)})):defaultJournalQuestions.map(q=>({...q}));
 return {projectVisibility:oneOf(x.projectVisibility,['assigned','active_assigned'] as const,'assigned'),costCodes:oneOf(x.costCodes,['all','quote','none'] as const,'all'),questions};
}
/** Required, active questions without an answer. */
export function journalAnswerErrors(questions:JournalQuestion[],answers:Record<string,unknown>){return questions.filter(q=>q.active&&q.required&&!String(answers[q.id]??'').trim()).map(q=>`Répondez à « ${q.title} ».`)}
