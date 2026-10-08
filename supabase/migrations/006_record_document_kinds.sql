-- Enable document kinds already supported by the workspace.
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check check (kind in (
 'client','request','project','phase','contract','specification','task','visit',
 'quote','partner_quote','invoice','expense','message','document','settings','journal'
));
