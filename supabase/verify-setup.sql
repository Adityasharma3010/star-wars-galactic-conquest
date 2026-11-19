select jsonb_build_object(
 'public_tables',(select count(*) from pg_tables where schemaname='public'),
 'rls_enabled_tables',(select count(*) from pg_tables where schemaname='public' and rowsecurity),
 'policies',(select count(*) from pg_policies where schemaname='public'),
 'indexes',(select count(*) from pg_indexes where schemaname='public'),
 'rpc_functions',(select jsonb_agg(proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'galactic_%'),
 'migrations',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'properties',(select count(*) from properties),
 'cards',(select count(*) from card_definitions),
 'realtime_tables',(select jsonb_agg(tablename) from pg_publication_tables where pubname='supabase_realtime' and schemaname='public'),
 'buckets',(select jsonb_agg(jsonb_build_object('id',id,'public',public)) from storage.buckets),
 'anon_commit_permission',has_function_privilege('anon','public.galactic_commit(uuid,jsonb,integer,jsonb,jsonb)','execute'),
 'authenticated_commit_permission',has_function_privilege('authenticated','public.galactic_commit(uuid,jsonb,integer,jsonb,jsonb)','execute'),
 'private_schema_client_access',has_schema_privilege('authenticated','galactic_private','usage')
) as verification;
