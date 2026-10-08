-- The application authorizes and scopes requests before using service_role.
-- Restore server table access on freshly provisioned projects without granting
-- any additional privileges to anon or authenticated browser clients.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
