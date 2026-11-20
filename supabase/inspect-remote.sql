select
  jsonb_build_object(
    'schemas',
    (
      select
        jsonb_agg(nspname)
      from
        pg_namespace
      where
        nspname not like 'pg_%'
    ),
    'public_tables',
    (
      select
        coalesce(
          jsonb_agg(
            jsonb_build_object('name', tablename, 'rls', rowsecurity)
          ),
          '[]'::jsonb
        )
      from
        pg_tables
      where
        schemaname = 'public'
    ),
    'public_functions',
    (
      select
        coalesce(jsonb_agg(proname), '[]'::jsonb)
      from
        pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
      where
        n.nspname = 'public'
    ),
    'public_policies',
    (
      select
        coalesce(
          jsonb_agg(
            jsonb_build_object('table', tablename, 'policy', policyname)
          ),
          '[]'::jsonb
        )
      from
        pg_policies
      where
        schemaname = 'public'
    ),
    'migration_history',
    to_regclass('supabase_migrations.schema_migrations'),
    'existing_auth_users',
    (
      select
        count(*)
      from
        auth.users
    )
  ) as environment;
