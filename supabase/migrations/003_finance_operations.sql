alter table public.mgpro_migrations enable row level security;
revoke all on public.mgpro_migrations from anon, authenticated;
create table public.operation_receipts (key uuid primary key, actor_id uuid not null, record_id uuid not null, action text not null, result jsonb not null, created_at timestamptz not null default now());
alter table public.operation_receipts enable row level security;
revoke all on public.operation_receipts from anon, authenticated;
create or replace function public.finance_operation(p_id uuid,p_actor uuid,p_action text,p_key uuid,p_amount numeric default 0,p_date date default current_date,p_reference text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare r records; t jsonb; paid numeric; amount numeric; entry jsonb; result jsonb; receipt operation_receipts; account text; net numeric; tps numeric; tvq numeric; label text;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and active) then raise exception 'Accès refusé'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_key::text,0));
 select * into receipt from operation_receipts where key=p_key;
 if found then
  if receipt.actor_id<>p_actor or receipt.record_id<>p_id or receipt.action<>p_action then raise exception 'Référence déjà utilisée'; end if;
  return receipt.result;
 end if;
 select * into r from records where id=p_id and kind in ('invoice','expense') for update;
 if not found then raise exception 'Document introuvable'; end if;
 if p_date is null then raise exception 'Date obligatoire'; end if;
 if r.kind='invoice' then
  t=r.data->'totals'; if t is null then raise exception 'Montants manquants'; end if;
  amount=round((t->>'total')::numeric,2);
  if p_action='issue' then
   if r.data->>'status'<>'Brouillon' or amount<=0 then raise exception 'Facture déjà émise ou total invalide'; end if;
   entry=jsonb_build_array(jsonb_build_object('account','1100 Clients','debit',amount,'credit',0),jsonb_build_object('account','4000 Revenus','debit',0,'credit',(t->>'net')::numeric),jsonb_build_object('account','2100 TPS à remettre','debit',0,'credit',(t->>'tps')::numeric),jsonb_build_object('account','2110 TVQ à remettre','debit',0,'credit',(t->>'tvq')::numeric));
   result=r.data||jsonb_build_object('status','Émise','paid',0,'issued_at',now());label='Émission ';
  elsif p_action='payment' then
   if r.data->>'status' not in ('Émise','Partiellement payée') then raise exception 'Facture non payable'; end if;
   paid=coalesce((r.data->>'paid')::numeric,0);amount=round(p_amount,2);
   if amount<=0 or amount>(t->>'total')::numeric-paid or trim(p_reference)='' then raise exception 'Paiement invalide'; end if;
   paid=paid+amount;
   entry=jsonb_build_array(jsonb_build_object('account','1000 Banque','debit',amount,'credit',0),jsonb_build_object('account','1100 Clients','debit',0,'credit',amount));
   result=r.data||jsonb_build_object('paid',paid,'status',case when paid>=(t->>'total')::numeric then 'Payée' else 'Partiellement payée' end);label='Paiement ';
  elsif p_action='cancel' then
   if r.data->>'status'<>'Émise' or coalesce((r.data->>'paid')::numeric,0)<>0 or trim(p_reference)='' then raise exception 'Seule une facture émise sans paiement peut être annulée, avec un motif'; end if;
   entry=jsonb_build_array(jsonb_build_object('account','1100 Clients','debit',0,'credit',amount),jsonb_build_object('account','4000 Revenus','debit',(t->>'net')::numeric,'credit',0),jsonb_build_object('account','2100 TPS à remettre','debit',(t->>'tps')::numeric,'credit',0),jsonb_build_object('account','2110 TVQ à remettre','debit',(t->>'tvq')::numeric,'credit',0));
   result=r.data||jsonb_build_object('status','Annulée','cancelled_at',now(),'cancellation_reason',p_reference);label='Annulation ';
  else raise exception 'Opération invalide'; end if;
 else
  net=round(coalesce((r.data->>'net')::numeric,0),2);tps=round(coalesce((r.data->>'tps')::numeric,0),2);tvq=round(coalesce((r.data->>'tvq')::numeric,0),2);amount=net+tps+tvq;
  if net<0 or tps<0 or tvq<0 or amount<=0 then raise exception 'Montants de dépense invalides'; end if;
  if p_action='post_expense' then
   if coalesce((r.data->>'posted')::boolean,false) then raise exception 'Dépense déjà comptabilisée'; end if;
   account=case r.data->>'category' when 'Matériaux' then '5000 Matériaux' when 'Sous-traitance' then '5100 Sous-traitance' when 'Équipement' then '5200 Équipement' when 'Transport' then '5300 Transport' when 'Assurance' then '6000 Assurance' else '6100 Administration et autres charges' end;
   entry=jsonb_build_array(jsonb_build_object('account',account,'debit',net,'credit',0),jsonb_build_object('account','1200 TPS récupérable','debit',tps,'credit',0),jsonb_build_object('account','1210 TVQ récupérable','debit',tvq,'credit',0),jsonb_build_object('account',case when r.data->>'status'='Payée' then '1000 Banque' else '2000 Fournisseurs' end,'debit',0,'credit',amount));
   result=r.data||jsonb_build_object('posted',true,'posted_at',now());label='Dépense ';
  elsif p_action='pay_expense' then
   if not coalesce((r.data->>'posted')::boolean,false) or r.data->>'status'<>'À payer' or trim(p_reference)='' then raise exception 'Dépense non payable ou référence manquante'; end if;
   entry=jsonb_build_array(jsonb_build_object('account','2000 Fournisseurs','debit',amount,'credit',0),jsonb_build_object('account','1000 Banque','debit',0,'credit',amount));
   result=r.data||jsonb_build_object('status','Payée','paid_at',p_date);label='Paiement fournisseur ';
  else raise exception 'Opération invalide'; end if;
 end if;
 if abs((select sum((e->>'debit')::numeric-(e->>'credit')::numeric) from jsonb_array_elements(entry) e))>0.001 then raise exception 'Écriture déséquilibrée'; end if;
 insert into records(kind,client_id,project_id,data) values('journal',r.client_id,r.project_id,jsonb_build_object('title',label||coalesce(r.data->>'number',r.data->>'title',''),'date',p_date::text,'entries',entry,'source_id',r.id,'operation',p_action,'reference',p_reference));
 update records set data=result,version=version+1,updated_at=now() where id=r.id;
 insert into audit_log(actor_id,action,record_id,details) values(p_actor,p_action,r.id,jsonb_build_object('reference',p_reference,'date',p_date));
 insert into operation_receipts(key,actor_id,record_id,action,result) values(p_key,p_actor,p_id,p_action,result);
 return result;
end; $$;
revoke all on function public.finance_operation(uuid,uuid,text,uuid,numeric,date,text) from public,anon,authenticated;
grant execute on function public.finance_operation(uuid,uuid,text,uuid,numeric,date,text) to service_role;
