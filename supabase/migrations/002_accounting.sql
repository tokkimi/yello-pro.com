create or replace function public.invoice_operation(p_id uuid,p_actor uuid,p_action text,p_amount numeric default 0,p_date text default '',p_reference text default '') returns jsonb language plpgsql security definer set search_path=public as $$
declare r records; t jsonb; paid numeric; amount numeric; entry jsonb; result jsonb;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin' and active) then raise exception 'Accès refusé'; end if;
 select * into r from records where id=p_id and kind='invoice' for update;
 if not found then raise exception 'Facture introuvable'; end if;
 t=r.data->'totals';
 if t is null then raise exception 'Enregistrez les montants avant émission'; end if;
 if p_action='issue' then
  if r.data->>'status'<>'Brouillon' then raise exception 'Facture déjà émise'; end if;
  amount=(t->>'total')::numeric;
  if amount<=0 then raise exception 'Le total doit être positif'; end if;
  entry=jsonb_build_array(jsonb_build_object('account','1100 Clients','debit',amount,'credit',0),jsonb_build_object('account','4000 Revenus','debit',0,'credit',(t->>'net')::numeric),jsonb_build_object('account','2100 TPS à remettre','debit',0,'credit',(t->>'tps')::numeric),jsonb_build_object('account','2110 TVQ à remettre','debit',0,'credit',(t->>'tvq')::numeric));
  result=r.data||jsonb_build_object('status','Émise','paid',0);
 elsif p_action='payment' then
  if r.data->>'status' not in ('Émise','Partiellement payée') then raise exception 'Facture non payable'; end if;
  paid=coalesce((r.data->>'paid')::numeric,0); amount=round(p_amount,2);
  if amount<=0 or amount>(t->>'total')::numeric-paid or p_reference='' then raise exception 'Paiement invalide'; end if;
  paid=paid+amount;
  entry=jsonb_build_array(jsonb_build_object('account','1000 Banque','debit',amount,'credit',0),jsonb_build_object('account','1100 Clients','debit',0,'credit',amount));
  result=r.data||jsonb_build_object('paid',paid,'status',case when paid>=(t->>'total')::numeric then 'Payée' else 'Partiellement payée' end);
 else raise exception 'Opération invalide'; end if;
 insert into records(kind,client_id,project_id,data) values('journal',r.client_id,r.project_id,jsonb_build_object('title',case when p_action='issue' then 'Émission ' else 'Paiement ' end||coalesce(r.data->>'number',''),'date',case when p_date='' then current_date::text else p_date end,'entries',entry,'invoice_id',r.id,'reference',p_reference));
 update records set data=result,version=version+1,updated_at=now() where id=r.id;
 insert into audit_log(actor_id,action,record_id) values(p_actor,p_action,r.id);
 return result;
end; $$;
revoke all on function public.invoice_operation(uuid,uuid,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.invoice_operation(uuid,uuid,text,numeric,text,text) to service_role;
