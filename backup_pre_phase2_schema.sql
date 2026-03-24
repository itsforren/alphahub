--
-- PostgreSQL database dump
--

\restrict Y0blzfj16VdypVpVFDP5q9FeDjEfgn9bP1ne7NnH9koU3ehZaDMRedMKbtPok4F

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA supabase_migrations;


ALTER SCHEMA supabase_migrations OWNER TO postgres;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: app_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'member',
    'guest',
    'client',
    'referrer'
);


ALTER TYPE public.app_role OWNER TO postgres;

--
-- Name: billing_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.billing_status AS ENUM (
    'pending',
    'paid',
    'overdue',
    'cancelled',
    'charging'
);


ALTER TYPE public.billing_status OWNER TO postgres;

--
-- Name: billing_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.billing_type AS ENUM (
    'ad_spend',
    'management'
);


ALTER TYPE public.billing_type OWNER TO postgres;

--
-- Name: onboarding_check_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.onboarding_check_status AS ENUM (
    'pending',
    'yes',
    'no'
);


ALTER TYPE public.onboarding_check_status OWNER TO postgres;

--
-- Name: onboarding_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.onboarding_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'error',
    'automation_complete'
);


ALTER TYPE public.onboarding_status OWNER TO postgres;

--
-- Name: referral_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.referral_status AS ENUM (
    'pending',
    'signed_up',
    'active',
    'churned'
);


ALTER TYPE public.referral_status OWNER TO postgres;

--
-- Name: reward_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reward_status AS ENUM (
    'pending',
    'approved',
    'paid',
    'cancelled'
);


ALTER TYPE public.reward_status OWNER TO postgres;

--
-- Name: ticket_priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ticket_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


ALTER TYPE public.ticket_priority OWNER TO postgres;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: activate_referral_on_prospect_conversion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.activate_referral_on_prospect_conversion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_referral_record RECORD;
BEGIN
  -- Only proceed if client_id was just set (changed from NULL to a value)
  IF NEW.client_id IS NOT NULL AND (OLD.client_id IS NULL OR OLD.client_id IS DISTINCT FROM NEW.client_id) THEN
    -- Set converted_at if not already set
    IF NEW.converted_at IS NULL THEN
      NEW.converted_at := now();
    END IF;
    
    -- Look for a pending referral by email
    SELECT id, referrer_client_id INTO v_referral_record
    FROM referrals
    WHERE LOWER(referred_email) = LOWER(NEW.email)
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_referral_record.id IS NOT NULL THEN
      -- Prevent self-referral
      IF v_referral_record.referrer_client_id IS DISTINCT FROM NEW.client_id THEN
        -- Update the referral to active
        UPDATE referrals
        SET 
          referred_client_id = NEW.client_id,
          status = 'active',
          activated_at = now(),
          updated_at = now()
        WHERE id = v_referral_record.id;
        
        RAISE NOTICE 'Referral % activated for client %', v_referral_record.id, NEW.client_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.activate_referral_on_prospect_conversion() OWNER TO postgres;

--
-- Name: auto_assign_ticket(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_assign_ticket() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Auto-assign if not already assigned
  IF NEW.assigned_to IS NULL THEN
    NEW.assigned_to := get_support_agent_for_category(NEW.category);
    IF NEW.assigned_to IS NOT NULL THEN
      NEW.assigned_at := now();
    END IF;
  END IF;
  
  -- Calculate SLA deadline if not set
  IF NEW.sla_deadline IS NULL THEN
    NEW.sla_deadline := calculate_sla_deadline(NEW.category, NEW.priority);
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_assign_ticket() OWNER TO postgres;

--
-- Name: auto_generate_referral_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_generate_referral_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM get_or_create_referral_code(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.auto_generate_referral_code() OWNER TO postgres;

--
-- Name: calculate_sla_deadline(text, public.ticket_priority); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_sla_deadline(p_category text, p_priority public.ticket_priority) RETURNS timestamp with time zone
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_hours integer;
BEGIN
  -- Onboarding issues get 24 hours
  IF p_category = 'onboarding' THEN
    v_hours := 24;
  -- High/urgent priority get shorter SLA
  ELSIF p_priority = 'urgent' THEN
    v_hours := 4;
  ELSIF p_priority = 'high' THEN
    v_hours := 12;
  -- Normal tickets get 48 hours
  ELSE
    v_hours := 48;
  END IF;
  
  RETURN now() + (v_hours || ' hours')::interval;
END;
$$;


ALTER FUNCTION public.calculate_sla_deadline(p_category text, p_priority public.ticket_priority) OWNER TO postgres;

--
-- Name: check_stage_completion_and_notify(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_stage_completion_and_notify() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_client record;
  v_category text;
  v_total_items int;
  v_completed_items int;
  v_conversation_id uuid;
  v_first_name text;
  v_manager_name text;
  v_message text;
  v_stages_sent jsonb;
BEGIN
  -- Only proceed if status changed to 'yes'
  IF NEW.status != 'yes' OR (OLD IS NOT NULL AND OLD.status = 'yes') THEN
    RETURN NEW;
  END IF;
  
  v_category := NEW.category;
  
  -- Count items in this category
  SELECT COUNT(*) INTO v_total_items
  FROM onboarding_checklist
  WHERE client_id = NEW.client_id AND category = v_category;
  
  -- Count completed items
  SELECT COUNT(*) INTO v_completed_items
  FROM onboarding_checklist
  WHERE client_id = NEW.client_id AND category = v_category AND status = 'yes';
  
  -- Only proceed if all items in category are complete
  IF v_completed_items < v_total_items THEN
    RETURN NEW;
  END IF;
  
  -- Get client details
  SELECT * INTO v_client FROM clients WHERE id = NEW.client_id;
  
  IF v_client IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if message already sent for this stage
  v_stages_sent := COALESCE(v_client.stage_messages_sent, '{}'::jsonb);
  IF v_stages_sent ? v_category THEN
    RETURN NEW;
  END IF;
  
  -- Get or create conversation
  SELECT id INTO v_conversation_id
  FROM chat_conversations
  WHERE client_id = NEW.client_id;
  
  IF v_conversation_id IS NULL THEN
    INSERT INTO chat_conversations (client_id)
    VALUES (NEW.client_id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  -- Build personalized message
  v_first_name := split_part(COALESCE(v_client.name, 'there'), ' ', 1);
  v_manager_name := COALESCE(v_client.success_manager_name, 'Your Success Manager');
  
  CASE v_category
    WHEN 'hub_setup' THEN
      v_message := 'Hey ' || v_first_name || '! 🎉 Just wanted to let you know we have completed all the steps to have your Hub setup and functioning correctly. We will be moving on to the next step!';
    WHEN 'google_ads' THEN
      v_message := 'Hey ' || v_first_name || '! 📈 Great news! Your Google Ads campaign has been set up and configured. We''re ready to start driving leads your way once everything else is in place!';
    WHEN 'crm_account' THEN
      v_message := 'Hey ' || v_first_name || '! 💼 Your CRM account is now fully set up! You''ll be able to manage all your leads and client communications from here. On to the next step!';
    WHEN 'funnel_testing' THEN
      v_message := 'Hey ' || v_first_name || '! ✅ We''ve finished testing your funnels and everything is working perfectly. Your lead capture system is ready to go!';
    WHEN 'compliance' THEN
      v_message := 'Hey ' || v_first_name || '! 📋 All compliance items have been checked off. You''re all clear on the regulatory side!';
    WHEN 'billing_docs' THEN
      v_message := 'Hey ' || v_first_name || '! 💳 Your billing and documentation is all set up. Almost there!';
    WHEN 'final_onboarding' THEN
      v_message := 'Hey ' || v_first_name || '! 🚀 Congratulations! All onboarding steps are complete. Your ads are about to go live and you''re ready to start receiving leads! Let''s crush it!';
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Insert the message
  INSERT INTO chat_messages (
    conversation_id,
    sender_id,
    sender_name,
    sender_role,
    sender_avatar_url,
    message
  ) VALUES (
    v_conversation_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_manager_name,
    'admin',
    v_client.success_manager_image_url,
    v_message
  );
  
  -- Mark stage message as sent
  UPDATE clients 
  SET stage_messages_sent = COALESCE(stage_messages_sent, '{}'::jsonb) || jsonb_build_object(v_category, now())
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_stage_completion_and_notify() OWNER TO postgres;

--
-- Name: enroll_all_users_on_publish(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enroll_all_users_on_publish() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN INSERT INTO enrollments (user_id, course_id, granted_at) SELECT u.id, NEW.id, NOW() FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = u.id AND e.course_id = NEW.id AND e.revoked_at IS NULL); END IF; RETURN NEW; END; $$;


ALTER FUNCTION public.enroll_all_users_on_publish() OWNER TO postgres;

--
-- Name: generate_referral_code(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_referral_code(client_name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  base_code text;
  full_code text;
  code_exists boolean;
  counter integer := 0;
BEGIN
  -- Remove special characters and spaces, keep letters only
  base_code := regexp_replace(client_name, '[^a-zA-Z]', '', 'g');
  full_code := base_code;
  
  -- Check for uniqueness, add number suffix if needed
  LOOP
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE LOWER(code) = LOWER(full_code)) INTO code_exists;
    IF NOT code_exists THEN EXIT; END IF;
    counter := counter + 1;
    full_code := base_code || counter::text;
    IF counter > 100 THEN EXIT; END IF;
  END LOOP;
  
  RETURN full_code;
END;
$$;


ALTER FUNCTION public.generate_referral_code(client_name text) OWNER TO postgres;

--
-- Name: get_or_create_conversation(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_or_create_conversation(p_client_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  SELECT id INTO v_conversation_id
  FROM public.chat_conversations
  WHERE client_id = p_client_id;
  
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.chat_conversations (client_id)
    VALUES (p_client_id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$;


ALTER FUNCTION public.get_or_create_conversation(p_client_id uuid) OWNER TO postgres;

--
-- Name: get_or_create_partner_referral_code(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_or_create_partner_referral_code(p_partner_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code TEXT;
  v_partner_name TEXT;
BEGIN
  -- Check if code already exists
  SELECT code INTO v_code
  FROM referral_codes
  WHERE partner_id = p_partner_id AND is_active = true;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Get partner name for code generation
  SELECT first_name || last_name INTO v_partner_name 
  FROM referral_partners 
  WHERE id = p_partner_id;
  
  -- Generate new code using existing function
  v_code := generate_referral_code(v_partner_name);
  
  -- Insert new referral code
  INSERT INTO referral_codes (partner_id, code)
  VALUES (p_partner_id, v_code);
  
  -- Update partner with their referral code
  UPDATE referral_partners SET referral_code = v_code WHERE id = p_partner_id;
  
  RETURN v_code;
END;
$$;


ALTER FUNCTION public.get_or_create_partner_referral_code(p_partner_id uuid) OWNER TO postgres;

--
-- Name: get_or_create_referral_code(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_or_create_referral_code(p_client_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code TEXT;
  v_client_name TEXT;
BEGIN
  -- Check if code already exists
  SELECT code INTO v_code
  FROM referral_codes
  WHERE client_id = p_client_id AND is_active = true;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Get client name for code generation
  SELECT name INTO v_client_name FROM clients WHERE id = p_client_id;
  
  -- Generate new code
  v_code := generate_referral_code(v_client_name);
  
  -- Insert new referral code
  INSERT INTO referral_codes (client_id, code)
  VALUES (p_client_id, v_code);
  
  -- Update client with their referral code
  UPDATE clients SET referral_code = v_code WHERE id = p_client_id;
  
  RETURN v_code;
END;
$$;


ALTER FUNCTION public.get_or_create_referral_code(p_client_id uuid) OWNER TO postgres;

--
-- Name: get_support_agent_for_category(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_support_agent_for_category(p_category text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_agent_user_id uuid;
BEGIN
  -- First try to find an agent that handles this category
  SELECT user_id INTO v_agent_user_id
  FROM public.support_agents
  WHERE is_active = true 
    AND p_category = ANY(categories)
  ORDER BY created_at
  LIMIT 1;
  
  -- If no category match, get the default agent
  IF v_agent_user_id IS NULL THEN
    SELECT user_id INTO v_agent_user_id
    FROM public.support_agents
    WHERE is_active = true AND is_default = true
    LIMIT 1;
  END IF;
  
  RETURN v_agent_user_id;
END;
$$;


ALTER FUNCTION public.get_support_agent_for_category(p_category text) OWNER TO postgres;

--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'member' THEN 2 
      WHEN 'client' THEN 3
      WHEN 'referrer' THEN 4
      WHEN 'guest' THEN 5 
    END
  LIMIT 1
$$;


ALTER FUNCTION public.get_user_role(_user_id uuid) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    now()
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'guest');
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: handle_user_login(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_user_login() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.profiles
  SET last_login_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_user_login() OWNER TO postgres;

--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION public.has_role(_user_id uuid, _role public.app_role) OWNER TO postgres;

--
-- Name: increment_pipeline_metric(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_pipeline_metric(p_agent_id text, p_stage text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.lead_pipeline_metrics (metric_date, agent_id, stage, count)
  VALUES (CURRENT_DATE, p_agent_id, p_stage, 1)
  ON CONFLICT (metric_date, agent_id, stage)
  DO UPDATE SET 
    count = lead_pipeline_metrics.count + 1,
    updated_at = now();
END;
$$;


ALTER FUNCTION public.increment_pipeline_metric(p_agent_id text, p_stage text) OWNER TO postgres;

--
-- Name: increment_stat(text, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_stat(key text, amount numeric DEFAULT 1) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_value NUMERIC;
BEGIN
  UPDATE public.live_stats 
  SET stat_value = stat_value + amount, last_updated = now()
  WHERE stat_key = key
  RETURNING stat_value INTO new_value;
  
  RETURN new_value;
END;
$$;


ALTER FUNCTION public.increment_stat(key text, amount numeric) OWNER TO postgres;

--
-- Name: initialize_onboarding_checklist(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.initialize_onboarding_checklist(p_client_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only insert if no items exist for this client
  IF NOT EXISTS (SELECT 1 FROM onboarding_checklist WHERE client_id = p_client_id) THEN
    INSERT INTO onboarding_checklist (client_id, category, item_key, item_label, display_order) VALUES
    -- Hub Setup (category: hub_setup)
    (p_client_id, 'hub_setup', 'due_date_set', 'Is there a due date set on the profile?', 1),
    (p_client_id, 'hub_setup', 'onboarding_call_scheduled', 'Is the onboarding call scheduled?', 2),
    (p_client_id, 'hub_setup', 'welcome_email_sent', 'Was the Welcome Email sent to the user automatically?', 3),
    (p_client_id, 'hub_setup', 'hub_profile_created', 'Is the users Alpha Hub profile created?', 4),
    (p_client_id, 'hub_setup', 'user_access_confirmed', 'Is it confirmed that agent has user access to the Alpha Hub?', 5),
    (p_client_id, 'hub_setup', 'course_access', 'Does the user have Course Access?', 6),
    
    -- Google Ads Campaign (category: google_ads)
    (p_client_id, 'google_ads', 'campaign_created', 'Is the Google Ad campaign created?', 1),
    (p_client_id, 'google_ads', 'campaign_has_agent_name', 'Does the Google Ad campaign have the agents name?', 2),
    (p_client_id, 'google_ads', 'campaign_paused', 'Is the campaign paused?', 3),
    (p_client_id, 'google_ads', 'budget_correct', 'Is the budget correct? (monthly budget divided by 30)', 4),
    (p_client_id, 'google_ads', 'states_match', 'Is the states set correctly on the campaign and match inside the Alpha Hub?', 5),
    (p_client_id, 'google_ads', 'url_prefix_correct', 'Is the URL prefix on the campaign set to the correct agent ID?', 6),
    (p_client_id, 'google_ads', 'landing_page_live', 'Is the agents TFWP Agent Landing Page live?', 7),
    (p_client_id, 'google_ads', 'landing_page_url_correct', 'Is the landing page URL correct in the Google Ads campaign ad?', 8),
    
    -- CRM Account (category: crm_account)
    (p_client_id, 'crm_account', 'subaccount_created', 'Does the agent have an Alpha Agent CRM subaccount?', 1),
    (p_client_id, 'crm_account', 'staff_page_listed', 'Is the agents profile listed on the staff page?', 2),
    (p_client_id, 'crm_account', 'ghl_user_id_matches', 'Does the GHL User ID in the Alpha Hub match the one on the agents user profile on Alpha Agent CRM?', 3),
    (p_client_id, 'crm_account', 'calendars_active', 'Are all the calendars active and have the agents name?', 4),
    (p_client_id, 'crm_account', 'agent_assigned_calendars', 'Is the agent assigned to all the calendars?', 5),
    (p_client_id, 'crm_account', 'subaccount_id_matches', 'Does the subaccount ID in the Alpha Hub match the subaccount ID of the agents subaccount?', 6),
    (p_client_id, 'crm_account', 'campaign_id_matches', 'Does the campaign ID in the Alpha Hub match the Google Ads campaign ID?', 7),
    (p_client_id, 'crm_account', 'field_mapping_complete', 'On the info tab of the Alpha Hub profile, does the CRM custom field mapping show fully mapped?', 8),
    
    -- Funnel Testing (category: funnel_testing)
    (p_client_id, 'funnel_testing', 'test_url_correct', 'Click the test URL on the campaign settings - does it show the correct agents landing page?', 1),
    (p_client_id, 'funnel_testing', 'calendar_page_redirect', 'After submitting a test lead, are you taken to the agents calendar page?', 2),
    (p_client_id, 'funnel_testing', 'calendar_headshot', 'Does the agents calendar page have the headshot image?', 3),
    (p_client_id, 'funnel_testing', 'calendar_has_agent_name', 'Does the calendar show the agents calendar that has their name on it?', 4),
    (p_client_id, 'funnel_testing', 'fields_autopopulated', 'Is the calendar fields autopopulated with the lead info you put in on the survey?', 5),
    (p_client_id, 'funnel_testing', 'lead_shows_hub', 'Does the lead show correctly in the Alpha Hub?', 6),
    (p_client_id, 'funnel_testing', 'lead_shows_crm', 'Did the lead show in the agents CRM subaccount?', 7),
    (p_client_id, 'funnel_testing', 'iul_followup_entered', 'Did the lead get entered into the IUL follow up?', 8),
    (p_client_id, 'funnel_testing', 'followup_email_text', 'Did the lead get the follow up email and text correctly?', 9),
    (p_client_id, 'funnel_testing', 'thank_you_page_redirect', 'When you schedule a call do you get taken to the agents live thank you page?', 10),
    (p_client_id, 'funnel_testing', 'thank_you_headshot', 'Does the headshot show on the thank you page?', 11),
    (p_client_id, 'funnel_testing', 'nfia_button_works', 'Does the NFIA button link work on the thank you page?', 12),
    (p_client_id, 'funnel_testing', 'nfia_page_live', 'Is the users NFIA page live?', 13),
    (p_client_id, 'funnel_testing', 'nfia_button_scheduler', 'Does the button on the NFIA page go to the live agent scheduler?', 14),
    (p_client_id, 'funnel_testing', 'text_me_button_works', 'Does the text me now button work on the thank you page?', 15),
    (p_client_id, 'funnel_testing', 'booked_call_shows', 'Does it show as booked call on the Alpha Hub?', 16),
    (p_client_id, 'funnel_testing', 'appointment_reminders', 'Did the lead get entered into the appointment reminders?', 17),
    (p_client_id, 'funnel_testing', 'tfwp_profile_active', 'Is the agents TFWP profile page active?', 18),
    (p_client_id, 'funnel_testing', 'book_call_link_works', 'Does the book a call with me take you to the agents calendar page?', 19),
    
    -- Compliance (category: compliance)
    (p_client_id, 'compliance', 'a2p_submitted', 'Is the A2P verification submitted?', 1),
    (p_client_id, 'compliance', 'a2p_verified', 'Is the subaccount A2P verified?', 2),
    (p_client_id, 'compliance', 'crm_access_confirmed', 'Is it confirmed the agent has access to the CRM?', 3),
    (p_client_id, 'compliance', 'zoom_google_connected', 'Did the agent add their Zoom and Google calendar?', 4),
    (p_client_id, 'compliance', 'payment_method_on_file', 'Does the agent have an active payment method on file for the CRM?', 5),
    (p_client_id, 'compliance', 'rebilling_enabled', 'Is the agents rebilling turned on for the CRM?', 6),
    (p_client_id, 'compliance', 'zoom_select_meeting_location', 'Does the agent have Zoom Select as meeting location on the illustration call?', 7),
    (p_client_id, 'compliance', 'phone_number_purchased', 'Did the agent purchase their phone number?', 8),
    
    -- Billing & Docs (category: billing_docs)
    (p_client_id, 'billing_docs', 'management_fee_paid', 'Did the agent pay the management fee?', 1),
    (p_client_id, 'billing_docs', 'management_fee_marked', 'Is it marked as paid in the billing tab on Alpha Hub?', 2),
    (p_client_id, 'billing_docs', 'ad_spend_paid', 'Did the agent pay the first ad spend payment?', 3),
    (p_client_id, 'billing_docs', 'ad_spend_marked', 'Is it marked in the billing tab?', 4),
    (p_client_id, 'billing_docs', 'agreement_signed', 'Did the agent sign the agreement?', 5),
    (p_client_id, 'billing_docs', 'agreement_stored', 'Is the agreement stored in the Alpha Hub?', 6),
    
    -- Final Onboarding (category: final_onboarding)
    (p_client_id, 'final_onboarding', 'understands_chat_support', 'Does the agent understand to get support they use the chat inside of the Alpha Hub?', 1),
    (p_client_id, 'final_onboarding', 'test_message_sent', 'Did they send a message to test it works?', 2),
    (p_client_id, 'final_onboarding', 'checkin_scheduled', 'Did you schedule their first check-in call 14 days out and set it for bi-weekly recurring check-in?', 3),
    (p_client_id, 'final_onboarding', 'onboarding_call_completed', 'Was the onboarding call completed?', 4);
  END IF;
END;
$$;


ALTER FUNCTION public.initialize_onboarding_checklist(p_client_id uuid) OWNER TO postgres;

--
-- Name: is_enrolled(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_enrolled(_user_id uuid, _course_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE user_id = _user_id
      AND course_id = _course_id
      AND revoked_at IS NULL
  )
$$;


ALTER FUNCTION public.is_enrolled(_user_id uuid, _course_id uuid) OWNER TO postgres;

--
-- Name: link_client_to_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.link_client_to_user() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_email text;
  v_client_id uuid;
  v_existing_user uuid;
  v_existing_email text;
begin
  v_email := lower((current_setting('request.jwt.claims', true)::json ->> 'email'));
  if v_email is null or v_email = '' then
    return null;
  end if;

  select c.id, c.user_id
    into v_client_id, v_existing_user
  from public.clients c
  where lower(c.email) = v_email
  limit 1;

  if v_client_id is null then
    return null;
  end if;

  if v_existing_user is not null and v_existing_user <> auth.uid() then
    select lower(p.email)
      into v_existing_email
    from public.profiles p
    where p.id = v_existing_user
    limit 1;

    -- If we can confirm the existing linked account has a different email, block re-linking.
    if v_existing_email is not null and v_existing_email <> v_email then
      raise exception 'Client already linked to another user';
    end if;
  end if;

  update public.clients
  set user_id = auth.uid(),
      updated_at = now()
  where id = v_client_id;

  -- Ensure client role exists (never grants admin)
  insert into public.user_roles (user_id, role)
  select auth.uid(), 'client'::app_role
  where not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'client'::app_role
  );

  return v_client_id;
end;
$$;


ALTER FUNCTION public.link_client_to_user() OWNER TO postgres;

--
-- Name: link_prospect_to_referrer(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.link_prospect_to_referrer() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_referral_code text;
  v_referrer_client_id uuid;
  v_referral_code_id uuid;
  v_prospect_id uuid;
  v_prospect_email text;
  v_prospect_name text;
BEGIN
  -- Determine which table triggered us and get prospect info
  IF TG_TABLE_NAME = 'prospect_attribution' THEN
    v_referral_code := NEW.referral_code;
    v_prospect_id := NEW.prospect_id;
    
    -- Fetch prospect info
    SELECT id, email, name INTO v_prospect_id, v_prospect_email, v_prospect_name
    FROM prospects WHERE id = NEW.prospect_id;
  ELSE
    -- prospects table
    v_referral_code := NEW.referral_code;
    v_prospect_id := NEW.id;
    v_prospect_email := NEW.email;
    v_prospect_name := NEW.name;
    
    -- Fallback: look up from visitor_sessions if referral_code is null
    IF v_referral_code IS NULL AND NEW.visitor_id IS NOT NULL THEN
      SELECT vs.referral_code INTO v_referral_code
      FROM visitor_sessions vs
      WHERE vs.visitor_id = NEW.visitor_id
        AND vs.referral_code IS NOT NULL
      ORDER BY vs.created_at DESC
      LIMIT 1;
    END IF;
  END IF;

  -- If we still don't have a referral code, nothing to do
  IF v_referral_code IS NULL OR v_referral_code = '' THEN
    RETURN NEW;
  END IF;

  -- Look up the referral code (case-insensitive)
  SELECT rc.id, rc.client_id INTO v_referral_code_id, v_referrer_client_id
  FROM referral_codes rc
  WHERE LOWER(rc.code) = LOWER(v_referral_code)
  LIMIT 1;

  -- If referral code doesn't exist, nothing to do
  IF v_referrer_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update the prospect with referrer info (only for prospects table trigger)
  IF TG_TABLE_NAME = 'prospects' THEN
    -- Use NEW to update the row being inserted/updated
    NEW.referral_code := v_referral_code;
    NEW.referrer_client_id := v_referrer_client_id;
    NEW.lead_source := 'Referral'; -- Capitalized to match UI
  END IF;

  -- Insert into referrals table (idempotent with ON CONFLICT)
  INSERT INTO referrals (
    referrer_client_id,
    referral_code_id,
    referred_email,
    referred_name,
    referred_at,
    status
  ) VALUES (
    v_referrer_client_id,
    v_referral_code_id,
    v_prospect_email,
    v_prospect_name,
    now(),
    'pending'
  )
  ON CONFLICT (referred_email, referrer_client_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.link_prospect_to_referrer() OWNER TO postgres;

--
-- Name: log_ticket_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_ticket_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_activity_log (ticket_id, user_id, action, old_value, new_value, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'status_change',
      OLD.status,
      NEW.status,
      jsonb_build_object('field', 'status')
    );
  END IF;

  -- Log priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ticket_activity_log (ticket_id, user_id, action, old_value, new_value, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'priority_change',
      OLD.priority::text,
      NEW.priority::text,
      jsonb_build_object('field', 'priority')
    );
  END IF;

  -- Log assignment changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.ticket_activity_log (ticket_id, user_id, action, old_value, new_value, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'assignment_change',
      OLD.assigned_to::text,
      NEW.assigned_to::text,
      jsonb_build_object('field', 'assigned_to')
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_ticket_changes() OWNER TO postgres;

--
-- Name: mark_messages_read(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.mark_messages_read(p_conversation_id uuid, p_user_role text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Mark individual messages as read
  UPDATE public.chat_messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_role != p_user_role
    AND read_at IS NULL;
  
  -- Reset unread count
  IF p_user_role = 'client' THEN
    UPDATE public.chat_conversations
    SET unread_count_client = 0
    WHERE id = p_conversation_id;
  ELSE
    UPDATE public.chat_conversations
    SET unread_count_admin = 0
    WHERE id = p_conversation_id;
  END IF;
END;
$$;


ALTER FUNCTION public.mark_messages_read(p_conversation_id uuid, p_user_role text) OWNER TO postgres;

--
-- Name: prevent_duplicate_admin_channel_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_duplicate_admin_channel_message() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM admin_channel_messages
    WHERE channel_id = NEW.channel_id
      AND sender_id = NEW.sender_id
      AND message = NEW.message
      AND created_at > NOW() - INTERVAL '2 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate message detected' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.prevent_duplicate_admin_channel_message() OWNER TO postgres;

--
-- Name: prevent_duplicate_admin_dm_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_duplicate_admin_dm_message() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM admin_dm_messages
    WHERE conversation_id = NEW.conversation_id
      AND sender_id = NEW.sender_id
      AND message = NEW.message
      AND created_at > NOW() - INTERVAL '2 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate message detected' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.prevent_duplicate_admin_dm_message() OWNER TO postgres;

--
-- Name: prevent_duplicate_chat_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_duplicate_chat_message() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM chat_messages
    WHERE conversation_id = NEW.conversation_id
      AND sender_id = NEW.sender_id
      AND message = NEW.message
      AND created_at > NOW() - INTERVAL '2 seconds'
  ) THEN
    RAISE EXCEPTION 'Duplicate message detected' USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.prevent_duplicate_chat_message() OWNER TO postgres;

--
-- Name: run_readonly_query(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.run_readonly_query(query_text text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result JSONB;
  clean_query TEXT;
BEGIN
  clean_query := TRIM(query_text);

  -- Validate SELECT only
  IF NOT (clean_query ~* '^SELECT') THEN
    RAISE EXCEPTION 'Only SELECT queries allowed';
  END IF;

  -- Reject semicolons to prevent statement chaining
  IF clean_query LIKE '%;%' THEN
    RAISE EXCEPTION 'Semicolons not allowed in queries';
  END IF;

  -- Execute with restricted role
  SET LOCAL ROLE readonly_agent;
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || clean_query || ') t'
    INTO result;
  RESET ROLE;

  RETURN result;
END;
$$;


ALTER FUNCTION public.run_readonly_query(query_text text) OWNER TO postgres;

--
-- Name: send_welcome_chat_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.send_welcome_chat_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_client record;
  v_first_name text;
  v_manager_name text;
BEGIN
  -- Get client details
  SELECT * INTO v_client FROM clients WHERE id = NEW.client_id;
  
  -- Skip if welcome message already sent or no client found
  IF v_client IS NULL OR v_client.welcome_message_sent = true THEN
    RETURN NEW;
  END IF;
  
  -- Extract first name
  v_first_name := split_part(COALESCE(v_client.name, 'there'), ' ', 1);
  v_manager_name := COALESCE(v_client.success_manager_name, 'Your Success Manager');
  
  -- Insert welcome message
  INSERT INTO chat_messages (
    conversation_id,
    sender_id,
    sender_name,
    sender_role,
    sender_avatar_url,
    message
  ) VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_manager_name,
    'admin',
    v_client.success_manager_image_url,
    'Hey ' || v_first_name || '! 👋 Looking forward to our call together soon!' || E'\n\n' ||
    'Just want to remind you to do the following things before our call:' || E'\n\n' ||
    '• Purchase your phone number' || E'\n' ||
    '• Connect your Google Calendar' || E'\n' ||
    '• Connect Zoom' || E'\n\n' ||
    'This is all covered in your onboarding video, so make sure to get this done and let me know as soon as it is! Thanks! 🙌'
  );
  
  -- Mark welcome message as sent
  UPDATE clients SET welcome_message_sent = true WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.send_welcome_chat_message() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: track_lead_stage_history(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.track_lead_stage_history() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When status changes to 'booked call' or beyond, set booked_call_at if not already set
  IF NEW.status IN ('booked call', 'submitted', 'approved', 'issued paid') 
     AND (OLD.status IS NULL OR OLD.status = 'new') 
     AND NEW.booked_call_at IS NULL THEN
    NEW.booked_call_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.track_lead_stage_history() OWNER TO postgres;

--
-- Name: update_admin_dm_on_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_admin_dm_on_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.admin_dm_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message, 100),
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_admin_dm_on_message() OWNER TO postgres;

--
-- Name: update_campaigns_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_campaigns_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_campaigns_updated_at() OWNER TO postgres;

--
-- Name: update_client_payment_methods_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_client_payment_methods_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_client_payment_methods_updated_at() OWNER TO postgres;

--
-- Name: update_conversation_on_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_conversation_on_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.chat_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message, 100),
    updated_at = now(),
    unread_count_client = CASE WHEN NEW.sender_role = 'admin' THEN unread_count_client + 1 ELSE unread_count_client END,
    unread_count_admin = CASE WHEN NEW.sender_role = 'client' THEN unread_count_admin + 1 ELSE unread_count_admin END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_conversation_on_message() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.protect_delete() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: ad_spend_daily; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ad_spend_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    campaign_id text NOT NULL,
    spend_date date NOT NULL,
    cost numeric DEFAULT 0,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    conversions numeric DEFAULT 0,
    ctr numeric DEFAULT 0,
    cpc numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    campaign_enabled boolean DEFAULT true,
    budget_daily numeric,
    budget_utilization numeric,
    overdelivery boolean DEFAULT false
);


ALTER TABLE public.ad_spend_daily OWNER TO postgres;

--
-- Name: TABLE ad_spend_daily; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ad_spend_daily IS 'Daily ad spend data synced from Google Ads API';


--
-- Name: admin_channel_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_channel_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_channel_members OWNER TO postgres;

--
-- Name: admin_channel_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_channel_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_url text,
    attachment_type text,
    attachment_name text
);


ALTER TABLE public.admin_channel_messages OWNER TO postgres;

--
-- Name: admin_channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_channels OWNER TO postgres;

--
-- Name: admin_dm_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_dm_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participant1_id uuid NOT NULL,
    participant2_id uuid NOT NULL,
    last_message_at timestamp with time zone,
    last_message_preview text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT different_participants CHECK ((participant1_id < participant2_id))
);


ALTER TABLE public.admin_dm_conversations OWNER TO postgres;

--
-- Name: admin_dm_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_dm_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_url text,
    attachment_type text,
    attachment_name text
);


ALTER TABLE public.admin_dm_messages OWNER TO postgres;

--
-- Name: agreement_otps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agreement_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    otp_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0,
    verified_at timestamp with time zone,
    agreement_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.agreement_otps OWNER TO postgres;

--
-- Name: agreement_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agreement_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id text DEFAULT 'alpha-agent-v4'::text NOT NULL,
    name text DEFAULT 'Default Agreement'::text NOT NULL,
    version text DEFAULT 'v4.0'::text NOT NULL,
    is_active boolean DEFAULT true,
    content text NOT NULL,
    key_terms jsonb DEFAULT '[]'::jsonb,
    initials_sections jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


ALTER TABLE public.agreement_templates OWNER TO postgres;

--
-- Name: agreements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    signed_at timestamp with time zone,
    signer_full_name text,
    signer_email text,
    signer_phone text,
    signer_state text,
    signer_business_address text,
    signer_license_number text,
    signer_license_states text[],
    otp_verified boolean DEFAULT false,
    otp_verified_at timestamp with time zone,
    otp_provider_receipt text,
    signature_drawn_url text,
    signature_typed text,
    electronic_intent_accepted boolean DEFAULT false,
    electronic_intent_accepted_at timestamp with time zone,
    printed_name text,
    key_terms_checkboxes jsonb,
    initials_ip_no_copying text,
    initials_ip_no_copying_at timestamp with time zone,
    ip_address text,
    ip_forwarded_for text,
    user_agent text,
    platform_os text,
    screen_resolution text,
    language_locale text,
    geolocation_city text,
    geolocation_region text,
    session_id text,
    csrf_token_id text,
    referrer_url text,
    utm_params jsonb,
    page_load_at timestamp with time zone,
    signed_at_local_offset integer,
    scrolled_to_bottom boolean DEFAULT false,
    scrolled_to_bottom_at timestamp with time zone,
    time_on_page_seconds integer,
    focus_events jsonb,
    template_id text DEFAULT 'alpha-agent-v4'::text,
    contract_content text,
    contract_content_hash text,
    pdf_url text,
    pdf_hash text,
    payment_customer_id text,
    payment_invoice_id text,
    payment_subscription_id text,
    payment_amount numeric,
    payment_date timestamp with time zone,
    payment_last4 text,
    payment_brand text,
    payment_auth_code text,
    hash_emailed_at timestamp with time zone,
    hash_email_message_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    audit_events jsonb DEFAULT '[]'::jsonb,
    initials_sections_completed jsonb,
    CONSTRAINT agreements_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'signed'::text, 'expired'::text])))
);


ALTER TABLE public.agreements OWNER TO postgres;

--
-- Name: COLUMN agreements.audit_events; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agreements.audit_events IS 'Comprehensive audit log of all user actions during agreement signing with timestamps and IP addresses';


--
-- Name: COLUMN agreements.initials_sections_completed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.agreements.initials_sections_completed IS 'Stores initials for each section (no_refunds, chargebacks, arbitration, etc.) with timestamps and IP';


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plaid_item_id text,
    plaid_access_token_encrypted text,
    institution_name text NOT NULL,
    institution_id text,
    account_name text NOT NULL,
    account_type text DEFAULT 'checking'::text NOT NULL,
    account_subtype text,
    mask text,
    current_balance numeric DEFAULT 0,
    available_balance numeric,
    currency_code text DEFAULT 'USD'::text,
    last_synced_at timestamp with time zone,
    sync_cursor text,
    is_active boolean DEFAULT true NOT NULL,
    is_manual boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    plaid_account_id text,
    account_category text DEFAULT 'business'::text NOT NULL,
    account_label text
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: billing_collection_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_collection_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collection_id uuid NOT NULL,
    event_type text NOT NULL,
    email_template text,
    email_subject text,
    recipient_email text,
    status_from text,
    status_to text,
    notes text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT billing_collection_events_event_type_check CHECK ((event_type = ANY (ARRAY['email_sent'::text, 'status_change'::text, 'manual_action'::text, 'payment_received'::text, 'escalated'::text])))
);


ALTER TABLE public.billing_collection_events OWNER TO postgres;

--
-- Name: billing_collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    billing_record_id uuid NOT NULL,
    client_id text NOT NULL,
    status text DEFAULT 'none'::text NOT NULL,
    next_action_at timestamp with time zone,
    last_email_sent_at timestamp with time zone,
    email_stage text DEFAULT 'none'::text,
    escalated_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_collections_email_stage_check CHECK ((email_stage = ANY (ARRAY['none'::text, 'reminder'::text, 'late'::text, 'final'::text, 'collections'::text]))),
    CONSTRAINT billing_collections_status_check CHECK ((status = ANY (ARRAY['none'::text, 'reminder_sent'::text, 'late_notice_sent'::text, 'final_notice_sent'::text, 'sent_to_collections'::text, 'resolved'::text])))
);


ALTER TABLE public.billing_collections OWNER TO postgres;

--
-- Name: billing_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    billing_type public.billing_type NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    billing_period_start date,
    billing_period_end date,
    due_date date,
    status public.billing_status DEFAULT 'pending'::public.billing_status NOT NULL,
    payment_link text,
    stripe_invoice_id text,
    stripe_account text,
    paid_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    recurrence_type text DEFAULT 'one_time'::text,
    next_due_date date,
    is_recurring_parent boolean DEFAULT false,
    parent_billing_id uuid,
    payment_reference text,
    credit_applied_id uuid,
    credit_amount_used numeric DEFAULT 0,
    stripe_payment_intent_id text,
    charge_attempts integer DEFAULT 0,
    last_charge_error text,
    client_name text,
    stripe_subscription_id text,
    archived_at timestamp with time zone,
    source text,
    CONSTRAINT billing_records_recurrence_type_check CHECK ((recurrence_type = ANY (ARRAY['one_time'::text, 'bi_weekly'::text, 'monthly'::text]))),
    CONSTRAINT billing_records_source_check CHECK ((source = ANY (ARRAY['stripe'::text, 'v1_manual'::text, 'auto_recharge'::text])))
);


ALTER TABLE public.billing_records OWNER TO postgres;

--
-- Name: billing_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    verification_type text NOT NULL,
    verified_by uuid,
    verified_by_name text,
    ai_summary text,
    ai_issues jsonb DEFAULT '[]'::jsonb,
    ai_status text,
    notes text,
    snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_verifications_ai_status_check CHECK ((ai_status = ANY (ARRAY['clean'::text, 'warning'::text, 'problem'::text]))),
    CONSTRAINT billing_verifications_verification_type_check CHECK ((verification_type = ANY (ARRAY['human'::text, 'ai'::text])))
);


ALTER TABLE public.billing_verifications OWNER TO postgres;

--
-- Name: business_screenshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_screenshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_url text NOT NULL,
    caption text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.business_screenshots OWNER TO postgres;

--
-- Name: call_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prospect_id uuid NOT NULL,
    call_date timestamp with time zone DEFAULT now() NOT NULL,
    duration_seconds integer,
    summary text,
    action_items text[],
    key_topics text[],
    sentiment text,
    recording_url text,
    fathom_call_id text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT call_logs_sentiment_check CHECK (((sentiment IS NULL) OR (sentiment = ANY (ARRAY['positive'::text, 'neutral'::text, 'negative'::text]))))
);


ALTER TABLE public.call_logs OWNER TO postgres;

--
-- Name: campaign_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    client_id uuid,
    proposal_id uuid,
    actor text NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    reason_codes text[] DEFAULT '{}'::text[],
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT campaign_audit_log_actor_check CHECK ((actor = ANY (ARRAY['AUTO'::text, 'USER'::text, 'SYSTEM'::text, 'SAFE_MODE'::text])))
);


ALTER TABLE public.campaign_audit_log OWNER TO postgres;

--
-- Name: campaign_budget_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign_budget_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    client_id uuid,
    google_campaign_id text,
    old_budget numeric,
    new_budget numeric,
    change_source text NOT NULL,
    change_reason text,
    triggered_by text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.campaign_budget_changes OWNER TO postgres;

--
-- Name: campaign_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    policy_version text DEFAULT 'v1.0'::text,
    auto_approve_green boolean DEFAULT false,
    auto_approve_yellow boolean DEFAULT false,
    auto_approve_red boolean DEFAULT false,
    safe_mode_auto_trigger boolean DEFAULT true,
    ctr_red_threshold numeric DEFAULT 5.0,
    cvr_red_threshold numeric DEFAULT 4.0,
    no_conv_spend_threshold numeric DEFAULT 60.0,
    not_spending_budget_threshold numeric DEFAULT 30.0,
    not_spending_spend_threshold numeric DEFAULT 5.0,
    clicks_no_conv_threshold integer DEFAULT 50,
    cpl_yellow_threshold numeric DEFAULT 50.0,
    max_budget_change_pct numeric DEFAULT 20.0,
    target_spend_pct numeric DEFAULT 95.0,
    ai_provider text DEFAULT 'lovable_llm'::text,
    custom_ai_server_url text,
    reminder_quiet_hours_start integer DEFAULT 22,
    reminder_quiet_hours_end integer DEFAULT 8,
    slack_webhook_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT campaign_settings_ai_provider_check CHECK ((ai_provider = ANY (ARRAY['lovable_llm'::text, 'custom_ai_server'::text])))
);


ALTER TABLE public.campaign_settings OWNER TO postgres;

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    google_campaign_id text NOT NULL,
    google_customer_id text NOT NULL,
    current_daily_budget numeric DEFAULT 0,
    last_budget_change_at timestamp with time zone,
    last_budget_change_by text,
    safe_mode boolean DEFAULT false,
    safe_mode_triggered_at timestamp with time zone,
    safe_mode_reason text,
    safe_mode_budget_used numeric,
    status text DEFAULT 'green'::text,
    last_status_change_at timestamp with time zone,
    reason_codes text[] DEFAULT '{}'::text[],
    health_score integer,
    ai_summary text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ignored boolean DEFAULT false,
    ignored_reason text,
    ignored_at timestamp with time zone,
    ignored_by uuid,
    ignored_until timestamp with time zone,
    health_score_delivery integer,
    health_score_cvr integer,
    health_score_cpl integer,
    health_score_booked_call integer,
    health_label text,
    health_drivers jsonb,
    leads_last_7d integer,
    booked_calls_last_7d integer,
    booked_call_rate_7d numeric,
    leads_prior_7d integer,
    booked_calls_prior_7d integer,
    booked_call_rate_prior_7d numeric,
    leads_yesterday integer,
    booked_calls_yesterday integer,
    booked_call_rate_yesterday numeric,
    wallet_remaining numeric,
    days_remaining_in_cycle integer,
    required_daily_spend numeric,
    pace_drift_pct numeric,
    health_score_downstream integer,
    cpbc_7d numeric,
    cpsa_7d numeric,
    cp_issued_paid_7d numeric,
    apps_submitted_7d integer,
    issued_paid_7d integer,
    pre_safe_mode_budget numeric,
    label text,
    states text,
    is_primary boolean DEFAULT false,
    CONSTRAINT campaigns_last_budget_change_by_check CHECK ((last_budget_change_by = ANY (ARRAY['AUTO'::text, 'USER'::text, 'SAFE_MODE'::text, 'SAFE_MODE_EXIT'::text]))),
    CONSTRAINT campaigns_status_check CHECK ((status = ANY (ARRAY['green'::text, 'yellow'::text, 'red'::text])))
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- Name: categorization_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorization_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    rule_name text NOT NULL,
    match_type text DEFAULT 'contains'::text NOT NULL,
    match_value text NOT NULL,
    match_field text DEFAULT 'merchant_name'::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_match_field CHECK ((match_field = ANY (ARRAY['merchant_name'::text, 'description'::text]))),
    CONSTRAINT valid_match_type CHECK ((match_type = ANY (ARRAY['exact'::text, 'contains'::text, 'starts_with'::text, 'ends_with'::text, 'regex'::text])))
);


ALTER TABLE public.categorization_rules OWNER TO postgres;

--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    last_message_at timestamp with time zone,
    last_message_preview text,
    unread_count_client integer DEFAULT 0 NOT NULL,
    unread_count_admin integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_conversations OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_name text NOT NULL,
    sender_role text NOT NULL,
    sender_avatar_url text,
    message text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_url text,
    attachment_type text,
    attachment_name text,
    link_preview jsonb,
    CONSTRAINT chat_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['client'::text, 'admin'::text])))
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: COLUMN chat_messages.link_preview; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.chat_messages.link_preview IS 'Cached Open Graph metadata for URLs in the message';


--
-- Name: chat_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_settings OWNER TO postgres;

--
-- Name: client_credits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    amount numeric NOT NULL,
    reason text NOT NULL,
    applied_to_billing_id uuid,
    applied_at timestamp with time zone,
    expires_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    credit_type text DEFAULT 'referral'::text NOT NULL,
    original_amount numeric NOT NULL,
    remaining_balance numeric NOT NULL
);


ALTER TABLE public.client_credits OWNER TO postgres;

--
-- Name: client_kpi_daily; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_kpi_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    date date NOT NULL,
    leads integer DEFAULT 0,
    booked_calls integer DEFAULT 0,
    shows integer DEFAULT 0,
    apps_submitted integer DEFAULT 0,
    approvals integer DEFAULT 0,
    declines integer DEFAULT 0,
    issued_paid integer DEFAULT 0,
    submitted_premium numeric DEFAULT 0,
    approved_premium numeric DEFAULT 0,
    issued_premium numeric DEFAULT 0,
    ad_spend numeric DEFAULT 0,
    clicks integer DEFAULT 0,
    conversions integer DEFAULT 0,
    booked_rate numeric,
    app_rate numeric,
    issued_rate numeric,
    cpl numeric,
    cpbc numeric,
    cpsa numeric,
    cp_issued_paid numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.client_kpi_daily OWNER TO postgres;

--
-- Name: client_kpi_rolling; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_kpi_rolling (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    snapshot_date date NOT NULL,
    leads_7d integer DEFAULT 0,
    booked_calls_7d integer DEFAULT 0,
    apps_submitted_7d integer DEFAULT 0,
    issued_paid_7d integer DEFAULT 0,
    ad_spend_7d numeric DEFAULT 0,
    booked_rate_7d numeric,
    cpbc_7d numeric,
    cpsa_7d numeric,
    cp_issued_paid_7d numeric,
    leads_prior_7d integer DEFAULT 0,
    booked_calls_prior_7d integer DEFAULT 0,
    ad_spend_prior_7d numeric DEFAULT 0,
    cpbc_prior_7d numeric,
    booked_rate_delta numeric,
    cpbc_delta numeric,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.client_kpi_rolling OWNER TO postgres;

--
-- Name: client_payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    stripe_account text NOT NULL,
    stripe_customer_id text NOT NULL,
    stripe_payment_method_id text NOT NULL,
    card_brand text,
    card_last_four text,
    card_exp_month integer,
    card_exp_year integer,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT client_payment_methods_stripe_account_check CHECK ((stripe_account = ANY (ARRAY['ad_spend'::text, 'management'::text])))
);


ALTER TABLE public.client_payment_methods OWNER TO postgres;

--
-- Name: client_self_onboarding; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_self_onboarding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    task_key text NOT NULL,
    task_label text NOT NULL,
    help_url text,
    display_order integer DEFAULT 0,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.client_self_onboarding OWNER TO postgres;

--
-- Name: client_stripe_customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_stripe_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id text NOT NULL,
    stripe_account text NOT NULL,
    stripe_customer_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT client_stripe_customers_stripe_account_check CHECK ((stripe_account = ANY (ARRAY['ad_spend'::text, 'management'::text])))
);


ALTER TABLE public.client_stripe_customers OWNER TO postgres;

--
-- Name: client_stripe_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_stripe_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    stripe_account text NOT NULL,
    stripe_subscription_id text NOT NULL,
    stripe_price_id text,
    stripe_customer_id text,
    status text DEFAULT 'active'::text NOT NULL,
    billing_type text DEFAULT 'management'::text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    recurrence_type text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.client_stripe_subscriptions OWNER TO postgres;

--
-- Name: client_wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    ad_spend_balance numeric DEFAULT 0 NOT NULL,
    low_balance_threshold numeric DEFAULT 150 NOT NULL,
    auto_charge_amount numeric,
    last_calculated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tracking_start_date date,
    auto_billing_enabled boolean DEFAULT false,
    last_auto_charge_at timestamp with time zone,
    last_charge_failed_at timestamp with time zone,
    monthly_ad_spend_cap numeric,
    billing_mode text DEFAULT 'manual'::text,
    CONSTRAINT client_wallets_billing_mode_check CHECK ((billing_mode = ANY (ARRAY['manual'::text, 'auto_stripe'::text])))
);


ALTER TABLE public.client_wallets OWNER TO postgres;

--
-- Name: COLUMN client_wallets.tracking_start_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client_wallets.tracking_start_date IS 'Date from which ad spend is tracked against this wallet. Set on first deposit.';


--
-- Name: COLUMN client_wallets.monthly_ad_spend_cap; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client_wallets.monthly_ad_spend_cap IS 'Maximum ad spend charges per calendar month. NULL means no cap.';


--
-- Name: COLUMN client_wallets.billing_mode; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.client_wallets.billing_mode IS 'manual = admin marks paid, auto_stripe = Stripe auto-charges saved card';


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    profile_image_url text,
    status text DEFAULT 'active'::text NOT NULL,
    management_fee numeric DEFAULT 0,
    monthly_ad_spend numeric DEFAULT 0,
    renewal_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    agent_id text,
    team text,
    states text,
    ad_spend_budget numeric DEFAULT 0,
    mtd_ad_spend numeric DEFAULT 0,
    target_daily_spend numeric DEFAULT 0,
    mtd_leads integer DEFAULT 0,
    booked_calls integer DEFAULT 0,
    applications integer DEFAULT 0,
    cpl numeric DEFAULT 0,
    cpa numeric DEFAULT 0,
    cpba numeric DEFAULT 0,
    cpc numeric DEFAULT 0,
    ctr numeric DEFAULT 0,
    conversion_rate numeric DEFAULT 0,
    nps_score numeric,
    made_review boolean DEFAULT false,
    management_fee_renewal date,
    ad_spend_renewal date,
    nfia_link text,
    scheduler_link text,
    crm_link text,
    ads_link text,
    lander_link text,
    filters_notes text,
    onboarding_status public.onboarding_status DEFAULT 'pending'::public.onboarding_status,
    onboarding_call_scheduled_at timestamp with time zone,
    contract_signed_at timestamp with time zone,
    current_quota integer DEFAULT 0,
    total_delivered integer DEFAULT 0,
    behind_target integer DEFAULT 0,
    ads_live boolean DEFAULT false,
    success_manager_name text DEFAULT 'Sierra Reigh'::text,
    success_manager_email text DEFAULT 'sierra@alphaagent.io'::text,
    success_manager_phone text,
    success_manager_image_url text DEFAULT 'https://qcunascacayiiuufjtaq.supabase.co/storage/v1/object/public/media/profile-photos/1766368659922-oq4x14.jpg'::text,
    google_campaign_id text,
    package_type text DEFAULT 'full_management'::text,
    tfwp_profile_link text,
    agreement_link text,
    referred_by_client_id uuid,
    referral_code text,
    automation_started_at timestamp with time zone,
    automation_completed_at timestamp with time zone,
    thankyou_link text,
    subaccount_id text,
    discovery_calendar_id text,
    ghl_user_id text,
    crm_delivery_enabled boolean DEFAULT true,
    password_set_at timestamp with time zone,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    gads_campaign_created boolean DEFAULT false,
    gads_adgroup_created boolean DEFAULT false,
    gads_ad_created boolean DEFAULT false,
    gads_creation_error text,
    gads_last_attempt_at timestamp with time zone,
    address_street text,
    address_city text,
    address_state text,
    address_zip text,
    stage_messages_sent jsonb DEFAULT '{}'::jsonb,
    welcome_message_sent boolean DEFAULT false,
    a2p_brand_status text DEFAULT 'unknown'::text,
    a2p_campaign_status text DEFAULT 'unknown'::text,
    a2p_last_synced_at timestamp with time zone,
    a2p_brand_id text,
    a2p_campaign_id text,
    commission_contract_percent numeric DEFAULT 100,
    agreement_id uuid,
    custom_agreement_content text,
    npn text,
    prospect_id uuid,
    ai_bio text,
    url_slug text,
    webflow_scheduler_id text,
    webflow_lander_id text,
    webflow_profile_id text,
    webflow_thankyou_id text,
    timezone text DEFAULT 'America/New_York'::text,
    agent_bio_input text,
    address_country text DEFAULT 'US'::text,
    ghl_contact_id text,
    ghl_phone_number text,
    allow_agent_self_topup boolean DEFAULT false,
    billing_cycle_start_at timestamp with time zone,
    billing_cycle_end_at timestamp with time zone,
    billing_status text DEFAULT 'active'::text,
    start_date date,
    churn_reason text,
    historical_total_paid numeric DEFAULT 0,
    end_date date,
    profit_margin numeric,
    last_nps_prompt_at timestamp with time zone,
    nps_prompt_count integer DEFAULT 0,
    headshot_updated_at timestamp with time zone,
    ghl_agent_ref text,
    billing_frequency text DEFAULT 'monthly'::text,
    management_stripe_subscription_id text,
    admin_notes text,
    fire_page_link text,
    activated_at timestamp with time zone,
    referred_by_client_id_secondary uuid,
    CONSTRAINT clients_billing_status_check CHECK ((billing_status = ANY (ARRAY['active'::text, 'past_due'::text, 'payment_failed'::text, 'suspended'::text]))),
    CONSTRAINT clients_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'paused'::text, 'onboarding'::text, 'pending reactivation'::text, 'at_risk'::text, 'cancelled'::text])))
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: COLUMN clients.google_campaign_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.google_campaign_id IS 'Google Ads campaign ID for automatic spend sync';


--
-- Name: COLUMN clients.crm_delivery_enabled; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.crm_delivery_enabled IS 'Controls whether leads should be delivered to this client CRM';


--
-- Name: COLUMN clients.password_set_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.password_set_at IS 'Timestamp when user set their own password. NULL means they still have a temp password from onboarding.';


--
-- Name: COLUMN clients.a2p_brand_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.a2p_brand_status IS 'A2P brand registration status: unknown, not_started, submitted, pending, approved, rejected';


--
-- Name: COLUMN clients.a2p_campaign_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.a2p_campaign_status IS 'A2P campaign registration status: unknown, not_started, submitted, pending, approved, rejected';


--
-- Name: COLUMN clients.commission_contract_percent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.commission_contract_percent IS 'IUL life commission contract percentage (e.g., 130 means 130%)';


--
-- Name: COLUMN clients.ghl_contact_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.ghl_contact_id IS 'Alpha Agent Leads CRM Contact User ID from HighLevel';


--
-- Name: COLUMN clients.ghl_phone_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.ghl_phone_number IS 'Twilio phone number provisioned for this client GHL subaccount';


--
-- Name: COLUMN clients.ghl_agent_ref; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.ghl_agent_ref IS 'GHL agent_id from webhook (agent reference, not for SaaS billing)';


--
-- Name: community_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.community_comments OWNER TO postgres;

--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.community_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text,
    body text NOT NULL,
    amount numeric(12,2),
    client_initials text,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT community_posts_type_check CHECK ((type = ANY (ARRAY['win'::text, 'update'::text, 'question'::text, 'sale'::text, 'announcement'::text])))
);


ALTER TABLE public.community_posts OWNER TO postgres;

--
-- Name: conversions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_id text,
    lead_id uuid,
    email text NOT NULL,
    transaction_id text NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'usd'::text,
    first_touch_source text,
    first_touch_campaign text,
    last_touch_source text,
    last_touch_campaign text,
    stripe_customer_id text,
    product_name text,
    payment_status text DEFAULT 'succeeded'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.conversions OWNER TO postgres;

--
-- Name: course_user_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_user_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    total_time_spent_seconds integer DEFAULT 0,
    last_activity_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.course_user_progress OWNER TO postgres;

--
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    cover_image_url text,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT courses_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- Name: decision_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.decision_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    client_id uuid,
    proposal_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    policy_version text,
    ai_provider text,
    decision_type text,
    status_at_decision text,
    reason_codes text[] DEFAULT '{}'::text[],
    proposed_action_type text,
    proposed_daily_budget numeric,
    proposed_delta_pct numeric,
    proposed_pacing_info jsonb,
    was_approved boolean,
    decision_at timestamp with time zone,
    final_action_type text,
    final_daily_budget numeric,
    final_delta_pct numeric,
    decision_outcome text,
    primary_reason_category text,
    specific_reason_codes text[],
    next_action text,
    confidence_override text,
    user_note text,
    features_at_decision jsonb DEFAULT '{}'::jsonb NOT NULL,
    outcome_1d jsonb,
    outcome_3d jsonb,
    outcome_7d jsonb,
    outcome_score_3d numeric,
    outcome_score_7d numeric,
    similar_cases_ids text[],
    recommendation_confidence numeric,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT decision_events_decision_outcome_check CHECK ((decision_outcome = ANY (ARRAY['APPROVE_AS_IS'::text, 'APPROVE_WITH_EDIT'::text, 'DENY_NO_CHANGE'::text, 'DENY_SET_SAFE_MODE'::text, 'ESCALATE_INVESTIGATION'::text, 'MANUAL_OVERRIDE'::text]))),
    CONSTRAINT decision_events_decision_type_check CHECK ((decision_type = ANY (ARRAY['PROPOSAL'::text, 'AUTO_SAFE_MODE'::text, 'AUTO_EXECUTION'::text, 'MANUAL_OVERRIDE'::text])))
);


ALTER TABLE public.decision_events OWNER TO postgres;

--
-- Name: disputes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    stripe_dispute_id text,
    stripe_charge_id text,
    stripe_payment_intent_id text,
    amount integer NOT NULL,
    currency text DEFAULT 'usd'::text,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    evidence_due_by timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone
);


ALTER TABLE public.disputes OWNER TO postgres;

--
-- Name: email_tracking_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_tracking_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tracking_id text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text) NOT NULL,
    campaign_name text,
    email_template text,
    destination_url text NOT NULL,
    recipient_email text,
    client_id uuid,
    click_count integer DEFAULT 0,
    first_clicked_at timestamp with time zone,
    last_clicked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone
);


ALTER TABLE public.email_tracking_links OWNER TO postgres;

--
-- Name: enhanced_conversion_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enhanced_conversion_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    conversion_type text NOT NULL,
    email_provided text,
    phone_provided text,
    first_name_provided text,
    last_name_provided text,
    source text,
    google_api_status integer,
    google_api_response jsonb,
    success boolean DEFAULT false,
    error_message text,
    gclid text
);


ALTER TABLE public.enhanced_conversion_logs OWNER TO postgres;

--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    granted_by_admin_id uuid,
    granted_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone
);


ALTER TABLE public.enrollments OWNER TO postgres;

--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    color text DEFAULT '#6366f1'::text NOT NULL,
    icon text DEFAULT 'folder'::text,
    is_tax_deductible boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_account_id uuid,
    category_id uuid,
    plaid_transaction_id text,
    transaction_date date NOT NULL,
    posted_date date,
    merchant_name text,
    description text NOT NULL,
    amount numeric NOT NULL,
    currency_code text DEFAULT 'USD'::text,
    is_pending boolean DEFAULT false NOT NULL,
    is_recurring boolean DEFAULT false,
    is_manual_entry boolean DEFAULT false NOT NULL,
    is_auto_categorized boolean DEFAULT false,
    receipt_url text,
    notes text,
    tags text[],
    plaid_category text[],
    plaid_personal_finance_category jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: feature_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feature_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category text,
    status text DEFAULT 'requested'::text NOT NULL,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feature_requests_category_check CHECK ((category = ANY (ARRAY['campaigns'::text, 'billing'::text, 'crm'::text, 'hub'::text, 'other'::text]))),
    CONSTRAINT feature_requests_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'approved'::text, 'disapproved'::text, 'in_progress'::text, 'completed'::text])))
);


ALTER TABLE public.feature_requests OWNER TO postgres;

--
-- Name: ghl_api_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ghl_api_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_type text NOT NULL,
    company_id text,
    location_id text,
    status text NOT NULL,
    response_data jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ghl_api_logs OWNER TO postgres;

--
-- Name: ghl_available_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ghl_available_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id text NOT NULL,
    field_id text NOT NULL,
    field_name text NOT NULL,
    field_key text,
    field_type text,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ghl_available_fields OWNER TO postgres;

--
-- Name: ghl_custom_field_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ghl_custom_field_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    location_id text NOT NULL,
    field_name text NOT NULL,
    ghl_field_id text,
    ghl_field_name text,
    ghl_field_key text,
    is_auto_matched boolean DEFAULT true,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ghl_custom_field_mappings OWNER TO postgres;

--
-- Name: ghl_oauth_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ghl_oauth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    company_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ghl_oauth_tokens OWNER TO postgres;

--
-- Name: internal_marketing_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.internal_marketing_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid
);


ALTER TABLE public.internal_marketing_settings OWNER TO postgres;

--
-- Name: lead_attribution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_attribution (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    visitor_id text NOT NULL,
    first_touch_source text,
    first_touch_medium text,
    first_touch_campaign text,
    first_touch_content text,
    first_touch_term text,
    first_touch_gclid text,
    first_touch_fbclid text,
    first_touch_referrer text,
    first_touch_landing_page text,
    first_touch_at timestamp with time zone,
    last_touch_source text,
    last_touch_medium text,
    last_touch_campaign text,
    last_touch_content text,
    last_touch_term text,
    last_touch_gclid text,
    last_touch_fbclid text,
    last_touch_referrer text,
    last_touch_landing_page text,
    last_touch_at timestamp with time zone,
    touch_count integer DEFAULT 1,
    total_page_views integer DEFAULT 0,
    total_sessions integer DEFAULT 1,
    time_to_conversion_hours numeric,
    referral_code text,
    conversion_path jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lead_attribution OWNER TO postgres;

--
-- Name: lead_delivery_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_delivery_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    status text NOT NULL,
    ghl_location_id text,
    ghl_contact_id text,
    response_data jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lead_delivery_logs OWNER TO postgres;

--
-- Name: lead_pipeline_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_pipeline_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_date date DEFAULT CURRENT_DATE NOT NULL,
    agent_id text,
    stage text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lead_pipeline_metrics_stage_check CHECK ((stage = ANY (ARRAY['webhook_received'::text, 'stored'::text, 'delivered'::text, 'failed'::text])))
);


ALTER TABLE public.lead_pipeline_metrics OWNER TO postgres;

--
-- Name: lead_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    old_status text,
    new_status text NOT NULL,
    source_stage text,
    target_premium numeric,
    changed_at timestamp with time zone DEFAULT now(),
    changed_by text DEFAULT 'webhook'::text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lead_status_history OWNER TO postgres;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id text NOT NULL,
    agent_id text NOT NULL,
    lead_date timestamp with time zone,
    state text,
    first_name text,
    last_name text,
    phone text,
    email text,
    age text,
    employment text,
    interest text,
    savings text,
    investments text,
    timezone text,
    lead_source text,
    status text DEFAULT 'new'::text,
    notes text,
    lead_data jsonb DEFAULT '{}'::jsonb,
    webhook_payload jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    target_premium numeric,
    issued_premium numeric,
    submitted_at timestamp with time zone,
    approved_at timestamp with time zone,
    issued_at timestamp with time zone,
    submitted_premium numeric,
    approved_premium numeric,
    delivery_status text,
    delivered_at timestamp with time zone,
    delivery_error text,
    delivery_attempts integer DEFAULT 0,
    last_delivery_attempt_at timestamp with time zone,
    ghl_contact_id text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    gclid text,
    fbclid text,
    booked_call_at timestamp with time zone
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- Name: COLUMN leads.target_premium; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.target_premium IS 'Target premium amount when lead status is submitted';


--
-- Name: COLUMN leads.issued_premium; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.leads.issued_premium IS 'Actual premium amount when lead status is issued paid';


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    status text DEFAULT 'not_started'::text,
    progress_percent integer DEFAULT 0,
    last_position_seconds integer DEFAULT 0,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    time_spent_seconds integer DEFAULT 0,
    started_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lesson_progress_progress_percent_check CHECK (((progress_percent >= 0) AND (progress_percent <= 100))),
    CONSTRAINT lesson_progress_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])))
);


ALTER TABLE public.lesson_progress OWNER TO postgres;

--
-- Name: lesson_ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lesson_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.lesson_ratings OWNER TO postgres;

--
-- Name: lessons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    order_index integer DEFAULT 0,
    duration_seconds integer,
    bunny_embed_url text,
    bunny_video_id text,
    resources jsonb DEFAULT '[]'::jsonb,
    is_preview boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.lessons OWNER TO postgres;

--
-- Name: live_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.live_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stat_key text NOT NULL,
    stat_value numeric DEFAULT 0 NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.live_stats OWNER TO postgres;

--
-- Name: mcp_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mcp_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tool text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    result text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.mcp_audit_log OWNER TO postgres;

--
-- Name: modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    title text NOT NULL,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.modules OWNER TO postgres;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sound_enabled boolean DEFAULT true NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: nps_responses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nps_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    score integer NOT NULL,
    feedback text,
    google_review_offered boolean DEFAULT false,
    google_review_completed boolean DEFAULT false,
    google_review_credit_applied boolean DEFAULT false,
    video_review_offered boolean DEFAULT false,
    video_review_completed boolean DEFAULT false,
    video_review_credit_applied boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nps_responses_score_check CHECK (((score >= 0) AND (score <= 10)))
);


ALTER TABLE public.nps_responses OWNER TO postgres;

--
-- Name: onboarding_automation_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_automation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    status text DEFAULT 'pending'::text,
    current_step integer DEFAULT 0,
    total_steps integer DEFAULT 16,
    steps_completed jsonb DEFAULT '[]'::jsonb,
    steps_failed jsonb DEFAULT '[]'::jsonb,
    step_data jsonb DEFAULT '{}'::jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    last_step_at timestamp with time zone,
    error_log jsonb DEFAULT '[]'::jsonb,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT onboarding_automation_runs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'paused'::text])))
);


ALTER TABLE public.onboarding_automation_runs OWNER TO postgres;

--
-- Name: onboarding_checklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_checklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    category text NOT NULL,
    item_key text NOT NULL,
    item_label text NOT NULL,
    status public.onboarding_check_status DEFAULT 'pending'::public.onboarding_check_status NOT NULL,
    notes text,
    checked_by uuid,
    checked_at timestamp with time zone,
    ticket_id uuid,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    verification_notes text
);


ALTER TABLE public.onboarding_checklist OWNER TO postgres;

--
-- Name: onboarding_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.onboarding_settings OWNER TO postgres;

--
-- Name: onboarding_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.onboarding_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    task_name text NOT NULL,
    task_label text NOT NULL,
    display_order integer DEFAULT 0,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    completed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.onboarding_tasks OWNER TO postgres;

--
-- Name: partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    ghl_location_id text,
    calendar_link text,
    color text DEFAULT '#8b5cf6'::text NOT NULL,
    commission_percent numeric DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.partners OWNER TO postgres;

--
-- Name: performance_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.performance_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    leads_delivered_this_month integer DEFAULT 0,
    booked_calls_this_month integer DEFAULT 0,
    cost_per_lead numeric DEFAULT 0,
    fulfillment_status text DEFAULT 'green'::text NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT performance_snapshots_fulfillment_status_check CHECK ((fulfillment_status = ANY (ARRAY['green'::text, 'yellow'::text, 'red'::text])))
);


ALTER TABLE public.performance_snapshots OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text,
    email text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    last_login_at timestamp with time zone
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: proposals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    client_id uuid NOT NULL,
    proposed_action_type text NOT NULL,
    current_daily_budget numeric,
    proposed_daily_budget numeric,
    delta_pct numeric,
    reason_codes text[] DEFAULT '{}'::text[],
    ai_summary text,
    ai_diagnosis text,
    health_score integer,
    pacing_info jsonb,
    recommendation_confidence numeric,
    similar_cases_count integer DEFAULT 0,
    similar_cases_summary text,
    policy_version text,
    ai_provider text,
    status text DEFAULT 'pending'::text,
    approved_by uuid,
    approved_at timestamp with time zone,
    user_override_budget numeric,
    user_decline_reason text,
    decision_outcome text,
    primary_reason_category text,
    specific_reason_codes text[],
    next_action text,
    confidence_override text,
    user_note text,
    executed_at timestamp with time zone,
    execution_result jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT proposals_decision_outcome_check CHECK ((decision_outcome = ANY (ARRAY['APPROVE_AS_IS'::text, 'APPROVE_WITH_EDIT'::text, 'DENY_NO_CHANGE'::text, 'DENY_SET_SAFE_MODE'::text, 'ESCALATE_INVESTIGATION'::text]))),
    CONSTRAINT proposals_proposed_action_type_check CHECK ((proposed_action_type = ANY (ARRAY['SET_BUDGET'::text, 'SAFE_MODE'::text, 'INVESTIGATE'::text, 'RESTORE_BUDGET'::text]))),
    CONSTRAINT proposals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text, 'executed'::text, 'auto_executed'::text])))
);


ALTER TABLE public.proposals OWNER TO postgres;

--
-- Name: prospect_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospect_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prospect_id uuid NOT NULL,
    activity_type text NOT NULL,
    activity_data jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.prospect_activities OWNER TO postgres;

--
-- Name: prospect_attribution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospect_attribution (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prospect_id uuid NOT NULL,
    visitor_id text NOT NULL,
    first_touch_source text,
    first_touch_medium text,
    first_touch_campaign text,
    first_touch_content text,
    first_touch_term text,
    first_touch_gclid text,
    first_touch_fbclid text,
    first_touch_referrer text,
    first_touch_landing_page text,
    first_touch_at timestamp with time zone,
    last_touch_source text,
    last_touch_medium text,
    last_touch_campaign text,
    last_touch_content text,
    last_touch_term text,
    last_touch_gclid text,
    last_touch_fbclid text,
    last_touch_referrer text,
    last_touch_landing_page text,
    last_touch_at timestamp with time zone,
    total_sessions integer DEFAULT 1,
    total_page_views integer DEFAULT 0,
    time_to_conversion_hours numeric,
    referral_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    first_touch_utm_id text,
    first_touch_ttclid text,
    last_touch_utm_id text,
    last_touch_ttclid text,
    referrer_url text,
    first_referrer_url text
);


ALTER TABLE public.prospect_attribution OWNER TO postgres;

--
-- Name: prospect_available_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospect_available_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id text DEFAULT 'wDoj91sbkfxZnMbow2G5'::text NOT NULL,
    field_id text NOT NULL,
    field_key text NOT NULL,
    field_name text NOT NULL,
    field_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.prospect_available_fields OWNER TO postgres;

--
-- Name: prospect_field_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospect_field_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id text DEFAULT 'wDoj91sbkfxZnMbow2G5'::text NOT NULL,
    internal_field_name text NOT NULL,
    ghl_field_id text,
    ghl_field_key text,
    ghl_field_name text,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.prospect_field_mappings OWNER TO postgres;

--
-- Name: prospects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prospects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    phone text,
    team_size text,
    monthly_production text,
    biggest_challenge text,
    timeline_to_scale text,
    additional_info text,
    source_page text,
    status text DEFAULT 'applied'::text NOT NULL,
    application_submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    calendar_booked_at timestamp with time zone,
    converted_at timestamp with time zone,
    stripe_customer_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pipeline_stage_id uuid,
    forecast_probability integer DEFAULT 0,
    deal_value numeric DEFAULT 0,
    sales_notes text,
    assigned_to uuid,
    last_contacted_at timestamp with time zone,
    next_follow_up_at timestamp with time zone,
    lost_reason text,
    ghl_contact_id text,
    appointment_status text,
    ghl_appointment_id text,
    partner_id uuid,
    intent text DEFAULT 'unsure'::text,
    qual_status text DEFAULT 'unreviewed'::text,
    disqual_reason text,
    next_action_type text,
    next_action_due_at timestamp with time zone,
    next_action_owner_id uuid,
    appt_start_at timestamp with time zone,
    appt_end_at timestamp with time zone,
    appt_calendar_id text,
    appt_count_reschedules integer DEFAULT 0,
    appt_count_no_shows integer DEFAULT 0,
    call_type text DEFAULT 'system_setup'::text,
    last_contact_method text,
    owner_role text DEFAULT 'setter'::text,
    owner_user_id uuid,
    disposition text,
    offer_selected text,
    payment_status text DEFAULT 'not_paid'::text,
    payment_amount numeric DEFAULT 0,
    payment_method text,
    closed_at timestamp with time zone,
    client_id uuid,
    headshot_url text,
    call_count integer DEFAULT 0,
    lead_source text,
    referrer_client_id uuid,
    referral_code text,
    ad_spend_budget numeric DEFAULT 0,
    billing_frequency text DEFAULT 'monthly'::text,
    ad_spend_invoice_pending boolean DEFAULT false,
    management_fee numeric DEFAULT 0,
    deposit_type text DEFAULT 'full'::text,
    deposit_amount numeric DEFAULT 0,
    first_contact_at timestamp with time zone,
    licensed_status text,
    monthly_budget_range text,
    desired_timeline text,
    current_bottleneck text,
    qualified_path text,
    payment_plan_interest text,
    payment_plan_credit_available text,
    calculator_notes text,
    avg_monthly_issued_paid text,
    has_downline boolean,
    downline_count integer,
    post_booking_submitted_at timestamp with time zone,
    contact_capture_at timestamp with time zone,
    qualification_submit_at timestamp with time zone,
    timezone text,
    referrer_url text,
    first_referrer_url text,
    manual_source text,
    manual_referrer_agent_name text,
    ghl_location_id text,
    partial_answers jsonb DEFAULT '{}'::jsonb,
    last_activity_at timestamp with time zone DEFAULT now(),
    form_completed_at timestamp with time zone,
    partial_sync_sent_at timestamp with time zone,
    CONSTRAINT prospects_forecast_probability_check CHECK (((forecast_probability IS NULL) OR ((forecast_probability >= 0) AND (forecast_probability <= 100))))
);


ALTER TABLE public.prospects OWNER TO postgres;

--
-- Name: COLUMN prospects.call_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospects.call_count IS 'Number of completed calls with this prospect';


--
-- Name: COLUMN prospects.lead_source; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospects.lead_source IS 'Manual lead source: Referral, Facebook, Instagram, SEO, YouTube, Partner, Direct, Other';


--
-- Name: COLUMN prospects.qualified_path; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospects.qualified_path IS 'Tracks stage progression: Contact Captured, Qualified (standard), Qualified (payment plan), Disqualified (budget), Disqualified (license), Booked, Post-booking Complete';


--
-- Name: COLUMN prospects.partial_sync_sent_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.prospects.partial_sync_sent_at IS 'Timestamp when partial_answers were synced to GHL due to inactivity (one-time).';


--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    partner_id uuid,
    CONSTRAINT either_client_or_partner CHECK ((((client_id IS NOT NULL) AND (partner_id IS NULL)) OR ((client_id IS NULL) AND (partner_id IS NOT NULL))))
);


ALTER TABLE public.referral_codes OWNER TO postgres;

--
-- Name: referral_commission_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_commission_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    commission_percentage numeric DEFAULT 10 NOT NULL,
    billing_types text DEFAULT ARRAY['management'::text],
    is_lifetime boolean DEFAULT true,
    max_months integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.referral_commission_config OWNER TO postgres;

--
-- Name: referral_partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    referral_code text,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


ALTER TABLE public.referral_partners OWNER TO postgres;

--
-- Name: referral_rewards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_id uuid,
    referrer_client_id uuid NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    reward_type text DEFAULT 'signup_bonus'::text NOT NULL,
    status public.reward_status DEFAULT 'pending'::public.reward_status NOT NULL,
    period_start date,
    period_end date,
    paid_at timestamp with time zone,
    payment_reference text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    billing_record_id uuid,
    referred_client_name text
);


ALTER TABLE public.referral_rewards OWNER TO postgres;

--
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_client_id uuid,
    referred_client_id uuid,
    referral_code_id uuid NOT NULL,
    referred_email text NOT NULL,
    referred_name text,
    status public.referral_status DEFAULT 'pending'::public.referral_status NOT NULL,
    referred_at timestamp with time zone DEFAULT now() NOT NULL,
    signed_up_at timestamp with time zone,
    activated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    referrer_partner_id uuid,
    CONSTRAINT either_client_or_partner_referrer CHECK ((((referrer_client_id IS NOT NULL) AND (referrer_partner_id IS NULL)) OR ((referrer_client_id IS NULL) AND (referrer_partner_id IS NOT NULL))))
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- Name: rolling_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rolling_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    last_7d_spend numeric DEFAULT 0,
    last_7d_clicks integer DEFAULT 0,
    last_7d_impressions integer DEFAULT 0,
    last_7d_conversions integer DEFAULT 0,
    last_7d_ctr numeric,
    last_7d_cvr numeric,
    last_7d_cpl numeric,
    last_7d_cpc numeric,
    last_7d_avg_utilization numeric,
    prior_7d_spend numeric DEFAULT 0,
    prior_7d_clicks integer DEFAULT 0,
    prior_7d_impressions integer DEFAULT 0,
    prior_7d_conversions integer DEFAULT 0,
    prior_7d_ctr numeric,
    prior_7d_cvr numeric,
    prior_7d_cpl numeric,
    prior_7d_cpc numeric,
    delta_spend_pct numeric,
    delta_conversions_pct numeric,
    delta_ctr_pct numeric,
    delta_cvr_pct numeric,
    delta_cpl_pct numeric,
    delta_cpc_pct numeric,
    created_at timestamp with time zone DEFAULT now(),
    leads_7d integer,
    booked_calls_7d integer,
    booked_call_rate_7d numeric,
    health_score_breakdown jsonb
);


ALTER TABLE public.rolling_snapshots OWNER TO postgres;

--
-- Name: sales_pipeline_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_pipeline_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_name text NOT NULL,
    stage_key text NOT NULL,
    color text DEFAULT '#6b7280'::text NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    is_closed boolean DEFAULT false NOT NULL,
    ghl_tag text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sales_pipeline_stages OWNER TO postgres;

--
-- Name: sales_team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sales_team_members OWNER TO postgres;

--
-- Name: sheet_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sheet_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sheet_url text NOT NULL,
    sheet_tab text DEFAULT 'Agent_Config'::text NOT NULL,
    column_mappings jsonb DEFAULT '{}'::jsonb NOT NULL,
    refresh_interval_seconds integer DEFAULT 300 NOT NULL,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sheet_config OWNER TO postgres;

--
-- Name: sla_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sla_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


ALTER TABLE public.sla_settings OWNER TO postgres;

--
-- Name: support_agents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    categories text[] DEFAULT '{}'::text[] NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    team text DEFAULT 'customer_service'::text
);


ALTER TABLE public.support_agents OWNER TO postgres;

--
-- Name: COLUMN support_agents.team; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.support_agents.team IS 'Team categorization: customer_service, tech_support, management, etc.';


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    subject text NOT NULL,
    message text NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_reply_at timestamp with time zone,
    due_date timestamp with time zone,
    onboarding_checklist_id uuid,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    priority public.ticket_priority DEFAULT 'normal'::public.ticket_priority NOT NULL,
    sla_deadline timestamp with time zone,
    escalated_at timestamp with time zone,
    resolved_at timestamp with time zone,
    ticket_type text DEFAULT 'client_support'::text,
    ticket_number integer NOT NULL,
    labels jsonb DEFAULT '[]'::jsonb,
    resolution_notes text,
    CONSTRAINT support_tickets_category_check CHECK ((category = ANY (ARRAY['billing'::text, 'leads'::text, 'tech'::text, 'onboarding'::text, 'other'::text]))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'waiting'::text, 'resolved'::text, 'closed'::text]))),
    CONSTRAINT support_tickets_ticket_type_check CHECK ((ticket_type = ANY (ARRAY['client_support'::text, 'internal'::text, 'bug_report'::text, 'feature_request'::text, 'update'::text, 'system_change'::text])))
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: support_tickets_ticket_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_tickets_ticket_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_tickets_ticket_number_seq OWNER TO postgres;

--
-- Name: support_tickets_ticket_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_tickets_ticket_number_seq OWNED BY public.support_tickets.ticket_number;


--
-- Name: system_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text DEFAULT 'lead_discrepancy'::text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    acknowledged_at timestamp with time zone,
    acknowledged_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.system_alerts OWNER TO postgres;

--
-- Name: TABLE system_alerts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.system_alerts IS 'System alerts for admin notifications like lead discrepancies';


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    image_url text,
    quote text NOT NULL,
    stats_badge text NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.testimonials OWNER TO postgres;

--
-- Name: ticket_activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    old_value text,
    new_value text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ticket_activity_log OWNER TO postgres;

--
-- Name: ticket_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    reply_id uuid,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size integer,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT attachment_parent_check CHECK (((ticket_id IS NOT NULL) OR (reply_id IS NOT NULL)))
);


ALTER TABLE public.ticket_attachments OWNER TO postgres;

--
-- Name: ticket_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_replies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    is_admin_reply boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ticket_replies OWNER TO postgres;

--
-- Name: ticket_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    category text DEFAULT 'other'::text NOT NULL,
    priority public.ticket_priority DEFAULT 'normal'::public.ticket_priority NOT NULL,
    ticket_type text DEFAULT 'internal'::text,
    labels jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ticket_templates OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'guest'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: visitor_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visitor_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_id text NOT NULL,
    session_id text NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    page_url text,
    element_id text,
    element_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.visitor_events OWNER TO postgres;

--
-- Name: visitor_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visitor_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    visitor_id text NOT NULL,
    session_id text NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    gclid text,
    fbclid text,
    referrer_url text,
    referral_code text,
    landing_page text,
    device_type text,
    user_agent text,
    ip_country text,
    ip_region text,
    converted_at timestamp with time zone,
    lead_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text
);


ALTER TABLE public.visitor_sessions OWNER TO postgres;

--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    client_id text NOT NULL,
    transaction_type text NOT NULL,
    amount numeric NOT NULL,
    balance_after numeric NOT NULL,
    description text,
    billing_record_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['deposit'::text, 'spend'::text, 'adjustment'::text])))
);


ALTER TABLE public.wallet_transactions OWNER TO postgres;

--
-- Name: webhook_api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    api_key text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    request_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.webhook_api_keys OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: messages_2026_03_10; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_10 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_10 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_11; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_11 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_11 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_12; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_12 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_12 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_13; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_13 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_13 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_14; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_14 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_14 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_15; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_15 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_15 OWNER TO supabase_admin;

--
-- Name: messages_2026_03_16; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_16 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_16 OWNER TO supabase_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- Name: messages_2026_03_10; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_10 FOR VALUES FROM ('2026-03-10 00:00:00') TO ('2026-03-11 00:00:00');


--
-- Name: messages_2026_03_11; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_11 FOR VALUES FROM ('2026-03-11 00:00:00') TO ('2026-03-12 00:00:00');


--
-- Name: messages_2026_03_12; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_12 FOR VALUES FROM ('2026-03-12 00:00:00') TO ('2026-03-13 00:00:00');


--
-- Name: messages_2026_03_13; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_13 FOR VALUES FROM ('2026-03-13 00:00:00') TO ('2026-03-14 00:00:00');


--
-- Name: messages_2026_03_14; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_14 FOR VALUES FROM ('2026-03-14 00:00:00') TO ('2026-03-15 00:00:00');


--
-- Name: messages_2026_03_15; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_15 FOR VALUES FROM ('2026-03-15 00:00:00') TO ('2026-03-16 00:00:00');


--
-- Name: messages_2026_03_16; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_16 FOR VALUES FROM ('2026-03-16 00:00:00') TO ('2026-03-17 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: support_tickets ticket_number; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN ticket_number SET DEFAULT nextval('public.support_tickets_ticket_number_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ad_spend_daily ad_spend_daily_client_id_campaign_id_spend_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_spend_daily
    ADD CONSTRAINT ad_spend_daily_client_id_campaign_id_spend_date_key UNIQUE (client_id, campaign_id, spend_date);


--
-- Name: ad_spend_daily ad_spend_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_spend_daily
    ADD CONSTRAINT ad_spend_daily_pkey PRIMARY KEY (id);


--
-- Name: admin_channel_members admin_channel_members_channel_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_channel_members
    ADD CONSTRAINT admin_channel_members_channel_id_user_id_key UNIQUE (channel_id, user_id);


--
-- Name: admin_channel_members admin_channel_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_channel_members
    ADD CONSTRAINT admin_channel_members_pkey PRIMARY KEY (id);


--
-- Name: admin_channel_messages admin_channel_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_channel_messages
    ADD CONSTRAINT admin_channel_messages_pkey PRIMARY KEY (id);


--
-- Name: admin_channels admin_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_channels
    ADD CONSTRAINT admin_channels_pkey PRIMARY KEY (id);


--
-- Name: admin_dm_conversations admin_dm_conversations_participant1_id_participant2_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dm_conversations
    ADD CONSTRAINT admin_dm_conversations_participant1_id_participant2_id_key UNIQUE (participant1_id, participant2_id);


--
-- Name: admin_dm_conversations admin_dm_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dm_conversations
    ADD CONSTRAINT admin_dm_conversations_pkey PRIMARY KEY (id);


--
-- Name: admin_dm_messages admin_dm_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dm_messages
    ADD CONSTRAINT admin_dm_messages_pkey PRIMARY KEY (id);


--
-- Name: agreement_otps agreement_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agreement_otps
    ADD CONSTRAINT agreement_otps_pkey PRIMARY KEY (id);


--
-- Name: agreement_templates agreement_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agreement_templates
    ADD CONSTRAINT agreement_templates_pkey PRIMARY KEY (id);


--
-- Name: agreement_templates agreement_templates_template_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agreement_templates
    ADD CONSTRAINT agreement_templates_template_id_key UNIQUE (template_id);


--
-- Name: agreements agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agreements
    ADD CONSTRAINT agreements_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_plaid_account_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_plaid_account_id_key UNIQUE (plaid_account_id);


--
-- Name: billing_collection_events billing_collection_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_collection_events
    ADD CONSTRAINT billing_collection_events_pkey PRIMARY KEY (id);


--
-- Name: billing_collections billing_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_collections
    ADD CONSTRAINT billing_collections_pkey PRIMARY KEY (id);


--
-- Name: billing_records billing_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_records
    ADD CONSTRAINT billing_records_pkey PRIMARY KEY (id);


--
-- Name: billing_verifications billing_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_verifications
    ADD CONSTRAINT billing_verifications_pkey PRIMARY KEY (id);


--
-- Name: business_screenshots business_screenshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_screenshots
    ADD CONSTRAINT business_screenshots_pkey PRIMARY KEY (id);


--
-- Name: call_logs call_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_pkey PRIMARY KEY (id);


--
-- Name: campaign_audit_log campaign_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_audit_log
    ADD CONSTRAINT campaign_audit_log_pkey PRIMARY KEY (id);


--
-- Name: campaign_budget_changes campaign_budget_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_budget_changes
    ADD CONSTRAINT campaign_budget_changes_pkey PRIMARY KEY (id);


--
-- Name: campaign_settings campaign_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_settings
    ADD CONSTRAINT campaign_settings_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_google_customer_id_google_campaign_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_google_customer_id_google_campaign_id_key UNIQUE (google_customer_id, google_campaign_id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: categorization_rules categorization_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorization_rules
    ADD CONSTRAINT categorization_rules_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_client_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_client_id_key UNIQUE (client_id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_settings chat_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_settings
    ADD CONSTRAINT chat_settings_pkey PRIMARY KEY (id);


--
-- Name: chat_settings chat_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_settings
    ADD CONSTRAINT chat_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: client_credits client_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_credits
    ADD CONSTRAINT client_credits_pkey PRIMARY KEY (id);


--
-- Name: client_kpi_daily client_kpi_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_kpi_daily
    ADD CONSTRAINT client_kpi_daily_pkey PRIMARY KEY (id);


--
-- Name: client_kpi_daily client_kpi_daily_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_kpi_daily
    ADD CONSTRAINT client_kpi_daily_unique UNIQUE (client_id, date);


--
-- Name: client_kpi_rolling client_kpi_rolling_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_kpi_rolling
    ADD CONSTRAINT client_kpi_rolling_pkey PRIMARY KEY (id);


--
-- Name: client_kpi_rolling client_kpi_rolling_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_kpi_rolling
    ADD CONSTRAINT client_kpi_rolling_unique UNIQUE (client_id, snapshot_date);


--
-- Name: client_payment_methods client_payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_payment_methods
    ADD CONSTRAINT client_payment_methods_pkey PRIMARY KEY (id);


--
-- Name: client_payment_methods client_payment_methods_stripe_payment_method_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_payment_methods
    ADD CONSTRAINT client_payment_methods_stripe_payment_method_id_key UNIQUE (stripe_payment_method_id);


--
-- Name: client_self_onboarding client_self_onboarding_client_id_task_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_self_onboarding
    ADD CONSTRAINT client_self_onboarding_client_id_task_key_key UNIQUE (client_id, task_key);


--
-- Name: client_self_onboarding client_self_onboarding_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_self_onboarding
    ADD CONSTRAINT client_self_onboarding_pkey PRIMARY KEY (id);


--
-- Name: client_stripe_customers client_stripe_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_stripe_customers
    ADD CONSTRAINT client_stripe_customers_pkey PRIMARY KEY (id);


--
-- Name: client_stripe_customers client_stripe_customers_unique_customer; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_stripe_customers
    ADD CONSTRAINT client_stripe_customers_unique_customer UNIQUE (stripe_customer_id);


--
-- Name: client_stripe_subscriptions client_stripe_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_stripe_subscriptions
    ADD CONSTRAINT client_stripe_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: client_stripe_subscriptions client_stripe_subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_stripe_subscriptions
    ADD CONSTRAINT client_stripe_subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: client_wallets client_wallets_client_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_wallets
    ADD CONSTRAINT client_wallets_client_id_key UNIQUE (client_id);


--
-- Name: client_wallets client_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_wallets
    ADD CONSTRAINT client_wallets_pkey PRIMARY KEY (id);


--
-- Name: clients clients_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_agent_id_key UNIQUE (agent_id);


--
-- Name: clients clients_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_unique UNIQUE (email);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: community_comments community_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_pkey PRIMARY KEY (id);


--
-- Name: community_posts community_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);


--
-- Name: conversions conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversions
    ADD CONSTRAINT conversions_pkey PRIMARY KEY (id);


--
-- Name: conversions conversions_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversions
    ADD CONSTRAINT conversions_transaction_id_key UNIQUE (transaction_id);


--
-- Name: course_user_progress course_user_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_user_progress
    ADD CONSTRAINT course_user_progress_pkey PRIMARY KEY (id);


--
-- Name: course_user_progress course_user_progress_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_user_progress
    ADD CONSTRAINT course_user_progress_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: decision_events decision_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.decision_events
    ADD CONSTRAINT decision_events_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- Name: disputes disputes_stripe_dispute_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_stripe_dispute_id_key UNIQUE (stripe_dispute_id);


--
-- Name: email_tracking_links email_tracking_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_tracking_links
    ADD CONSTRAINT email_tracking_links_pkey PRIMARY KEY (id);


--
-- Name: email_tracking_links email_tracking_links_tracking_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_tracking_links
    ADD CONSTRAINT email_tracking_links_tracking_id_key UNIQUE (tracking_id);


--
-- Name: enhanced_conversion_logs enhanced_conversion_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enhanced_conversion_logs
    ADD CONSTRAINT enhanced_conversion_logs_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_user_id_course_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_course_id_key UNIQUE (user_id, course_id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_plaid_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_plaid_transaction_id_key UNIQUE (plaid_transaction_id);


--
-- Name: feature_requests feature_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_pkey PRIMARY KEY (id);


--
-- Name: ghl_api_logs ghl_api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ghl_api_logs
    ADD CONSTRAINT ghl_api_logs_pkey PRIMARY KEY (id);


--
-- Name: ghl_available_fields ghl_available_fields_location_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ghl_available_fields
    ADD CONSTRAINT ghl_available_fields_location_id_field_id_key UNIQUE (location_id, field_id);


--
-- Name: ghl_available_fields ghl_available_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ghl_available_fields
    ADD CONSTRAINT ghl_available_fields_pkey PRIMARY KEY (id);


--
-- Name: ghl_custom_field_mappings ghl_custom_field_mappings_client_id_field_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ghl_custom_field_mappings
    ADD CONSTRAINT ghl_custom_field_mappings_client_id_field_name_key UNIQUE (client_id, field_name);


--
-- Name: ghl_custom_field_mappings ghl_custom_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ghl_custom_field_mappings
    ADD CONSTRAINT ghl_custom_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: ghl_oauth_tokens ghl_oauth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ghl_oauth_tokens
    ADD CONSTRAINT ghl_oauth_tokens_pkey PRIMARY KEY (id);


--
-- Name: internal_marketing_settings internal_marketing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_marketing_settings
    ADD CONSTRAINT internal_marketing_settings_pkey PRIMARY KEY (id);


--
-- Name: internal_marketing_settings internal_marketing_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_marketing_settings
    ADD CONSTRAINT internal_marketing_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: lead_attribution lead_attribution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_attribution
    ADD CONSTRAINT lead_attribution_pkey PRIMARY KEY (id);


--
-- Name: lead_delivery_logs lead_delivery_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_delivery_logs
    ADD CONSTRAINT lead_delivery_logs_pkey PRIMARY KEY (id);


--
-- Name: lead_pipeline_metrics lead_pipeline_metrics_metric_date_agent_id_stage_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipeline_metrics
    ADD CONSTRAINT lead_pipeline_metrics_metric_date_agent_id_stage_key UNIQUE (metric_date, agent_id, stage);


--
-- Name: lead_pipeline_metrics lead_pipeline_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_pipeline_metrics
    ADD CONSTRAINT lead_pipeline_metrics_pkey PRIMARY KEY (id);


--
-- Name: lead_status_history lead_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_status_history
    ADD CONSTRAINT lead_status_history_pkey PRIMARY KEY (id);


--
-- Name: leads leads_lead_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_lead_id_key UNIQUE (lead_id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_user_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


--
-- Name: lesson_ratings lesson_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_ratings
    ADD CONSTRAINT lesson_ratings_pkey PRIMARY KEY (id);


--
-- Name: lesson_ratings lesson_ratings_user_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_ratings
    ADD CONSTRAINT lesson_ratings_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: live_stats live_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_stats
    ADD CONSTRAINT live_stats_pkey PRIMARY KEY (id);


--
-- Name: live_stats live_stats_stat_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.live_stats
    ADD CONSTRAINT live_stats_stat_key_key UNIQUE (stat_key);


--
-- Name: mcp_audit_log mcp_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mcp_audit_log
    ADD CONSTRAINT mcp_audit_log_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: nps_responses nps_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nps_responses
    ADD CONSTRAINT nps_responses_pkey PRIMARY KEY (id);


--
-- Name: onboarding_automation_runs onboarding_automation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_automation_runs
    ADD CONSTRAINT onboarding_automation_runs_pkey PRIMARY KEY (id);


--
-- Name: onboarding_checklist onboarding_checklist_client_id_item_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklist
    ADD CONSTRAINT onboarding_checklist_client_id_item_key_key UNIQUE (client_id, item_key);


--
-- Name: onboarding_checklist onboarding_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklist
    ADD CONSTRAINT onboarding_checklist_pkey PRIMARY KEY (id);


--
-- Name: onboarding_settings onboarding_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_settings
    ADD CONSTRAINT onboarding_settings_pkey PRIMARY KEY (id);


--
-- Name: onboarding_settings onboarding_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_settings
    ADD CONSTRAINT onboarding_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: onboarding_tasks onboarding_tasks_client_id_task_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_tasks
    ADD CONSTRAINT onboarding_tasks_client_id_task_name_key UNIQUE (client_id, task_name);


--
-- Name: onboarding_tasks onboarding_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_tasks
    ADD CONSTRAINT onboarding_tasks_pkey PRIMARY KEY (id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: partners partners_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_slug_key UNIQUE (slug);


--
-- Name: performance_snapshots performance_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_snapshots
    ADD CONSTRAINT performance_snapshots_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: proposals proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);


--
-- Name: prospect_activities prospect_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospect_activities
    ADD CONSTRAINT prospect_activities_pkey PRIMARY KEY (id);


--
-- Name: prospect_attribution prospect_attribution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospect_attribution
    ADD CONSTRAINT prospect_attribution_pkey PRIMARY KEY (id);


--
-- Name: prospect_available_fields prospect_available_fields_location_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospect_available_fields
    ADD CONSTRAINT prospect_available_fields_location_id_field_id_key UNIQUE (location_id, field_id);


--
-- Name: prospect_available_fields prospect_available_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospect_available_fields
    ADD CONSTRAINT prospect_available_fields_pkey PRIMARY KEY (id);


--
-- Name: prospect_field_mappings prospect_field_mappings_location_id_internal_field_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospect_field_mappings
    ADD CONSTRAINT prospect_field_mappings_location_id_internal_field_name_key UNIQUE (location_id, internal_field_name);


--
-- Name: prospect_field_mappings prospect_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospect_field_mappings
    ADD CONSTRAINT prospect_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: prospects prospects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_commission_config referral_commission_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_commission_config
    ADD CONSTRAINT referral_commission_config_pkey PRIMARY KEY (id);


--
-- Name: referral_partners referral_partners_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_email_key UNIQUE (email);


--
-- Name: referral_partners referral_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_pkey PRIMARY KEY (id);


--
-- Name: referral_partners referral_partners_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_referral_code_key UNIQUE (referral_code);


--
-- Name: referral_rewards referral_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_unique_email_referrer; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_unique_email_referrer UNIQUE (referred_email, referrer_client_id);


--
-- Name: rolling_snapshots rolling_snapshots_campaign_id_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rolling_snapshots
    ADD CONSTRAINT rolling_snapshots_campaign_id_snapshot_date_key UNIQUE (campaign_id, snapshot_date);


--
-- Name: rolling_snapshots rolling_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rolling_snapshots
    ADD CONSTRAINT rolling_snapshots_pkey PRIMARY KEY (id);


--
-- Name: sales_pipeline_stages sales_pipeline_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_pipeline_stages
    ADD CONSTRAINT sales_pipeline_stages_pkey PRIMARY KEY (id);


--
-- Name: sales_pipeline_stages sales_pipeline_stages_stage_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_pipeline_stages
    ADD CONSTRAINT sales_pipeline_stages_stage_key_key UNIQUE (stage_key);


--
-- Name: sales_team_members sales_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_team_members
    ADD CONSTRAINT sales_team_members_pkey PRIMARY KEY (id);


--
-- Name: sheet_config sheet_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sheet_config
    ADD CONSTRAINT sheet_config_pkey PRIMARY KEY (id);


--
-- Name: sla_settings sla_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_settings
    ADD CONSTRAINT sla_settings_pkey PRIMARY KEY (id);


--
-- Name: sla_settings sla_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sla_settings
    ADD CONSTRAINT sla_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: support_agents support_agents_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_agents
    ADD CONSTRAINT support_agents_email_key UNIQUE (email);


--
-- Name: support_agents support_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_agents
    ADD CONSTRAINT support_agents_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: system_alerts system_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: ticket_activity_log ticket_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_activity_log
    ADD CONSTRAINT ticket_activity_log_pkey PRIMARY KEY (id);


--
-- Name: ticket_attachments ticket_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_pkey PRIMARY KEY (id);


--
-- Name: ticket_replies ticket_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_replies
    ADD CONSTRAINT ticket_replies_pkey PRIMARY KEY (id);


--
-- Name: ticket_templates ticket_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_templates
    ADD CONSTRAINT ticket_templates_pkey PRIMARY KEY (id);


--
-- Name: referral_codes unique_client_referral_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT unique_client_referral_code UNIQUE (client_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: visitor_events visitor_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitor_events
    ADD CONSTRAINT visitor_events_pkey PRIMARY KEY (id);


--
-- Name: visitor_sessions visitor_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitor_sessions
    ADD CONSTRAINT visitor_sessions_pkey PRIMARY KEY (id);


--
-- Name: visitor_sessions visitor_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitor_sessions
    ADD CONSTRAINT visitor_sessions_session_id_key UNIQUE (session_id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: webhook_api_keys webhook_api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_api_keys
    ADD CONSTRAINT webhook_api_keys_api_key_key UNIQUE (api_key);


--
-- Name: webhook_api_keys webhook_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_api_keys
    ADD CONSTRAINT webhook_api_keys_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_10 messages_2026_03_10_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_10
    ADD CONSTRAINT messages_2026_03_10_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_11 messages_2026_03_11_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_11
    ADD CONSTRAINT messages_2026_03_11_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_12 messages_2026_03_12_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_12
    ADD CONSTRAINT messages_2026_03_12_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_13 messages_2026_03_13_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_13
    ADD CONSTRAINT messages_2026_03_13_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_14 messages_2026_03_14_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_14
    ADD CONSTRAINT messages_2026_03_14_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_15 messages_2026_03_15_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_15
    ADD CONSTRAINT messages_2026_03_15_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2026_03_16 messages_2026_03_16_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_16
    ADD CONSTRAINT messages_2026_03_16_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: agreement_otps_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX agreement_otps_phone_idx ON public.agreement_otps USING btree (phone);


--
-- Name: campaign_settings_campaign_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX campaign_settings_campaign_unique ON public.campaign_settings USING btree (campaign_id) WHERE (campaign_id IS NOT NULL);


--
-- Name: campaign_settings_global_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX campaign_settings_global_unique ON public.campaign_settings USING btree ((1)) WHERE (campaign_id IS NULL);


--
-- Name: clients_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX clients_email_idx ON public.clients USING btree (email);


--
-- Name: clients_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clients_status_idx ON public.clients USING btree (status);


--
-- Name: clients_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clients_user_id_idx ON public.clients USING btree (user_id);


--
-- Name: idx_ad_spend_daily_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ad_spend_daily_campaign ON public.ad_spend_daily USING btree (campaign_id);


--
-- Name: idx_ad_spend_daily_client_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ad_spend_daily_client_date ON public.ad_spend_daily USING btree (client_id, spend_date);


--
-- Name: idx_ad_spend_daily_client_spend; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ad_spend_daily_client_spend ON public.ad_spend_daily USING btree (client_id, spend_date);


--
-- Name: idx_admin_channel_members_channel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_channel_members_channel ON public.admin_channel_members USING btree (channel_id);


--
-- Name: idx_admin_channel_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_channel_members_user ON public.admin_channel_members USING btree (user_id);


--
-- Name: idx_admin_channel_messages_channel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_channel_messages_channel ON public.admin_channel_messages USING btree (channel_id);


--
-- Name: idx_admin_channel_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_channel_messages_created_at ON public.admin_channel_messages USING btree (created_at DESC);


--
-- Name: idx_admin_dm_messages_conversation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_dm_messages_conversation ON public.admin_dm_messages USING btree (conversation_id);


--
-- Name: idx_admin_dm_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_dm_messages_created_at ON public.admin_dm_messages USING btree (created_at DESC);


--
-- Name: idx_agreement_otps_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agreement_otps_email ON public.agreement_otps USING btree (phone);


--
-- Name: idx_agreement_otps_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agreement_otps_expires_at ON public.agreement_otps USING btree (expires_at);


--
-- Name: idx_agreements_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agreements_client_id ON public.agreements USING btree (client_id);


--
-- Name: idx_agreements_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_agreements_status ON public.agreements USING btree (status);


--
-- Name: idx_billing_records_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_records_client_id ON public.billing_records USING btree (client_id);


--
-- Name: idx_billing_records_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_records_due_date ON public.billing_records USING btree (due_date);


--
-- Name: idx_billing_records_recurrence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_records_recurrence ON public.billing_records USING btree (recurrence_type, next_due_date);


--
-- Name: idx_billing_records_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_records_status ON public.billing_records USING btree (status);


--
-- Name: idx_billing_verif_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_verif_client ON public.billing_verifications USING btree (client_id, created_at DESC);


--
-- Name: idx_billing_verif_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_verif_type ON public.billing_verifications USING btree (verification_type, created_at DESC);


--
-- Name: idx_budget_changes_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_changes_campaign ON public.campaign_budget_changes USING btree (campaign_id);


--
-- Name: idx_budget_changes_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_changes_client ON public.campaign_budget_changes USING btree (client_id);


--
-- Name: idx_budget_changes_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_changes_created ON public.campaign_budget_changes USING btree (created_at DESC);


--
-- Name: idx_call_logs_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_logs_date ON public.call_logs USING btree (call_date DESC);


--
-- Name: idx_call_logs_fathom_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_logs_fathom_id ON public.call_logs USING btree (fathom_call_id);


--
-- Name: idx_call_logs_prospect; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_call_logs_prospect ON public.call_logs USING btree (prospect_id);


--
-- Name: idx_campaign_audit_log_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaign_audit_log_campaign ON public.campaign_audit_log USING btree (campaign_id);


--
-- Name: idx_campaign_audit_log_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaign_audit_log_created ON public.campaign_audit_log USING btree (created_at DESC);


--
-- Name: idx_campaigns_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaigns_client_id ON public.campaigns USING btree (client_id);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_campaigns_status ON public.campaigns USING btree (status);


--
-- Name: idx_categorization_rules_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categorization_rules_priority ON public.categorization_rules USING btree (priority DESC, is_active);


--
-- Name: idx_chat_conversations_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_conversations_client_id ON public.chat_conversations USING btree (client_id);


--
-- Name: idx_chat_conversations_last_message; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_conversations_last_message ON public.chat_conversations USING btree (last_message_at DESC NULLS LAST);


--
-- Name: idx_chat_messages_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);


--
-- Name: idx_chat_messages_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);


--
-- Name: idx_client_credits_available; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_credits_available ON public.client_credits USING btree (client_id) WHERE (applied_to_billing_id IS NULL);


--
-- Name: idx_client_credits_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_credits_client_id ON public.client_credits USING btree (client_id);


--
-- Name: idx_client_kpi_daily_client_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_kpi_daily_client_date ON public.client_kpi_daily USING btree (client_id, date DESC);


--
-- Name: idx_client_kpi_rolling_client_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_kpi_rolling_client_date ON public.client_kpi_rolling USING btree (client_id, snapshot_date DESC);


--
-- Name: idx_client_self_onboarding_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_self_onboarding_client_id ON public.client_self_onboarding USING btree (client_id);


--
-- Name: idx_clients_automation_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_automation_status ON public.clients USING btree (onboarding_status, automation_started_at) WHERE (onboarding_status = 'in_progress'::public.onboarding_status);


--
-- Name: idx_clients_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_deleted_at ON public.clients USING btree (deleted_at);


--
-- Name: idx_clients_npn; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_npn ON public.clients USING btree (npn);


--
-- Name: idx_clients_prospect_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_prospect_id ON public.clients USING btree (prospect_id);


--
-- Name: idx_clients_referral_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_referral_code ON public.clients USING btree (referral_code);


--
-- Name: idx_clients_referred_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_referred_by ON public.clients USING btree (referred_by_client_id);


--
-- Name: idx_clients_referred_by_secondary; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_referred_by_secondary ON public.clients USING btree (referred_by_client_id_secondary);


--
-- Name: idx_community_comments_post_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_comments_post_id ON public.community_comments USING btree (post_id);


--
-- Name: idx_community_posts_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_posts_type ON public.community_posts USING btree (type);


--
-- Name: idx_community_posts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_community_posts_user_id ON public.community_posts USING btree (user_id);


--
-- Name: idx_conversions_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversions_email ON public.conversions USING btree (email);


--
-- Name: idx_conversions_visitor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversions_visitor_id ON public.conversions USING btree (visitor_id) WHERE (visitor_id IS NOT NULL);


--
-- Name: idx_course_user_progress_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_course_user_progress_course_id ON public.course_user_progress USING btree (course_id);


--
-- Name: idx_course_user_progress_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_course_user_progress_user_id ON public.course_user_progress USING btree (user_id);


--
-- Name: idx_decision_events_campaign; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_decision_events_campaign ON public.decision_events USING btree (campaign_id);


--
-- Name: idx_decision_events_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_decision_events_created ON public.decision_events USING btree (created_at DESC);


--
-- Name: idx_decision_events_outcome; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_decision_events_outcome ON public.decision_events USING btree (decision_outcome);


--
-- Name: idx_decision_events_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_decision_events_status ON public.decision_events USING btree (status_at_decision);


--
-- Name: idx_disputes_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_disputes_client_id ON public.disputes USING btree (client_id);


--
-- Name: idx_disputes_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_disputes_created_at ON public.disputes USING btree (created_at DESC);


--
-- Name: idx_disputes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_disputes_status ON public.disputes USING btree (status);


--
-- Name: idx_email_tracking_links_tracking_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_tracking_links_tracking_id ON public.email_tracking_links USING btree (tracking_id);


--
-- Name: idx_enrollments_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollments_course_id ON public.enrollments USING btree (course_id);


--
-- Name: idx_enrollments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_enrollments_user_id ON public.enrollments USING btree (user_id);


--
-- Name: idx_expenses_bank_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_bank_account_id ON public.expenses USING btree (bank_account_id);


--
-- Name: idx_expenses_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_category_id ON public.expenses USING btree (category_id);


--
-- Name: idx_expenses_merchant_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_merchant_name ON public.expenses USING btree (merchant_name);


--
-- Name: idx_expenses_transaction_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_transaction_date ON public.expenses USING btree (transaction_date DESC);


--
-- Name: idx_ghl_available_fields_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ghl_available_fields_location ON public.ghl_available_fields USING btree (location_id);


--
-- Name: idx_ghl_custom_field_mappings_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ghl_custom_field_mappings_client ON public.ghl_custom_field_mappings USING btree (client_id);


--
-- Name: idx_ghl_custom_field_mappings_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ghl_custom_field_mappings_location ON public.ghl_custom_field_mappings USING btree (location_id);


--
-- Name: idx_lead_attribution_first_touch_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_attribution_first_touch_source ON public.lead_attribution USING btree (first_touch_source) WHERE (first_touch_source IS NOT NULL);


--
-- Name: idx_lead_attribution_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_attribution_lead_id ON public.lead_attribution USING btree (lead_id);


--
-- Name: idx_lead_attribution_referral_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_attribution_referral_code ON public.lead_attribution USING btree (referral_code) WHERE (referral_code IS NOT NULL);


--
-- Name: idx_lead_attribution_visitor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_attribution_visitor_id ON public.lead_attribution USING btree (visitor_id);


--
-- Name: idx_lead_delivery_logs_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_delivery_logs_lead_id ON public.lead_delivery_logs USING btree (lead_id);


--
-- Name: idx_lead_status_history_changed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_status_history_changed_at ON public.lead_status_history USING btree (changed_at DESC);


--
-- Name: idx_lead_status_history_lead_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lead_status_history_lead_id ON public.lead_status_history USING btree (lead_id);


--
-- Name: idx_leads_agent_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_agent_email ON public.leads USING btree (agent_id, email);


--
-- Name: idx_leads_agent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_agent_id ON public.leads USING btree (agent_id);


--
-- Name: idx_leads_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_created_at ON public.leads USING btree (created_at);


--
-- Name: idx_leads_delivery_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_delivery_status ON public.leads USING btree (delivery_status) WHERE (delivery_status = ANY (ARRAY['pending'::text, 'failed'::text]));


--
-- Name: idx_leads_lead_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_lead_date ON public.leads USING btree (lead_date DESC);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_lesson_progress_lesson_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lesson_progress_lesson_id ON public.lesson_progress USING btree (lesson_id);


--
-- Name: idx_lesson_progress_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lesson_progress_user_id ON public.lesson_progress USING btree (user_id);


--
-- Name: idx_lesson_ratings_lesson_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lesson_ratings_lesson_id ON public.lesson_ratings USING btree (lesson_id);


--
-- Name: idx_lesson_ratings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lesson_ratings_user_id ON public.lesson_ratings USING btree (user_id);


--
-- Name: idx_lessons_module_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lessons_module_id ON public.lessons USING btree (module_id);


--
-- Name: idx_modules_course_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_modules_course_id ON public.modules USING btree (course_id);


--
-- Name: idx_nps_responses_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nps_responses_client_id ON public.nps_responses USING btree (client_id);


--
-- Name: idx_nps_responses_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nps_responses_created_at ON public.nps_responses USING btree (created_at DESC);


--
-- Name: idx_onboarding_checklist_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_checklist_category ON public.onboarding_checklist USING btree (category);


--
-- Name: idx_onboarding_checklist_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_checklist_client_id ON public.onboarding_checklist USING btree (client_id);


--
-- Name: idx_onboarding_checklist_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_onboarding_checklist_status ON public.onboarding_checklist USING btree (status);


--
-- Name: idx_pipeline_metrics_agent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pipeline_metrics_agent ON public.lead_pipeline_metrics USING btree (agent_id);


--
-- Name: idx_pipeline_metrics_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pipeline_metrics_date ON public.lead_pipeline_metrics USING btree (metric_date);


--
-- Name: idx_pipeline_metrics_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pipeline_metrics_stage ON public.lead_pipeline_metrics USING btree (stage);


--
-- Name: idx_proposals_campaign_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proposals_campaign_id ON public.proposals USING btree (campaign_id);


--
-- Name: idx_proposals_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proposals_client_id ON public.proposals USING btree (client_id);


--
-- Name: idx_proposals_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proposals_created_at ON public.proposals USING btree (created_at DESC);


--
-- Name: idx_proposals_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proposals_status ON public.proposals USING btree (status);


--
-- Name: idx_prospect_activities_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospect_activities_date ON public.prospect_activities USING btree (created_at DESC);


--
-- Name: idx_prospect_activities_prospect; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospect_activities_prospect ON public.prospect_activities USING btree (prospect_id);


--
-- Name: idx_prospect_activities_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospect_activities_type ON public.prospect_activities USING btree (activity_type);


--
-- Name: idx_prospect_attribution_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospect_attribution_created_at ON public.prospect_attribution USING btree (created_at);


--
-- Name: idx_prospect_attribution_prospect_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospect_attribution_prospect_id ON public.prospect_attribution USING btree (prospect_id);


--
-- Name: idx_prospect_attribution_referral_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospect_attribution_referral_code ON public.prospect_attribution USING btree (referral_code) WHERE (referral_code IS NOT NULL);


--
-- Name: idx_prospect_attribution_visitor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospect_attribution_visitor_id ON public.prospect_attribution USING btree (visitor_id);


--
-- Name: idx_prospects_appointment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_appointment_status ON public.prospects USING btree (appointment_status);


--
-- Name: idx_prospects_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_assigned_to ON public.prospects USING btree (assigned_to);


--
-- Name: idx_prospects_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_created_at ON public.prospects USING btree (created_at);


--
-- Name: idx_prospects_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_email ON public.prospects USING btree (email);


--
-- Name: idx_prospects_ghl_appointment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_ghl_appointment_id ON public.prospects USING btree (ghl_appointment_id);


--
-- Name: idx_prospects_ghl_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_ghl_contact ON public.prospects USING btree (ghl_contact_id);


--
-- Name: idx_prospects_last_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_last_activity ON public.prospects USING btree (last_activity_at) WHERE (form_completed_at IS NULL);


--
-- Name: idx_prospects_next_action_due; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_next_action_due ON public.prospects USING btree (next_action_due_at) WHERE (next_action_due_at IS NOT NULL);


--
-- Name: idx_prospects_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_owner ON public.prospects USING btree (owner_user_id, owner_role);


--
-- Name: idx_prospects_partial_sync_sent_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_partial_sync_sent_at ON public.prospects USING btree (partial_sync_sent_at) WHERE (partial_sync_sent_at IS NULL);


--
-- Name: idx_prospects_partner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_partner ON public.prospects USING btree (partner_id);


--
-- Name: idx_prospects_payment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_payment_status ON public.prospects USING btree (payment_status);


--
-- Name: idx_prospects_pipeline_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_pipeline_stage ON public.prospects USING btree (pipeline_stage_id);


--
-- Name: idx_prospects_qualified_path; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_qualified_path ON public.prospects USING btree (qualified_path);


--
-- Name: idx_prospects_referral_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_referral_code ON public.prospects USING btree (referral_code);


--
-- Name: idx_prospects_referrer_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_referrer_client_id ON public.prospects USING btree (referrer_client_id);


--
-- Name: idx_prospects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_status ON public.prospects USING btree (status);


--
-- Name: idx_prospects_visitor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_prospects_visitor_id ON public.prospects USING btree (visitor_id);


--
-- Name: idx_referral_codes_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_codes_client_id ON public.referral_codes USING btree (client_id);


--
-- Name: idx_referral_codes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_codes_code ON public.referral_codes USING btree (code);


--
-- Name: idx_referral_codes_code_lower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_codes_code_lower ON public.referral_codes USING btree (lower(code));


--
-- Name: idx_referral_rewards_billing_record_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_rewards_billing_record_id ON public.referral_rewards USING btree (billing_record_id);


--
-- Name: idx_referral_rewards_referrer_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_rewards_referrer_client_id ON public.referral_rewards USING btree (referrer_client_id);


--
-- Name: idx_referral_rewards_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_rewards_status ON public.referral_rewards USING btree (status);


--
-- Name: idx_referrals_referred_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referred_client_id ON public.referrals USING btree (referred_client_id);


--
-- Name: idx_referrals_referrer_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_referrer_client_id ON public.referrals USING btree (referrer_client_id);


--
-- Name: idx_referrals_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referrals_status ON public.referrals USING btree (status);


--
-- Name: idx_support_tickets_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);


--
-- Name: idx_support_tickets_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_client_id ON public.support_tickets USING btree (client_id);


--
-- Name: idx_support_tickets_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_created_at ON public.support_tickets USING btree (created_at);


--
-- Name: idx_support_tickets_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_priority ON public.support_tickets USING btree (priority);


--
-- Name: idx_support_tickets_sla_deadline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_sla_deadline ON public.support_tickets USING btree (sla_deadline);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_support_tickets_ticket_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_ticket_number ON public.support_tickets USING btree (ticket_number);


--
-- Name: idx_ticket_activity_log_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_activity_log_ticket_id ON public.ticket_activity_log USING btree (ticket_id);


--
-- Name: idx_ticket_attachments_reply_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_attachments_reply_id ON public.ticket_attachments USING btree (reply_id);


--
-- Name: idx_ticket_attachments_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ticket_attachments_ticket_id ON public.ticket_attachments USING btree (ticket_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_visitor_events_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_events_created_at ON public.visitor_events USING btree (created_at DESC);


--
-- Name: idx_visitor_events_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_events_event_type ON public.visitor_events USING btree (event_type);


--
-- Name: idx_visitor_events_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_events_session_id ON public.visitor_events USING btree (session_id);


--
-- Name: idx_visitor_events_visitor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_events_visitor_id ON public.visitor_events USING btree (visitor_id);


--
-- Name: idx_visitor_sessions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_sessions_created_at ON public.visitor_sessions USING btree (created_at DESC);


--
-- Name: idx_visitor_sessions_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_sessions_email ON public.visitor_sessions USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_visitor_sessions_referral_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_sessions_referral_code ON public.visitor_sessions USING btree (referral_code) WHERE (referral_code IS NOT NULL);


--
-- Name: idx_visitor_sessions_referral_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_sessions_referral_lookup ON public.visitor_sessions USING btree (visitor_id, created_at DESC) WHERE ((referral_code IS NOT NULL) AND (referral_code <> ''::text));


--
-- Name: idx_visitor_sessions_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_sessions_session_id ON public.visitor_sessions USING btree (session_id);


--
-- Name: idx_visitor_sessions_utm_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_sessions_utm_source ON public.visitor_sessions USING btree (utm_source) WHERE (utm_source IS NOT NULL);


--
-- Name: idx_visitor_sessions_visitor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visitor_sessions_visitor_id ON public.visitor_sessions USING btree (visitor_id);


--
-- Name: idx_wallet_transactions_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_transactions_client_id ON public.wallet_transactions USING btree (client_id);


--
-- Name: idx_wallet_transactions_wallet_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions USING btree (wallet_id);


--
-- Name: idx_wallet_tx_billing_record_deposit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_wallet_tx_billing_record_deposit ON public.wallet_transactions USING btree (billing_record_id, transaction_type) WHERE (billing_record_id IS NOT NULL);


--
-- Name: performance_snapshots_client_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX performance_snapshots_client_id_idx ON public.performance_snapshots USING btree (client_id);


--
-- Name: support_tickets_client_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX support_tickets_client_id_idx ON public.support_tickets USING btree (client_id);


--
-- Name: ticket_replies_ticket_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ticket_replies_ticket_id_idx ON public.ticket_replies USING btree (ticket_id);


--
-- Name: uq_billing_records_stripe_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_billing_records_stripe_invoice_id ON public.billing_records USING btree (stripe_invoice_id) WHERE ((stripe_invoice_id IS NOT NULL) AND (archived_at IS NULL));


--
-- Name: uq_billing_records_stripe_payment_intent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_billing_records_stripe_payment_intent_id ON public.billing_records USING btree (stripe_payment_intent_id) WHERE ((stripe_payment_intent_id IS NOT NULL) AND (archived_at IS NULL));


--
-- Name: uq_wallet_transactions_billing_record_deposit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_wallet_transactions_billing_record_deposit ON public.wallet_transactions USING btree (billing_record_id) WHERE ((billing_record_id IS NOT NULL) AND (transaction_type = 'deposit'::text));


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_10_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_10_inserted_at_topic_idx ON realtime.messages_2026_03_10 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_11_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_11_inserted_at_topic_idx ON realtime.messages_2026_03_11 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_12_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_12_inserted_at_topic_idx ON realtime.messages_2026_03_12 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_13_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_13_inserted_at_topic_idx ON realtime.messages_2026_03_13 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_14_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_14_inserted_at_topic_idx ON realtime.messages_2026_03_14 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_15_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_15_inserted_at_topic_idx ON realtime.messages_2026_03_15 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2026_03_16_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_16_inserted_at_topic_idx ON realtime.messages_2026_03_16 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2026_03_10_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_10_inserted_at_topic_idx;


--
-- Name: messages_2026_03_10_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_10_pkey;


--
-- Name: messages_2026_03_11_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_11_inserted_at_topic_idx;


--
-- Name: messages_2026_03_11_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_11_pkey;


--
-- Name: messages_2026_03_12_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_12_inserted_at_topic_idx;


--
-- Name: messages_2026_03_12_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_12_pkey;


--
-- Name: messages_2026_03_13_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_13_inserted_at_topic_idx;


--
-- Name: messages_2026_03_13_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_13_pkey;


--
-- Name: messages_2026_03_14_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_14_inserted_at_topic_idx;


--
-- Name: messages_2026_03_14_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_14_pkey;


--
-- Name: messages_2026_03_15_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_15_inserted_at_topic_idx;


--
-- Name: messages_2026_03_15_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_15_pkey;


--
-- Name: messages_2026_03_16_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_16_inserted_at_topic_idx;


--
-- Name: messages_2026_03_16_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_16_pkey;


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: campaign_settings campaign_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER campaign_settings_updated_at BEFORE UPDATE ON public.campaign_settings FOR EACH ROW EXECUTE FUNCTION public.update_campaigns_updated_at();


--
-- Name: campaigns campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_campaigns_updated_at();


--
-- Name: decision_events decision_events_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER decision_events_updated_at BEFORE UPDATE ON public.decision_events FOR EACH ROW EXECUTE FUNCTION public.update_campaigns_updated_at();


--
-- Name: feature_requests feature_requests_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER feature_requests_set_updated_at BEFORE UPDATE ON public.feature_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: chat_messages on_chat_message_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_chat_message_insert AFTER INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();


--
-- Name: clients on_client_created_generate_referral_code; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_client_created_generate_referral_code AFTER INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code();


--
-- Name: courses on_course_published; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_course_published AFTER INSERT OR UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.enroll_all_users_on_publish();


--
-- Name: proposals proposals_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_campaigns_updated_at();


--
-- Name: prospects trg_activate_referral_on_conversion; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_activate_referral_on_conversion BEFORE UPDATE OF client_id ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.activate_referral_on_prospect_conversion();


--
-- Name: prospect_attribution trg_link_prospect_referrer_on_attribution; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_link_prospect_referrer_on_attribution AFTER INSERT OR UPDATE OF referral_code ON public.prospect_attribution FOR EACH ROW EXECUTE FUNCTION public.link_prospect_to_referrer();


--
-- Name: prospects trg_link_prospect_referrer_on_prospects; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_link_prospect_referrer_on_prospects BEFORE INSERT OR UPDATE OF referral_code, visitor_id ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.link_prospect_to_referrer();


--
-- Name: admin_channel_messages trg_prevent_duplicate_admin_channel_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_duplicate_admin_channel_message BEFORE INSERT ON public.admin_channel_messages FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_admin_channel_message();


--
-- Name: admin_dm_messages trg_prevent_duplicate_admin_dm_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_duplicate_admin_dm_message BEFORE INSERT ON public.admin_dm_messages FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_admin_dm_message();


--
-- Name: chat_messages trg_prevent_duplicate_chat_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_prevent_duplicate_chat_message BEFORE INSERT ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_chat_message();


--
-- Name: support_tickets trigger_auto_assign_ticket; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_assign_ticket BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.auto_assign_ticket();


--
-- Name: onboarding_checklist trigger_check_stage_completion; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_check_stage_completion AFTER UPDATE ON public.onboarding_checklist FOR EACH ROW EXECUTE FUNCTION public.check_stage_completion_and_notify();


--
-- Name: support_tickets trigger_log_ticket_changes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_log_ticket_changes AFTER UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.log_ticket_changes();


--
-- Name: chat_conversations trigger_send_welcome_chat_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_send_welcome_chat_message AFTER INSERT ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.send_welcome_chat_message();


--
-- Name: leads trigger_track_lead_stage_history; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_track_lead_stage_history BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.track_lead_stage_history();


--
-- Name: admin_dm_messages update_admin_dm_conversation_on_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admin_dm_conversation_on_message AFTER INSERT ON public.admin_dm_messages FOR EACH ROW EXECUTE FUNCTION public.update_admin_dm_on_message();


--
-- Name: bank_accounts update_bank_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: billing_collections update_billing_collections_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_billing_collections_updated_at BEFORE UPDATE ON public.billing_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: billing_records update_billing_records_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_billing_records_updated_at BEFORE UPDATE ON public.billing_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categorization_rules update_categorization_rules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categorization_rules_updated_at BEFORE UPDATE ON public.categorization_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_credits update_client_credits_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_client_credits_updated_at BEFORE UPDATE ON public.client_credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_payment_methods update_client_payment_methods_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_client_payment_methods_updated_at BEFORE UPDATE ON public.client_payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_client_payment_methods_updated_at();


--
-- Name: client_self_onboarding update_client_self_onboarding_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_client_self_onboarding_updated_at BEFORE UPDATE ON public.client_self_onboarding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_stripe_customers update_client_stripe_customers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_client_stripe_customers_updated_at BEFORE UPDATE ON public.client_stripe_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_stripe_subscriptions update_client_stripe_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_client_stripe_subscriptions_updated_at BEFORE UPDATE ON public.client_stripe_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_wallets update_client_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_client_wallets_updated_at BEFORE UPDATE ON public.client_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: disputes update_disputes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expense_categories update_expense_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expenses update_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ghl_oauth_tokens update_ghl_oauth_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ghl_oauth_tokens_updated_at BEFORE UPDATE ON public.ghl_oauth_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: internal_marketing_settings update_internal_marketing_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_internal_marketing_settings_updated_at BEFORE UPDATE ON public.internal_marketing_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lead_attribution update_lead_attribution_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_lead_attribution_updated_at BEFORE UPDATE ON public.lead_attribution FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_leads_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_preferences update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nps_responses update_nps_responses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_nps_responses_updated_at BEFORE UPDATE ON public.nps_responses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onboarding_automation_runs update_onboarding_automation_runs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_onboarding_automation_runs_updated_at BEFORE UPDATE ON public.onboarding_automation_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onboarding_checklist update_onboarding_checklist_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_onboarding_checklist_updated_at BEFORE UPDATE ON public.onboarding_checklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onboarding_settings update_onboarding_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_onboarding_settings_updated_at BEFORE UPDATE ON public.onboarding_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onboarding_tasks update_onboarding_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_onboarding_tasks_updated_at BEFORE UPDATE ON public.onboarding_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prospect_attribution update_prospect_attribution_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_prospect_attribution_updated_at BEFORE UPDATE ON public.prospect_attribution FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prospect_available_fields update_prospect_available_fields_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_prospect_available_fields_updated_at BEFORE UPDATE ON public.prospect_available_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prospect_field_mappings update_prospect_field_mappings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_prospect_field_mappings_updated_at BEFORE UPDATE ON public.prospect_field_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prospects update_prospects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: referral_partners update_referral_partners_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_referral_partners_updated_at BEFORE UPDATE ON public.referral_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sheet_config update_sheet_config_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sheet_config_updated_at BEFORE UPDATE ON public.sheet_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sla_settings update_sla_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sla_settings_updated_at BEFORE UPDATE ON public.sla_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_agents update_support_agents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_support_agents_updated_at BEFORE UPDATE ON public.support_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: testimonials update_testimonials_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webhook_api_keys update_webhook_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_webhook_api_keys_updated_at BEFORE UPDATE ON public.webhook_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: ad_spend_daily ad_spend_daily_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ad_spend_daily
    ADD CONSTRAINT ad_spend_daily_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: admin_channel_members admin_channel_members_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_channel_members
    ADD CONSTRAINT admin_channel_members_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.admin_channels(id) ON DELETE CASCADE;


--
-- Name: admin_channel_members admin_channel_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_channel_members
    ADD CONSTRAINT admin_channel_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_channel_messages admin_channel_messages_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_channel_messages
    ADD CONSTRAINT admin_channel_messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.admin_channels(id) ON DELETE CASCADE;


--
-- Name: admin_channel_messages admin_channel_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_channel_messages
    ADD CONSTRAINT admin_channel_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_channels admin_channels_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_channels
    ADD CONSTRAINT admin_channels_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_dm_conversations admin_dm_conversations_participant1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dm_conversations
    ADD CONSTRAINT admin_dm_conversations_participant1_id_fkey FOREIGN KEY (participant1_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_dm_conversations admin_dm_conversations_participant2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dm_conversations
    ADD CONSTRAINT admin_dm_conversations_participant2_id_fkey FOREIGN KEY (participant2_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_dm_messages admin_dm_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dm_messages
    ADD CONSTRAINT admin_dm_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.admin_dm_conversations(id) ON DELETE CASCADE;


--
-- Name: admin_dm_messages admin_dm_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_dm_messages
    ADD CONSTRAINT admin_dm_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: agreement_otps agreement_otps_agreement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agreement_otps
    ADD CONSTRAINT agreement_otps_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id) ON DELETE CASCADE;


--
-- Name: agreements agreements_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agreements
    ADD CONSTRAINT agreements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: billing_collection_events billing_collection_events_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_collection_events
    ADD CONSTRAINT billing_collection_events_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.billing_collections(id) ON DELETE CASCADE;


--
-- Name: billing_collections billing_collections_billing_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_collections
    ADD CONSTRAINT billing_collections_billing_record_id_fkey FOREIGN KEY (billing_record_id) REFERENCES public.billing_records(id) ON DELETE CASCADE;


--
-- Name: billing_records billing_records_credit_applied_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_records
    ADD CONSTRAINT billing_records_credit_applied_id_fkey FOREIGN KEY (credit_applied_id) REFERENCES public.client_credits(id) ON DELETE SET NULL;


--
-- Name: billing_records billing_records_parent_billing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_records
    ADD CONSTRAINT billing_records_parent_billing_id_fkey FOREIGN KEY (parent_billing_id) REFERENCES public.billing_records(id);


--
-- Name: billing_verifications billing_verifications_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_verifications
    ADD CONSTRAINT billing_verifications_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: billing_verifications billing_verifications_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_verifications
    ADD CONSTRAINT billing_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);


--
-- Name: call_logs call_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: call_logs call_logs_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.call_logs
    ADD CONSTRAINT call_logs_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE;


--
-- Name: campaign_audit_log campaign_audit_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_audit_log
    ADD CONSTRAINT campaign_audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id);


--
-- Name: campaign_audit_log campaign_audit_log_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_audit_log
    ADD CONSTRAINT campaign_audit_log_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: campaign_audit_log campaign_audit_log_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_audit_log
    ADD CONSTRAINT campaign_audit_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: campaign_audit_log campaign_audit_log_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_audit_log
    ADD CONSTRAINT campaign_audit_log_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;


--
-- Name: campaign_budget_changes campaign_budget_changes_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_budget_changes
    ADD CONSTRAINT campaign_budget_changes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_budget_changes campaign_budget_changes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_budget_changes
    ADD CONSTRAINT campaign_budget_changes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: campaign_settings campaign_settings_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_settings
    ADD CONSTRAINT campaign_settings_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_ignored_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_ignored_by_fkey FOREIGN KEY (ignored_by) REFERENCES auth.users(id);


--
-- Name: categorization_rules categorization_rules_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorization_rules
    ADD CONSTRAINT categorization_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE CASCADE;


--
-- Name: chat_conversations chat_conversations_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: client_credits client_credits_applied_to_billing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_credits
    ADD CONSTRAINT client_credits_applied_to_billing_id_fkey FOREIGN KEY (applied_to_billing_id) REFERENCES public.billing_records(id) ON DELETE SET NULL;


--
-- Name: client_self_onboarding client_self_onboarding_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_self_onboarding
    ADD CONSTRAINT client_self_onboarding_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_wallets client_wallets_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_wallets
    ADD CONSTRAINT client_wallets_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: clients clients_agreement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES public.agreements(id);


--
-- Name: clients clients_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id);


--
-- Name: clients clients_referred_by_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_referred_by_client_id_fkey FOREIGN KEY (referred_by_client_id) REFERENCES public.clients(id);


--
-- Name: clients clients_referred_by_client_id_secondary_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_referred_by_client_id_secondary_fkey FOREIGN KEY (referred_by_client_id_secondary) REFERENCES public.clients(id);


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_comments community_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;


--
-- Name: community_comments community_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: community_posts community_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: course_user_progress course_user_progress_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_user_progress
    ADD CONSTRAINT course_user_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: decision_events decision_events_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.decision_events
    ADD CONSTRAINT decision_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: decision_events decision_events_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.decision_events
    ADD CONSTRAINT decision_events_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: decision_events decision_events_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.decision_events
    ADD CONSTRAINT decision_events_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;


--
-- Name: disputes disputes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_granted_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_granted_by_admin_id_fkey FOREIGN KEY (granted_by_admin_id) REFERENCES auth.users(id);


--
-- Name: enrollments enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: expense_categories expense_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.expense_categories(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id) ON DELETE SET NULL;


--
-- Name: feature_requests feature_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: ghl_custom_field_mappings ghl_custom_field_mappings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ghl_custom_field_mappings
    ADD CONSTRAINT ghl_custom_field_mappings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: internal_marketing_settings internal_marketing_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internal_marketing_settings
    ADD CONSTRAINT internal_marketing_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: lesson_progress lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lesson_ratings lesson_ratings_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson_ratings
    ADD CONSTRAINT lesson_ratings_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: modules modules_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: nps_responses nps_responses_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nps_responses
    ADD CONSTRAINT nps_responses_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: onboarding_automation_runs onboarding_automation_runs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_automation_runs
    ADD CONSTRAINT onboarding_automation_runs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: onboarding_checklist onboarding_checklist_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklist
    ADD CONSTRAINT onboarding_checklist_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: onboarding_checklist onboarding_checklist_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_checklist
    ADD CONSTRAINT onboarding_checklist_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE SET NULL;


--
-- Name: onboarding_tasks onboarding_tasks_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_tasks
    ADD CONSTRAINT onboarding_tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: onboarding_tasks onboarding_tasks_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.onboarding_tasks
    ADD CONSTRAINT onboarding_tasks_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES auth.users(id);


--
-- Name: performance_snapshots performance_snapshots_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_snapshots
    ADD CONSTRAINT performance_snapshots_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: proposals proposals_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: prospect_activities prospect_activities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospect_activities
    ADD CONSTRAINT prospect_activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: prospect_activities prospect_activities_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospect_activities
    ADD CONSTRAINT prospect_activities_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE;


--
-- Name: prospect_attribution prospect_attribution_prospect_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospect_attribution
    ADD CONSTRAINT prospect_attribution_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id) ON DELETE CASCADE;


--
-- Name: prospects prospects_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);


--
-- Name: prospects prospects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: prospects prospects_next_action_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_next_action_owner_id_fkey FOREIGN KEY (next_action_owner_id) REFERENCES auth.users(id);


--
-- Name: prospects prospects_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id);


--
-- Name: prospects prospects_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- Name: prospects prospects_pipeline_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_pipeline_stage_id_fkey FOREIGN KEY (pipeline_stage_id) REFERENCES public.sales_pipeline_stages(id);


--
-- Name: prospects prospects_referrer_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prospects
    ADD CONSTRAINT prospects_referrer_client_id_fkey FOREIGN KEY (referrer_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: referral_codes referral_codes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: referral_codes referral_codes_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.referral_partners(id) ON DELETE CASCADE;


--
-- Name: referral_partners referral_partners_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: referral_partners referral_partners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referral_rewards referral_rewards_billing_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_billing_record_id_fkey FOREIGN KEY (billing_record_id) REFERENCES public.billing_records(id) ON DELETE SET NULL;


--
-- Name: referral_rewards referral_rewards_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE;


--
-- Name: referral_rewards referral_rewards_referrer_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_referrer_client_id_fkey FOREIGN KEY (referrer_client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referral_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_client_id_fkey FOREIGN KEY (referred_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: referrals referrals_referrer_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_client_id_fkey FOREIGN KEY (referrer_client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referrer_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_partner_id_fkey FOREIGN KEY (referrer_partner_id) REFERENCES public.referral_partners(id) ON DELETE CASCADE;


--
-- Name: rolling_snapshots rolling_snapshots_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rolling_snapshots
    ADD CONSTRAINT rolling_snapshots_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: sales_team_members sales_team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_team_members
    ADD CONSTRAINT sales_team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: support_agents support_agents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_agents
    ADD CONSTRAINT support_agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_onboarding_checklist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_onboarding_checklist_id_fkey FOREIGN KEY (onboarding_checklist_id) REFERENCES public.onboarding_checklist(id) ON DELETE SET NULL;


--
-- Name: ticket_activity_log ticket_activity_log_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_activity_log
    ADD CONSTRAINT ticket_activity_log_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_activity_log ticket_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_activity_log
    ADD CONSTRAINT ticket_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: ticket_attachments ticket_attachments_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_reply_id_fkey FOREIGN KEY (reply_id) REFERENCES public.ticket_replies(id) ON DELETE CASCADE;


--
-- Name: ticket_attachments ticket_attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_attachments ticket_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: ticket_replies ticket_replies_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_replies
    ADD CONSTRAINT ticket_replies_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_replies ticket_replies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_replies
    ADD CONSTRAINT ticket_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ticket_templates ticket_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_templates
    ADD CONSTRAINT ticket_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_billing_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_billing_record_id_fkey FOREIGN KEY (billing_record_id) REFERENCES public.billing_records(id);


--
-- Name: wallet_transactions wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.client_wallets(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_verifications Admin access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin access" ON public.billing_verifications USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: internal_marketing_settings Admin can manage internal marketing settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can manage internal marketing settings" ON public.internal_marketing_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: business_screenshots Admin can view all screenshots; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can view all screenshots" ON public.business_screenshots FOR SELECT USING (true);


--
-- Name: testimonials Admin can view all testimonials; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can view all testimonials" ON public.testimonials FOR SELECT USING (true);


--
-- Name: admin_dm_conversations Admins can create DM conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create DM conversations" ON public.admin_dm_conversations FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND ((participant1_id = auth.uid()) OR (participant2_id = auth.uid()))));


--
-- Name: admin_channels Admins can create channels; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can create channels" ON public.admin_channels FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (created_by = auth.uid())));


--
-- Name: ghl_oauth_tokens Admins can manage GHL tokens; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage GHL tokens" ON public.ghl_oauth_tokens USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nps_responses Admins can manage NPS responses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage NPS responses" ON public.nps_responses USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sla_settings Admins can manage SLA settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage SLA settings" ON public.sla_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_stripe_customers Admins can manage all Stripe customers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all Stripe customers" ON public.client_stripe_customers USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ad_spend_daily Admins can manage all ad spend data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all ad spend data" ON public.ad_spend_daily USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agreements Admins can manage all agreements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all agreements" ON public.agreements TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: billing_collections Admins can manage all billing collections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all billing collections" ON public.billing_collections USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: billing_records Admins can manage all billing records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all billing records" ON public.billing_records TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_checklist Admins can manage all checklist items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all checklist items" ON public.onboarding_checklist USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: clients Admins can manage all clients; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all clients" ON public.clients USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: billing_collection_events Admins can manage all collection events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all collection events" ON public.billing_collection_events USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: community_comments Admins can manage all comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all comments" ON public.community_comments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chat_conversations Admins can manage all conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all conversations" ON public.chat_conversations USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: courses Admins can manage all courses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all courses" ON public.courses TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_credits Admins can manage all credits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all credits" ON public.client_credits USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lead_delivery_logs Admins can manage all delivery logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all delivery logs" ON public.lead_delivery_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: enrollments Admins can manage all enrollments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all enrollments" ON public.enrollments TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: leads Admins can manage all leads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all leads" ON public.leads USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lessons Admins can manage all lessons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all lessons" ON public.lessons TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chat_messages Admins can manage all messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all messages" ON public.chat_messages USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: modules Admins can manage all modules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all modules" ON public.modules TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notification_preferences Admins can manage all notification preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all notification preferences" ON public.notification_preferences USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_tasks Admins can manage all onboarding tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all onboarding tasks" ON public.onboarding_tasks USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referral_partners Admins can manage all partners; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all partners" ON public.referral_partners USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_payment_methods Admins can manage all payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all payment methods" ON public.client_payment_methods USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: community_posts Admins can manage all posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all posts" ON public.community_posts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: prospects Admins can manage all prospects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all prospects" ON public.prospects USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referral_codes Admins can manage all referral codes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all referral codes" ON public.referral_codes USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referrals Admins can manage all referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all referrals" ON public.referrals USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ticket_replies Admins can manage all replies; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all replies" ON public.ticket_replies USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referral_rewards Admins can manage all rewards; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all rewards" ON public.referral_rewards USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_self_onboarding Admins can manage all self-onboarding tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all self-onboarding tasks" ON public.client_self_onboarding USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: performance_snapshots Admins can manage all snapshots; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all snapshots" ON public.performance_snapshots USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_alerts Admins can manage all system alerts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all system alerts" ON public.system_alerts USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: wallet_transactions Admins can manage all wallet transactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all wallet transactions" ON public.wallet_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_wallets Admins can manage all wallets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all wallets" ON public.client_wallets USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: lead_attribution Admins can manage attribution; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage attribution" ON public.lead_attribution USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_automation_runs Admins can manage automation runs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage automation runs" ON public.onboarding_automation_runs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ghl_available_fields Admins can manage available fields; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage available fields" ON public.ghl_available_fields USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bank_accounts Admins can manage bank accounts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage bank accounts" ON public.bank_accounts USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: call_logs Admins can manage call logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage call logs" ON public.call_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: campaign_settings Admins can manage campaign_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage campaign_settings" ON public.campaign_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: campaigns Admins can manage campaigns; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage campaigns" ON public.campaigns USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categorization_rules Admins can manage categorization rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage categorization rules" ON public.categorization_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chat_settings Admins can manage chat settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage chat settings" ON public.chat_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referral_commission_config Admins can manage commission config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage commission config" ON public.referral_commission_config USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: conversions Admins can manage conversions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage conversions" ON public.conversions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: decision_events Admins can manage decision_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage decision_events" ON public.decision_events USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: disputes Admins can manage disputes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage disputes" ON public.disputes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: email_tracking_links Admins can manage email tracking; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage email tracking" ON public.email_tracking_links USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: expense_categories Admins can manage expense categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage expense categories" ON public.expense_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: expenses Admins can manage expenses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage expenses" ON public.expenses USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ghl_custom_field_mappings Admins can manage field mappings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage field mappings" ON public.ghl_custom_field_mappings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lead_status_history Admins can manage lead history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage lead history" ON public.lead_status_history USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: onboarding_settings Admins can manage onboarding settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage onboarding settings" ON public.onboarding_settings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: partners Admins can manage partners; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage partners" ON public.partners USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lead_pipeline_metrics Admins can manage pipeline metrics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage pipeline metrics" ON public.lead_pipeline_metrics USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales_pipeline_stages Admins can manage pipeline stages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage pipeline stages" ON public.sales_pipeline_stages USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: proposals Admins can manage proposals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage proposals" ON public.proposals USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: prospect_activities Admins can manage prospect activities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage prospect activities" ON public.prospect_activities USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: prospect_attribution Admins can manage prospect attribution; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage prospect attribution" ON public.prospect_attribution USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: prospect_available_fields Admins can manage prospect available fields; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage prospect available fields" ON public.prospect_available_fields USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: prospect_field_mappings Admins can manage prospect field mappings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage prospect field mappings" ON public.prospect_field_mappings USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rolling_snapshots Admins can manage rolling_snapshots; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage rolling_snapshots" ON public.rolling_snapshots USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales_team_members Admins can manage sales team members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage sales team members" ON public.sales_team_members USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sheet_config Admins can manage sheet config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage sheet config" ON public.sheet_config USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_stripe_subscriptions Admins can manage subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage subscriptions" ON public.client_stripe_subscriptions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: support_agents Admins can manage support agents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage support agents" ON public.support_agents USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agreement_templates Admins can manage templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage templates" ON public.agreement_templates TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: webhook_api_keys Admins can manage webhook keys; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage webhook keys" ON public.webhook_api_keys USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_dm_messages Admins can send messages in their conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can send messages in their conversations" ON public.admin_dm_messages FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.admin_dm_conversations c
  WHERE ((c.id = admin_dm_messages.conversation_id) AND ((c.participant1_id = auth.uid()) OR (c.participant2_id = auth.uid())))))));


--
-- Name: admin_dm_messages Admins can update read status on messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update read status on messages" ON public.admin_dm_messages FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.admin_dm_conversations c
  WHERE ((c.id = admin_dm_messages.conversation_id) AND ((c.participant1_id = auth.uid()) OR (c.participant2_id = auth.uid())))))));


--
-- Name: admin_dm_conversations Admins can update their own DM conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update their own DM conversations" ON public.admin_dm_conversations FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND ((participant1_id = auth.uid()) OR (participant2_id = auth.uid()))));


--
-- Name: ghl_api_logs Admins can view GHL API logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view GHL API logs" ON public.ghl_api_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: nps_responses Admins can view all NPS responses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all NPS responses" ON public.nps_responses FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: course_user_progress Admins can view all course progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all course progress" ON public.course_user_progress FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: visitor_events Admins can view all events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all events" ON public.visitor_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_payment_methods Admins can view all payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all payment methods" ON public.client_payment_methods FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lesson_progress Admins can view all progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all progress" ON public.lesson_progress FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lesson_ratings Admins can view all ratings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all ratings" ON public.lesson_ratings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: visitor_sessions Admins can view all sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view all sessions" ON public.visitor_sessions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: campaign_audit_log Admins can view campaign_audit_log; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view campaign_audit_log" ON public.campaign_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_channel_members Admins can view channel members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view channel members" ON public.admin_channel_members FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.admin_channel_members m
  WHERE ((m.channel_id = admin_channel_members.channel_id) AND (m.user_id = auth.uid()))))));


--
-- Name: admin_channels Admins can view channels they are members of; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view channels they are members of" ON public.admin_channels FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.admin_channel_members m
  WHERE ((m.channel_id = admin_channels.id) AND (m.user_id = auth.uid()))))));


--
-- Name: enhanced_conversion_logs Admins can view conversion logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view conversion logs" ON public.enhanced_conversion_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_dm_messages Admins can view messages in their conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view messages in their conversations" ON public.admin_dm_messages FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.admin_dm_conversations c
  WHERE ((c.id = admin_dm_messages.conversation_id) AND ((c.participant1_id = auth.uid()) OR (c.participant2_id = auth.uid())))))));


--
-- Name: admin_dm_conversations Admins can view their own DM conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view their own DM conversations" ON public.admin_dm_conversations FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND ((participant1_id = auth.uid()) OR (participant2_id = auth.uid()))));


--
-- Name: ticket_templates Admins have full CRUD on ticket templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full CRUD on ticket templates" ON public.ticket_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ticket_activity_log Admins have full access to ticket activity log; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access to ticket activity log" ON public.ticket_activity_log USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ticket_attachments Admins have full access to ticket attachments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins have full access to ticket attachments" ON public.ticket_attachments USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: client_payment_methods Agents can view their own payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Agents can view their own payment methods" ON public.client_payment_methods FOR SELECT USING ((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))));


--
-- Name: business_screenshots Allow all delete on screenshots; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow all delete on screenshots" ON public.business_screenshots FOR DELETE USING (true);


--
-- Name: testimonials Allow all delete on testimonials; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow all delete on testimonials" ON public.testimonials FOR DELETE USING (true);


--
-- Name: business_screenshots Allow all insert on screenshots; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow all insert on screenshots" ON public.business_screenshots FOR INSERT WITH CHECK (true);


--
-- Name: testimonials Allow all insert on testimonials; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow all insert on testimonials" ON public.testimonials FOR INSERT WITH CHECK (true);


--
-- Name: business_screenshots Allow all update on screenshots; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow all update on screenshots" ON public.business_screenshots FOR UPDATE USING (true);


--
-- Name: testimonials Allow all update on testimonials; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow all update on testimonials" ON public.testimonials FOR UPDATE USING (true);


--
-- Name: agreement_otps Allow insert for OTP requests; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow insert for OTP requests" ON public.agreement_otps FOR INSERT WITH CHECK (true);


--
-- Name: lead_attribution Allow public insert for attribution; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert for attribution" ON public.lead_attribution FOR INSERT WITH CHECK (true);


--
-- Name: visitor_events Allow public insert for events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert for events" ON public.visitor_events FOR INSERT WITH CHECK (true);


--
-- Name: prospect_activities Allow public insert for prospect activities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert for prospect activities" ON public.prospect_activities FOR INSERT WITH CHECK (true);


--
-- Name: prospect_attribution Allow public insert for prospect attribution; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert for prospect attribution" ON public.prospect_attribution FOR INSERT WITH CHECK (true);


--
-- Name: prospects Allow public insert for prospects; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert for prospects" ON public.prospects FOR INSERT WITH CHECK (true);


--
-- Name: visitor_sessions Allow public insert for tracking; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert for tracking" ON public.visitor_sessions FOR INSERT WITH CHECK (true);


--
-- Name: email_tracking_links Allow public update for click tracking; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public update for click tracking" ON public.email_tracking_links FOR UPDATE USING (true);


--
-- Name: visitor_sessions Allow public update for last_seen; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public update for last_seen" ON public.visitor_sessions FOR UPDATE USING (true);


--
-- Name: agreement_otps Allow select for OTP verification; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow select for OTP verification" ON public.agreement_otps FOR SELECT USING (true);


--
-- Name: conversions Allow service role insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow service role insert" ON public.conversions FOR INSERT WITH CHECK (true);


--
-- Name: agreement_otps Allow update for OTP verification; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow update for OTP verification" ON public.agreement_otps FOR UPDATE USING (true);


--
-- Name: lead_status_history Allow webhook insert for lead history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow webhook insert for lead history" ON public.lead_status_history FOR INSERT WITH CHECK (true);


--
-- Name: live_stats Anyone can insert stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can insert stats" ON public.live_stats FOR INSERT WITH CHECK (true);


--
-- Name: agreement_templates Anyone can read active templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can read active templates" ON public.agreement_templates FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: live_stats Anyone can update stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can update stats" ON public.live_stats FOR UPDATE USING (true);


--
-- Name: chat_settings Anyone can view chat settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view chat settings" ON public.chat_settings FOR SELECT USING (true);


--
-- Name: live_stats Anyone can view live stats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view live stats" ON public.live_stats FOR SELECT USING (true);


--
-- Name: modules Anyone can view modules of published courses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view modules of published courses" ON public.modules FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.courses
  WHERE ((courses.id = modules.course_id) AND (courses.status = 'published'::text)))));


--
-- Name: lessons Anyone can view preview lessons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view preview lessons" ON public.lessons FOR SELECT USING ((is_preview = true));


--
-- Name: courses Anyone can view published courses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT USING ((status = 'published'::text));


--
-- Name: ticket_templates Authenticated users can read active ticket templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read active ticket templates" ON public.ticket_templates FOR SELECT USING (((is_active = true) AND (auth.uid() IS NOT NULL)));


--
-- Name: client_kpi_daily Authenticated users can read client KPIs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read client KPIs" ON public.client_kpi_daily FOR SELECT USING (true);


--
-- Name: onboarding_settings Authenticated users can read onboarding settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read onboarding settings" ON public.onboarding_settings FOR SELECT TO authenticated USING (true);


--
-- Name: client_kpi_rolling Authenticated users can read rolling KPIs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read rolling KPIs" ON public.client_kpi_rolling FOR SELECT USING (true);


--
-- Name: sla_settings Authenticated users can view SLA settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view SLA settings" ON public.sla_settings FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: partners Authenticated users can view active partners; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view active partners" ON public.partners FOR SELECT USING (((is_active = true) AND (auth.uid() IS NOT NULL)));


--
-- Name: support_agents Authenticated users can view active support agents; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view active support agents" ON public.support_agents FOR SELECT USING ((is_active = true));


--
-- Name: community_comments Authenticated users can view all comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view all comments" ON public.community_comments FOR SELECT TO authenticated USING (true);


--
-- Name: community_posts Authenticated users can view all posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view all posts" ON public.community_posts FOR SELECT TO authenticated USING (true);


--
-- Name: sales_pipeline_stages Authenticated users can view pipeline stages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view pipeline stages" ON public.sales_pipeline_stages FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: sales_team_members Authenticated users can view sales team members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view sales team members" ON public.sales_team_members FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: sheet_config Authenticated users can view sheet config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view sheet config" ON public.sheet_config FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: admin_channels Channel creators can delete channels; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Channel creators can delete channels" ON public.admin_channels FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (created_by = auth.uid())));


--
-- Name: admin_channel_members Channel creators can manage members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Channel creators can manage members" ON public.admin_channel_members USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.admin_channels c
  WHERE ((c.id = admin_channel_members.channel_id) AND (c.created_by = auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.admin_channels c
  WHERE ((c.id = admin_channel_members.channel_id) AND (c.created_by = auth.uid()))))));


--
-- Name: admin_channels Channel creators can update channels; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Channel creators can update channels" ON public.admin_channels FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (created_by = auth.uid())));


--
-- Name: admin_channel_messages Channel members can send messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Channel members can send messages" ON public.admin_channel_messages FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.admin_channel_members m
  WHERE ((m.channel_id = admin_channel_messages.channel_id) AND (m.user_id = auth.uid()))))));


--
-- Name: admin_channel_messages Channel members can view messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Channel members can view messages" ON public.admin_channel_messages FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.admin_channel_members m
  WHERE ((m.channel_id = admin_channel_messages.channel_id) AND (m.user_id = auth.uid()))))));


--
-- Name: agreements Clients can create own agreements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can create own agreements" ON public.agreements FOR INSERT TO authenticated WITH CHECK ((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))));


--
-- Name: nps_responses Clients can create their own NPS responses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can create their own NPS responses" ON public.nps_responses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = nps_responses.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: support_tickets Clients can create their own tickets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can create their own tickets" ON public.support_tickets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = support_tickets.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: chat_messages Clients can insert messages in their conversation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can insert messages in their conversation" ON public.chat_messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.chat_conversations cc
     JOIN public.clients c ON ((c.id = cc.client_id)))
  WHERE ((cc.id = chat_messages.conversation_id) AND (c.user_id = auth.uid()))))));


--
-- Name: billing_records Clients can insert own billing records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can insert own billing records" ON public.billing_records FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE (((c.id)::text = billing_records.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: client_wallets Clients can insert own wallet; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can insert own wallet" ON public.client_wallets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = client_wallets.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: chat_conversations Clients can insert their own conversation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can insert their own conversation" ON public.chat_conversations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = chat_conversations.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: client_self_onboarding Clients can insert their own self-onboarding tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can insert their own self-onboarding tasks" ON public.client_self_onboarding FOR INSERT WITH CHECK ((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))));


--
-- Name: billing_records Clients can update own billing records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can update own billing records" ON public.billing_records FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE (((c.id)::text = billing_records.client_id) AND (c.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE (((c.id)::text = billing_records.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: agreements Clients can update own pending agreements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can update own pending agreements" ON public.agreements FOR UPDATE TO authenticated USING (((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))) AND (status = 'pending'::text))) WITH CHECK (((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))) AND (status = ANY (ARRAY['pending'::text, 'signed'::text]))));


--
-- Name: client_wallets Clients can update own wallet; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can update own wallet" ON public.client_wallets FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = client_wallets.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: leads Clients can update status on their own leads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can update status on their own leads" ON public.leads FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.agent_id = leads.agent_id) AND (c.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.agent_id = leads.agent_id) AND (c.user_id = auth.uid())))));


--
-- Name: onboarding_checklist Clients can update their own checklist items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can update their own checklist items" ON public.onboarding_checklist FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = onboarding_checklist.client_id) AND (c.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = onboarding_checklist.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: clients Clients can update their own record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can update their own record" ON public.clients FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND (deleted_at IS NULL))) WITH CHECK (((user_id = auth.uid()) AND (deleted_at IS NULL)));


--
-- Name: client_self_onboarding Clients can update their own self-onboarding tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can update their own self-onboarding tasks" ON public.client_self_onboarding FOR UPDATE USING ((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))));


--
-- Name: referral_commission_config Clients can view active commission config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view active commission config" ON public.referral_commission_config FOR SELECT USING ((is_active = true));


--
-- Name: chat_messages Clients can view messages in their conversation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view messages in their conversation" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.chat_conversations cc
     JOIN public.clients c ON ((c.id = cc.client_id)))
  WHERE ((cc.id = chat_messages.conversation_id) AND (c.user_id = auth.uid())))));


--
-- Name: agreements Clients can view own agreements; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view own agreements" ON public.agreements FOR SELECT TO authenticated USING ((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))));


--
-- Name: onboarding_automation_runs Clients can view own automation runs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view own automation runs" ON public.onboarding_automation_runs FOR SELECT USING ((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))));


--
-- Name: client_stripe_subscriptions Clients can view own subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view own subscriptions" ON public.client_stripe_subscriptions FOR SELECT USING ((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))));


--
-- Name: wallet_transactions Clients can view own transactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view own transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE (((c.id)::text = wallet_transactions.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: nps_responses Clients can view their own NPS responses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own NPS responses" ON public.nps_responses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = nps_responses.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: client_stripe_customers Clients can view their own Stripe info; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own Stripe info" ON public.client_stripe_customers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE (((c.id)::text = client_stripe_customers.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: ad_spend_daily Clients can view their own ad spend data; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own ad spend data" ON public.ad_spend_daily FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = ad_spend_daily.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: billing_records Clients can view their own billing records; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own billing records" ON public.billing_records FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE (((c.id)::text = billing_records.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: onboarding_checklist Clients can view their own checklist; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own checklist" ON public.onboarding_checklist FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = onboarding_checklist.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: billing_collections Clients can view their own collection status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own collection status" ON public.billing_collections FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE (((c.id)::text = billing_collections.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: chat_conversations Clients can view their own conversation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own conversation" ON public.chat_conversations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = chat_conversations.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: client_credits Clients can view their own credits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own credits" ON public.client_credits FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE (((c.id)::text = client_credits.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: lead_status_history Clients can view their own lead history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own lead history" ON public.lead_status_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.leads l
     JOIN public.clients c ON ((c.agent_id = l.agent_id)))
  WHERE ((l.id = lead_status_history.lead_id) AND (c.user_id = auth.uid())))));


--
-- Name: leads Clients can view their own leads; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own leads" ON public.leads FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.agent_id = leads.agent_id) AND (c.user_id = auth.uid())))));


--
-- Name: onboarding_tasks Clients can view their own onboarding tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own onboarding tasks" ON public.onboarding_tasks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = onboarding_tasks.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: performance_snapshots Clients can view their own performance; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own performance" ON public.performance_snapshots FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = performance_snapshots.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: clients Clients can view their own record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own record" ON public.clients FOR SELECT USING (((user_id = auth.uid()) AND (deleted_at IS NULL)));


--
-- Name: referral_codes Clients can view their own referral code; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own referral code" ON public.referral_codes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = referral_codes.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: referrals Clients can view their own referrals; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own referrals" ON public.referrals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = referrals.referrer_client_id) AND (c.user_id = auth.uid())))));


--
-- Name: referral_rewards Clients can view their own rewards; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own rewards" ON public.referral_rewards FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = referral_rewards.referrer_client_id) AND (c.user_id = auth.uid())))));


--
-- Name: client_self_onboarding Clients can view their own self-onboarding tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own self-onboarding tasks" ON public.client_self_onboarding FOR SELECT USING ((client_id IN ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid()))));


--
-- Name: support_tickets Clients can view their own tickets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own tickets" ON public.support_tickets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = support_tickets.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: client_wallets Clients can view their own wallet; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own wallet" ON public.client_wallets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE ((c.id = client_wallets.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: wallet_transactions Clients can view their own wallet transactions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Clients can view their own wallet transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.clients c
  WHERE (((c.id)::text = wallet_transactions.client_id) AND (c.user_id = auth.uid())))));


--
-- Name: lessons Enrolled users can view course lessons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Enrolled users can view course lessons" ON public.lessons FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.modules m
     JOIN public.enrollments e ON ((e.course_id = m.course_id)))
  WHERE ((m.id = lessons.module_id) AND (e.user_id = auth.uid()) AND (e.revoked_at IS NULL)))));


--
-- Name: community_comments Members can create comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can create comments" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (public.has_role(auth.uid(), 'member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


--
-- Name: community_posts Members can create posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can create posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (public.has_role(auth.uid(), 'member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


--
-- Name: referral_codes Partners can view own referral codes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Partners can view own referral codes" ON public.referral_codes FOR SELECT USING ((partner_id IN ( SELECT referral_partners.id
   FROM public.referral_partners
  WHERE (referral_partners.user_id = auth.uid()))));


--
-- Name: referrals Partners can view referrals they created; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Partners can view referrals they created" ON public.referrals FOR SELECT USING ((referrer_partner_id IN ( SELECT referral_partners.id
   FROM public.referral_partners
  WHERE (referral_partners.user_id = auth.uid()))));


--
-- Name: ghl_available_fields Service role can insert available fields; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert available fields" ON public.ghl_available_fields FOR INSERT WITH CHECK (true);


--
-- Name: ghl_api_logs Service role can insert logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert logs" ON public.ghl_api_logs FOR INSERT WITH CHECK (true);


--
-- Name: ghl_custom_field_mappings Service role can insert mappings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert mappings" ON public.ghl_custom_field_mappings FOR INSERT WITH CHECK (true);


--
-- Name: client_kpi_daily Service role can manage client KPIs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage client KPIs" ON public.client_kpi_daily USING (true);


--
-- Name: client_kpi_rolling Service role can manage rolling KPIs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage rolling KPIs" ON public.client_kpi_rolling USING (true);


--
-- Name: prospect_available_fields Service role can read prospect available fields; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can read prospect available fields" ON public.prospect_available_fields FOR SELECT USING (true);


--
-- Name: prospect_field_mappings Service role can read prospect field mappings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can read prospect field mappings" ON public.prospect_field_mappings FOR SELECT USING (true);


--
-- Name: ghl_available_fields Service role can update available fields; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can update available fields" ON public.ghl_available_fields FOR UPDATE USING (true);


--
-- Name: ghl_custom_field_mappings Service role can update mappings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can update mappings" ON public.ghl_custom_field_mappings FOR UPDATE USING (true);


--
-- Name: campaign_budget_changes Service role full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role full access" ON public.campaign_budget_changes USING (true) WITH CHECK (true);


--
-- Name: client_payment_methods Service role has full access to payment methods; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role has full access to payment methods" ON public.client_payment_methods USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: support_tickets Staff can manage all tickets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff can manage all tickets" ON public.support_tickets USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'member'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'member'::public.app_role)));


--
-- Name: campaign_audit_log System can insert campaign_audit_log; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can insert campaign_audit_log" ON public.campaign_audit_log FOR INSERT WITH CHECK (true);


--
-- Name: ticket_replies Users can create replies on their tickets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create replies on their tickets" ON public.ticket_replies FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.support_tickets t
     JOIN public.clients c ON ((c.id = t.client_id)))
  WHERE ((t.id = ticket_replies.ticket_id) AND (c.user_id = auth.uid()))))));


--
-- Name: community_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own comments" ON public.community_comments FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: community_posts Users can delete their own posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own posts" ON public.community_posts FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: ticket_attachments Users can insert attachments on their own tickets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert attachments on their own tickets" ON public.ticket_attachments FOR INSERT WITH CHECK (((uploaded_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.support_tickets t
     JOIN public.clients c ON ((c.id = t.client_id)))
  WHERE ((t.id = ticket_attachments.ticket_id) AND (c.user_id = auth.uid()))))));


--
-- Name: notification_preferences Users can insert their own notification preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: course_user_progress Users can manage their own course progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own course progress" ON public.course_user_progress USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: lesson_progress Users can manage their own progress; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own progress" ON public.lesson_progress TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: lesson_ratings Users can manage their own ratings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage their own ratings" ON public.lesson_ratings USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: community_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own comments" ON public.community_comments FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notification_preferences Users can update their own notification preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: community_posts Users can update their own posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own posts" ON public.community_posts FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: ticket_activity_log Users can view activity on their own tickets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view activity on their own tickets" ON public.ticket_activity_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.support_tickets t
     JOIN public.clients c ON ((c.id = t.client_id)))
  WHERE ((t.id = ticket_activity_log.ticket_id) AND (c.user_id = auth.uid())))));


--
-- Name: ticket_attachments Users can view attachments on their own tickets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view attachments on their own tickets" ON public.ticket_attachments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.support_tickets t
     JOIN public.clients c ON ((c.id = t.client_id)))
  WHERE ((t.id = ticket_attachments.ticket_id) AND (c.user_id = auth.uid())))));


--
-- Name: referral_partners Users can view own partner record; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own partner record" ON public.referral_partners FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ticket_replies Users can view replies on their tickets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view replies on their tickets" ON public.ticket_replies FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.support_tickets t
     JOIN public.clients c ON ((c.id = t.client_id)))
  WHERE ((t.id = ticket_replies.ticket_id) AND (c.user_id = auth.uid())))));


--
-- Name: enrollments Users can view their own enrollments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own enrollments" ON public.enrollments FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: notification_preferences Users can view their own notification preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: ad_spend_daily; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ad_spend_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_requests admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_all ON public.feature_requests TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_channel_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_channel_members ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_channel_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_channel_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_channels; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_channels ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_dm_conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_dm_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_dm_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_dm_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: agreement_otps; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.agreement_otps ENABLE ROW LEVEL SECURITY;

--
-- Name: agreement_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: agreements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

--
-- Name: bank_accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_collection_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.billing_collection_events ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_collections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.billing_collections ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_records; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_verifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.billing_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: business_screenshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.business_screenshots ENABLE ROW LEVEL SECURITY;

--
-- Name: call_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.campaign_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_budget_changes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.campaign_budget_changes ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: categorization_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: client_credits; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;

--
-- Name: client_kpi_daily; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_kpi_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: client_kpi_rolling; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_kpi_rolling ENABLE ROW LEVEL SECURITY;

--
-- Name: client_payment_methods; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: client_self_onboarding; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_self_onboarding ENABLE ROW LEVEL SECURITY;

--
-- Name: client_stripe_customers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_stripe_customers ENABLE ROW LEVEL SECURITY;

--
-- Name: client_stripe_subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_stripe_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: client_wallets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_requests clients_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clients_insert_own ON public.feature_requests FOR INSERT TO authenticated WITH CHECK ((client_id = ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: feature_requests clients_read_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clients_read_own ON public.feature_requests FOR SELECT TO authenticated USING ((client_id = ( SELECT clients.id
   FROM public.clients
  WHERE (clients.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: community_comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: community_posts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: conversions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;

--
-- Name: course_user_progress; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.course_user_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: decision_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.decision_events ENABLE ROW LEVEL SECURITY;

--
-- Name: disputes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

--
-- Name: email_tracking_links; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.email_tracking_links ENABLE ROW LEVEL SECURITY;

--
-- Name: enhanced_conversion_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.enhanced_conversion_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_categories; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: ghl_api_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ghl_api_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ghl_available_fields; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ghl_available_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: ghl_custom_field_mappings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ghl_custom_field_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: ghl_oauth_tokens; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ghl_oauth_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: internal_marketing_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.internal_marketing_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_attribution; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lead_attribution ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_delivery_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lead_delivery_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_pipeline_metrics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lead_pipeline_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_status_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_progress; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_ratings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lesson_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: lessons; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: live_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.live_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: modules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: nps_responses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_automation_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.onboarding_automation_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_checklist; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.onboarding_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: partners; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

--
-- Name: performance_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: proposals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: prospect_activities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.prospect_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: prospect_attribution; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.prospect_attribution ENABLE ROW LEVEL SECURITY;

--
-- Name: prospect_available_fields; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.prospect_available_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: prospect_field_mappings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.prospect_field_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: prospects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_codes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_commission_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.referral_commission_config ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_partners; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_rewards; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: rolling_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rolling_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_pipeline_stages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sales_pipeline_stages ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_team_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sales_team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_requests service_role_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY service_role_all ON public.feature_requests TO service_role USING (true) WITH CHECK (true);


--
-- Name: sheet_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sheet_config ENABLE ROW LEVEL SECURITY;

--
-- Name: sla_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sla_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: support_agents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.support_agents ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: system_alerts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: testimonials; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_activity_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ticket_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_attachments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_replies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: visitor_events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;

--
-- Name: visitor_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_api_keys; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.webhook_api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Admins can manage all agreements; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Admins can manage all agreements" ON storage.objects USING (((bucket_id = 'agreements'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));


--
-- Name: objects Admins can view all agreement files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Admins can view all agreement files" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'agreements'::text) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: objects Anyone can read ticket attachments; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Anyone can read ticket attachments" ON storage.objects FOR SELECT USING ((bucket_id = 'ticket-attachments'::text));


--
-- Name: objects Anyone can view chat attachments; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Anyone can view chat attachments" ON storage.objects FOR SELECT USING ((bucket_id = 'chat-attachments'::text));


--
-- Name: objects Authenticated users can delete chat attachments; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Authenticated users can delete chat attachments" ON storage.objects FOR DELETE TO authenticated USING ((bucket_id = 'chat-attachments'::text));


--
-- Name: objects Authenticated users can delete media; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Authenticated users can delete media" ON storage.objects FOR DELETE USING ((bucket_id = 'media'::text));


--
-- Name: objects Authenticated users can update chat attachments; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Authenticated users can update chat attachments" ON storage.objects FOR UPDATE TO authenticated USING ((bucket_id = 'chat-attachments'::text)) WITH CHECK ((bucket_id = 'chat-attachments'::text));


--
-- Name: objects Authenticated users can update media; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Authenticated users can update media" ON storage.objects FOR UPDATE USING ((bucket_id = 'media'::text));


--
-- Name: objects Authenticated users can upload agreements; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Authenticated users can upload agreements" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'agreements'::text) AND (auth.uid() IS NOT NULL)));


--
-- Name: objects Authenticated users can upload chat attachments; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'chat-attachments'::text));


--
-- Name: objects Authenticated users can upload media; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Authenticated users can upload media" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'media'::text));


--
-- Name: objects Authenticated users can upload ticket attachments; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Authenticated users can upload ticket attachments" ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'ticket-attachments'::text) AND (auth.uid() IS NOT NULL)));


--
-- Name: objects Authenticated users can upload to agreements; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Authenticated users can upload to agreements" ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'agreements'::text));


--
-- Name: objects Clients can view their own agreements; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Clients can view their own agreements" ON storage.objects FOR SELECT USING (((bucket_id = 'agreements'::text) AND (auth.uid() IS NOT NULL)));


--
-- Name: objects Public can view media; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Public can view media" ON storage.objects FOR SELECT USING ((bucket_id = 'media'::text));


--
-- Name: objects Users can view own agreement files; Type: POLICY; Schema: storage; Owner: supabase_storage_admin
--

CREATE POLICY "Users can view own agreement files" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'agreements'::text) AND ((storage.foldername(name))[1] IN ( SELECT (clients.id)::text AS id
   FROM public.clients
  WHERE (clients.user_id = auth.uid())))));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: supabase_admin
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime_messages_publication OWNER TO supabase_admin;

--
-- Name: supabase_realtime admin_channel_messages; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.admin_channel_messages;


--
-- Name: supabase_realtime admin_dm_messages; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.admin_dm_messages;


--
-- Name: supabase_realtime call_logs; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.call_logs;


--
-- Name: supabase_realtime chat_conversations; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.chat_conversations;


--
-- Name: supabase_realtime chat_messages; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.chat_messages;


--
-- Name: supabase_realtime conversions; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.conversions;


--
-- Name: supabase_realtime live_stats; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.live_stats;


--
-- Name: supabase_realtime onboarding_automation_runs; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.onboarding_automation_runs;


--
-- Name: supabase_realtime prospect_activities; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.prospect_activities;


--
-- Name: supabase_realtime prospects; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.prospects;


--
-- Name: supabase_realtime support_tickets; Type: PUBLICATION TABLE; Schema: public; Owner: postgres
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.support_tickets;


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: supabase_admin
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA cron; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA cron TO postgres WITH GRANT OPTION;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO readonly_agent;


--
-- Name: SCHEMA net; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA net TO supabase_functions_admin;
GRANT USAGE ON SCHEMA net TO postgres;
GRANT USAGE ON SCHEMA net TO anon;
GRANT USAGE ON SCHEMA net TO authenticated;
GRANT USAGE ON SCHEMA net TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION alter_job(job_id bigint, schedule text, command text, database text, username text, active boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.alter_job(job_id bigint, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION job_cache_invalidate(); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.job_cache_invalidate() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule(schedule text, command text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule(schedule text, command text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule(job_name text, schedule text, command text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule(job_name text, schedule text, command text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION schedule_in_database(job_name text, schedule text, command text, database text, username text, active boolean); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.schedule_in_database(job_name text, schedule text, command text, database text, username text, active boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION unschedule(job_id bigint); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.unschedule(job_id bigint) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION unschedule(job_name text); Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON FUNCTION cron.unschedule(job_name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION pg_reload_conf(); Type: ACL; Schema: pg_catalog; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pg_catalog.pg_reload_conf() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION activate_referral_on_prospect_conversion(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.activate_referral_on_prospect_conversion() TO anon;
GRANT ALL ON FUNCTION public.activate_referral_on_prospect_conversion() TO authenticated;
GRANT ALL ON FUNCTION public.activate_referral_on_prospect_conversion() TO service_role;


--
-- Name: FUNCTION auto_assign_ticket(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_assign_ticket() TO anon;
GRANT ALL ON FUNCTION public.auto_assign_ticket() TO authenticated;
GRANT ALL ON FUNCTION public.auto_assign_ticket() TO service_role;


--
-- Name: FUNCTION auto_generate_referral_code(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_generate_referral_code() TO anon;
GRANT ALL ON FUNCTION public.auto_generate_referral_code() TO authenticated;
GRANT ALL ON FUNCTION public.auto_generate_referral_code() TO service_role;


--
-- Name: FUNCTION calculate_sla_deadline(p_category text, p_priority public.ticket_priority); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_sla_deadline(p_category text, p_priority public.ticket_priority) TO anon;
GRANT ALL ON FUNCTION public.calculate_sla_deadline(p_category text, p_priority public.ticket_priority) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_sla_deadline(p_category text, p_priority public.ticket_priority) TO service_role;


--
-- Name: FUNCTION check_stage_completion_and_notify(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_stage_completion_and_notify() TO anon;
GRANT ALL ON FUNCTION public.check_stage_completion_and_notify() TO authenticated;
GRANT ALL ON FUNCTION public.check_stage_completion_and_notify() TO service_role;


--
-- Name: FUNCTION enroll_all_users_on_publish(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enroll_all_users_on_publish() TO anon;
GRANT ALL ON FUNCTION public.enroll_all_users_on_publish() TO authenticated;
GRANT ALL ON FUNCTION public.enroll_all_users_on_publish() TO service_role;


--
-- Name: FUNCTION generate_referral_code(client_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_referral_code(client_name text) TO anon;
GRANT ALL ON FUNCTION public.generate_referral_code(client_name text) TO authenticated;
GRANT ALL ON FUNCTION public.generate_referral_code(client_name text) TO service_role;


--
-- Name: FUNCTION get_or_create_conversation(p_client_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_or_create_conversation(p_client_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_or_create_conversation(p_client_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_or_create_conversation(p_client_id uuid) TO service_role;


--
-- Name: FUNCTION get_or_create_partner_referral_code(p_partner_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_or_create_partner_referral_code(p_partner_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_or_create_partner_referral_code(p_partner_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_or_create_partner_referral_code(p_partner_id uuid) TO service_role;


--
-- Name: FUNCTION get_or_create_referral_code(p_client_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_or_create_referral_code(p_client_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_or_create_referral_code(p_client_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_or_create_referral_code(p_client_id uuid) TO service_role;


--
-- Name: FUNCTION get_support_agent_for_category(p_category text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_support_agent_for_category(p_category text) TO anon;
GRANT ALL ON FUNCTION public.get_support_agent_for_category(p_category text) TO authenticated;
GRANT ALL ON FUNCTION public.get_support_agent_for_category(p_category text) TO service_role;


--
-- Name: FUNCTION get_user_role(_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_role(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_role(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_role(_user_id uuid) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION handle_user_login(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_user_login() TO anon;
GRANT ALL ON FUNCTION public.handle_user_login() TO authenticated;
GRANT ALL ON FUNCTION public.handle_user_login() TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;


--
-- Name: FUNCTION increment_pipeline_metric(p_agent_id text, p_stage text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_pipeline_metric(p_agent_id text, p_stage text) TO anon;
GRANT ALL ON FUNCTION public.increment_pipeline_metric(p_agent_id text, p_stage text) TO authenticated;
GRANT ALL ON FUNCTION public.increment_pipeline_metric(p_agent_id text, p_stage text) TO service_role;


--
-- Name: FUNCTION increment_stat(key text, amount numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_stat(key text, amount numeric) TO anon;
GRANT ALL ON FUNCTION public.increment_stat(key text, amount numeric) TO authenticated;
GRANT ALL ON FUNCTION public.increment_stat(key text, amount numeric) TO service_role;


--
-- Name: FUNCTION initialize_onboarding_checklist(p_client_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.initialize_onboarding_checklist(p_client_id uuid) TO anon;
GRANT ALL ON FUNCTION public.initialize_onboarding_checklist(p_client_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.initialize_onboarding_checklist(p_client_id uuid) TO service_role;


--
-- Name: FUNCTION is_enrolled(_user_id uuid, _course_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_enrolled(_user_id uuid, _course_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_enrolled(_user_id uuid, _course_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_enrolled(_user_id uuid, _course_id uuid) TO service_role;


--
-- Name: FUNCTION link_client_to_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.link_client_to_user() TO anon;
GRANT ALL ON FUNCTION public.link_client_to_user() TO authenticated;
GRANT ALL ON FUNCTION public.link_client_to_user() TO service_role;


--
-- Name: FUNCTION link_prospect_to_referrer(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.link_prospect_to_referrer() TO anon;
GRANT ALL ON FUNCTION public.link_prospect_to_referrer() TO authenticated;
GRANT ALL ON FUNCTION public.link_prospect_to_referrer() TO service_role;


--
-- Name: FUNCTION log_ticket_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_ticket_changes() TO anon;
GRANT ALL ON FUNCTION public.log_ticket_changes() TO authenticated;
GRANT ALL ON FUNCTION public.log_ticket_changes() TO service_role;


--
-- Name: FUNCTION mark_messages_read(p_conversation_id uuid, p_user_role text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.mark_messages_read(p_conversation_id uuid, p_user_role text) TO anon;
GRANT ALL ON FUNCTION public.mark_messages_read(p_conversation_id uuid, p_user_role text) TO authenticated;
GRANT ALL ON FUNCTION public.mark_messages_read(p_conversation_id uuid, p_user_role text) TO service_role;


--
-- Name: FUNCTION prevent_duplicate_admin_channel_message(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_duplicate_admin_channel_message() TO anon;
GRANT ALL ON FUNCTION public.prevent_duplicate_admin_channel_message() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_duplicate_admin_channel_message() TO service_role;


--
-- Name: FUNCTION prevent_duplicate_admin_dm_message(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_duplicate_admin_dm_message() TO anon;
GRANT ALL ON FUNCTION public.prevent_duplicate_admin_dm_message() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_duplicate_admin_dm_message() TO service_role;


--
-- Name: FUNCTION prevent_duplicate_chat_message(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prevent_duplicate_chat_message() TO anon;
GRANT ALL ON FUNCTION public.prevent_duplicate_chat_message() TO authenticated;
GRANT ALL ON FUNCTION public.prevent_duplicate_chat_message() TO service_role;


--
-- Name: FUNCTION run_readonly_query(query_text text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.run_readonly_query(query_text text) TO anon;
GRANT ALL ON FUNCTION public.run_readonly_query(query_text text) TO authenticated;
GRANT ALL ON FUNCTION public.run_readonly_query(query_text text) TO service_role;


--
-- Name: FUNCTION send_welcome_chat_message(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.send_welcome_chat_message() TO anon;
GRANT ALL ON FUNCTION public.send_welcome_chat_message() TO authenticated;
GRANT ALL ON FUNCTION public.send_welcome_chat_message() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION track_lead_stage_history(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.track_lead_stage_history() TO anon;
GRANT ALL ON FUNCTION public.track_lead_stage_history() TO authenticated;
GRANT ALL ON FUNCTION public.track_lead_stage_history() TO service_role;


--
-- Name: FUNCTION update_admin_dm_on_message(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_admin_dm_on_message() TO anon;
GRANT ALL ON FUNCTION public.update_admin_dm_on_message() TO authenticated;
GRANT ALL ON FUNCTION public.update_admin_dm_on_message() TO service_role;


--
-- Name: FUNCTION update_campaigns_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_campaigns_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_campaigns_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_campaigns_updated_at() TO service_role;


--
-- Name: FUNCTION update_client_payment_methods_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_client_payment_methods_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_client_payment_methods_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_client_payment_methods_updated_at() TO service_role;


--
-- Name: FUNCTION update_conversation_on_message(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_conversation_on_message() TO anon;
GRANT ALL ON FUNCTION public.update_conversation_on_message() TO authenticated;
GRANT ALL ON FUNCTION public.update_conversation_on_message() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.custom_oauth_providers TO postgres;
GRANT ALL ON TABLE auth.custom_oauth_providers TO dashboard_user;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE job; Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT SELECT ON TABLE cron.job TO postgres WITH GRANT OPTION;


--
-- Name: TABLE job_run_details; Type: ACL; Schema: cron; Owner: supabase_admin
--

GRANT ALL ON TABLE cron.job_run_details TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE ad_spend_daily; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ad_spend_daily TO anon;
GRANT ALL ON TABLE public.ad_spend_daily TO authenticated;
GRANT ALL ON TABLE public.ad_spend_daily TO service_role;
GRANT SELECT ON TABLE public.ad_spend_daily TO readonly_agent;


--
-- Name: TABLE admin_channel_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_channel_members TO anon;
GRANT ALL ON TABLE public.admin_channel_members TO authenticated;
GRANT ALL ON TABLE public.admin_channel_members TO service_role;
GRANT SELECT ON TABLE public.admin_channel_members TO readonly_agent;


--
-- Name: TABLE admin_channel_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_channel_messages TO anon;
GRANT ALL ON TABLE public.admin_channel_messages TO authenticated;
GRANT ALL ON TABLE public.admin_channel_messages TO service_role;
GRANT SELECT ON TABLE public.admin_channel_messages TO readonly_agent;


--
-- Name: TABLE admin_channels; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_channels TO anon;
GRANT ALL ON TABLE public.admin_channels TO authenticated;
GRANT ALL ON TABLE public.admin_channels TO service_role;
GRANT SELECT ON TABLE public.admin_channels TO readonly_agent;


--
-- Name: TABLE admin_dm_conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_dm_conversations TO anon;
GRANT ALL ON TABLE public.admin_dm_conversations TO authenticated;
GRANT ALL ON TABLE public.admin_dm_conversations TO service_role;
GRANT SELECT ON TABLE public.admin_dm_conversations TO readonly_agent;


--
-- Name: TABLE admin_dm_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_dm_messages TO anon;
GRANT ALL ON TABLE public.admin_dm_messages TO authenticated;
GRANT ALL ON TABLE public.admin_dm_messages TO service_role;
GRANT SELECT ON TABLE public.admin_dm_messages TO readonly_agent;


--
-- Name: TABLE agreement_otps; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.agreement_otps TO anon;
GRANT ALL ON TABLE public.agreement_otps TO authenticated;
GRANT ALL ON TABLE public.agreement_otps TO service_role;
GRANT SELECT ON TABLE public.agreement_otps TO readonly_agent;


--
-- Name: TABLE agreement_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.agreement_templates TO anon;
GRANT ALL ON TABLE public.agreement_templates TO authenticated;
GRANT ALL ON TABLE public.agreement_templates TO service_role;
GRANT SELECT ON TABLE public.agreement_templates TO readonly_agent;


--
-- Name: TABLE agreements; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.agreements TO anon;
GRANT ALL ON TABLE public.agreements TO authenticated;
GRANT ALL ON TABLE public.agreements TO service_role;
GRANT SELECT ON TABLE public.agreements TO readonly_agent;


--
-- Name: TABLE bank_accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.bank_accounts TO anon;
GRANT ALL ON TABLE public.bank_accounts TO authenticated;
GRANT ALL ON TABLE public.bank_accounts TO service_role;
GRANT SELECT ON TABLE public.bank_accounts TO readonly_agent;


--
-- Name: TABLE billing_collection_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.billing_collection_events TO anon;
GRANT ALL ON TABLE public.billing_collection_events TO authenticated;
GRANT ALL ON TABLE public.billing_collection_events TO service_role;
GRANT SELECT ON TABLE public.billing_collection_events TO readonly_agent;


--
-- Name: TABLE billing_collections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.billing_collections TO anon;
GRANT ALL ON TABLE public.billing_collections TO authenticated;
GRANT ALL ON TABLE public.billing_collections TO service_role;
GRANT SELECT ON TABLE public.billing_collections TO readonly_agent;


--
-- Name: TABLE billing_records; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.billing_records TO anon;
GRANT ALL ON TABLE public.billing_records TO authenticated;
GRANT ALL ON TABLE public.billing_records TO service_role;
GRANT SELECT ON TABLE public.billing_records TO readonly_agent;


--
-- Name: TABLE billing_verifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.billing_verifications TO anon;
GRANT ALL ON TABLE public.billing_verifications TO authenticated;
GRANT ALL ON TABLE public.billing_verifications TO service_role;
GRANT SELECT ON TABLE public.billing_verifications TO readonly_agent;


--
-- Name: TABLE business_screenshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.business_screenshots TO anon;
GRANT ALL ON TABLE public.business_screenshots TO authenticated;
GRANT ALL ON TABLE public.business_screenshots TO service_role;
GRANT SELECT ON TABLE public.business_screenshots TO readonly_agent;


--
-- Name: TABLE call_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.call_logs TO anon;
GRANT ALL ON TABLE public.call_logs TO authenticated;
GRANT ALL ON TABLE public.call_logs TO service_role;
GRANT SELECT ON TABLE public.call_logs TO readonly_agent;


--
-- Name: TABLE campaign_audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.campaign_audit_log TO anon;
GRANT ALL ON TABLE public.campaign_audit_log TO authenticated;
GRANT ALL ON TABLE public.campaign_audit_log TO service_role;
GRANT SELECT ON TABLE public.campaign_audit_log TO readonly_agent;


--
-- Name: TABLE campaign_budget_changes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.campaign_budget_changes TO anon;
GRANT ALL ON TABLE public.campaign_budget_changes TO authenticated;
GRANT ALL ON TABLE public.campaign_budget_changes TO service_role;
GRANT SELECT ON TABLE public.campaign_budget_changes TO readonly_agent;


--
-- Name: TABLE campaign_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.campaign_settings TO anon;
GRANT ALL ON TABLE public.campaign_settings TO authenticated;
GRANT ALL ON TABLE public.campaign_settings TO service_role;
GRANT SELECT ON TABLE public.campaign_settings TO readonly_agent;


--
-- Name: TABLE campaigns; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.campaigns TO anon;
GRANT ALL ON TABLE public.campaigns TO authenticated;
GRANT ALL ON TABLE public.campaigns TO service_role;
GRANT SELECT ON TABLE public.campaigns TO readonly_agent;


--
-- Name: TABLE categorization_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categorization_rules TO anon;
GRANT ALL ON TABLE public.categorization_rules TO authenticated;
GRANT ALL ON TABLE public.categorization_rules TO service_role;
GRANT SELECT ON TABLE public.categorization_rules TO readonly_agent;


--
-- Name: TABLE chat_conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_conversations TO anon;
GRANT ALL ON TABLE public.chat_conversations TO authenticated;
GRANT ALL ON TABLE public.chat_conversations TO service_role;
GRANT SELECT ON TABLE public.chat_conversations TO readonly_agent;


--
-- Name: TABLE chat_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_messages TO anon;
GRANT ALL ON TABLE public.chat_messages TO authenticated;
GRANT ALL ON TABLE public.chat_messages TO service_role;
GRANT SELECT ON TABLE public.chat_messages TO readonly_agent;


--
-- Name: TABLE chat_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_settings TO anon;
GRANT ALL ON TABLE public.chat_settings TO authenticated;
GRANT ALL ON TABLE public.chat_settings TO service_role;
GRANT SELECT ON TABLE public.chat_settings TO readonly_agent;


--
-- Name: TABLE client_credits; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_credits TO anon;
GRANT ALL ON TABLE public.client_credits TO authenticated;
GRANT ALL ON TABLE public.client_credits TO service_role;
GRANT SELECT ON TABLE public.client_credits TO readonly_agent;


--
-- Name: TABLE client_kpi_daily; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_kpi_daily TO anon;
GRANT ALL ON TABLE public.client_kpi_daily TO authenticated;
GRANT ALL ON TABLE public.client_kpi_daily TO service_role;
GRANT SELECT ON TABLE public.client_kpi_daily TO readonly_agent;


--
-- Name: TABLE client_kpi_rolling; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_kpi_rolling TO anon;
GRANT ALL ON TABLE public.client_kpi_rolling TO authenticated;
GRANT ALL ON TABLE public.client_kpi_rolling TO service_role;
GRANT SELECT ON TABLE public.client_kpi_rolling TO readonly_agent;


--
-- Name: TABLE client_payment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_payment_methods TO anon;
GRANT ALL ON TABLE public.client_payment_methods TO authenticated;
GRANT ALL ON TABLE public.client_payment_methods TO service_role;
GRANT SELECT ON TABLE public.client_payment_methods TO readonly_agent;


--
-- Name: TABLE client_self_onboarding; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_self_onboarding TO anon;
GRANT ALL ON TABLE public.client_self_onboarding TO authenticated;
GRANT ALL ON TABLE public.client_self_onboarding TO service_role;
GRANT SELECT ON TABLE public.client_self_onboarding TO readonly_agent;


--
-- Name: TABLE client_stripe_customers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_stripe_customers TO anon;
GRANT ALL ON TABLE public.client_stripe_customers TO authenticated;
GRANT ALL ON TABLE public.client_stripe_customers TO service_role;
GRANT SELECT ON TABLE public.client_stripe_customers TO readonly_agent;


--
-- Name: TABLE client_stripe_subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_stripe_subscriptions TO anon;
GRANT ALL ON TABLE public.client_stripe_subscriptions TO authenticated;
GRANT ALL ON TABLE public.client_stripe_subscriptions TO service_role;
GRANT SELECT ON TABLE public.client_stripe_subscriptions TO readonly_agent;


--
-- Name: TABLE client_wallets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_wallets TO anon;
GRANT ALL ON TABLE public.client_wallets TO authenticated;
GRANT ALL ON TABLE public.client_wallets TO service_role;
GRANT SELECT ON TABLE public.client_wallets TO readonly_agent;


--
-- Name: TABLE clients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clients TO anon;
GRANT ALL ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.clients TO service_role;
GRANT SELECT ON TABLE public.clients TO readonly_agent;


--
-- Name: TABLE community_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.community_comments TO anon;
GRANT ALL ON TABLE public.community_comments TO authenticated;
GRANT ALL ON TABLE public.community_comments TO service_role;
GRANT SELECT ON TABLE public.community_comments TO readonly_agent;


--
-- Name: TABLE community_posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.community_posts TO anon;
GRANT ALL ON TABLE public.community_posts TO authenticated;
GRANT ALL ON TABLE public.community_posts TO service_role;
GRANT SELECT ON TABLE public.community_posts TO readonly_agent;


--
-- Name: TABLE conversions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversions TO anon;
GRANT ALL ON TABLE public.conversions TO authenticated;
GRANT ALL ON TABLE public.conversions TO service_role;
GRANT SELECT ON TABLE public.conversions TO readonly_agent;


--
-- Name: TABLE course_user_progress; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.course_user_progress TO anon;
GRANT ALL ON TABLE public.course_user_progress TO authenticated;
GRANT ALL ON TABLE public.course_user_progress TO service_role;
GRANT SELECT ON TABLE public.course_user_progress TO readonly_agent;


--
-- Name: TABLE courses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.courses TO anon;
GRANT ALL ON TABLE public.courses TO authenticated;
GRANT ALL ON TABLE public.courses TO service_role;
GRANT SELECT ON TABLE public.courses TO readonly_agent;


--
-- Name: TABLE decision_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.decision_events TO anon;
GRANT ALL ON TABLE public.decision_events TO authenticated;
GRANT ALL ON TABLE public.decision_events TO service_role;
GRANT SELECT ON TABLE public.decision_events TO readonly_agent;


--
-- Name: TABLE disputes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.disputes TO anon;
GRANT ALL ON TABLE public.disputes TO authenticated;
GRANT ALL ON TABLE public.disputes TO service_role;
GRANT SELECT ON TABLE public.disputes TO readonly_agent;


--
-- Name: TABLE email_tracking_links; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.email_tracking_links TO anon;
GRANT ALL ON TABLE public.email_tracking_links TO authenticated;
GRANT ALL ON TABLE public.email_tracking_links TO service_role;
GRANT SELECT ON TABLE public.email_tracking_links TO readonly_agent;


--
-- Name: TABLE enhanced_conversion_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.enhanced_conversion_logs TO anon;
GRANT ALL ON TABLE public.enhanced_conversion_logs TO authenticated;
GRANT ALL ON TABLE public.enhanced_conversion_logs TO service_role;
GRANT SELECT ON TABLE public.enhanced_conversion_logs TO readonly_agent;


--
-- Name: TABLE enrollments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.enrollments TO anon;
GRANT ALL ON TABLE public.enrollments TO authenticated;
GRANT ALL ON TABLE public.enrollments TO service_role;
GRANT SELECT ON TABLE public.enrollments TO readonly_agent;


--
-- Name: TABLE expense_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.expense_categories TO anon;
GRANT ALL ON TABLE public.expense_categories TO authenticated;
GRANT ALL ON TABLE public.expense_categories TO service_role;
GRANT SELECT ON TABLE public.expense_categories TO readonly_agent;


--
-- Name: TABLE expenses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.expenses TO anon;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.expenses TO service_role;
GRANT SELECT ON TABLE public.expenses TO readonly_agent;


--
-- Name: TABLE feature_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.feature_requests TO anon;
GRANT ALL ON TABLE public.feature_requests TO authenticated;
GRANT ALL ON TABLE public.feature_requests TO service_role;
GRANT SELECT ON TABLE public.feature_requests TO readonly_agent;


--
-- Name: TABLE ghl_api_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ghl_api_logs TO anon;
GRANT ALL ON TABLE public.ghl_api_logs TO authenticated;
GRANT ALL ON TABLE public.ghl_api_logs TO service_role;
GRANT SELECT ON TABLE public.ghl_api_logs TO readonly_agent;


--
-- Name: TABLE ghl_available_fields; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ghl_available_fields TO anon;
GRANT ALL ON TABLE public.ghl_available_fields TO authenticated;
GRANT ALL ON TABLE public.ghl_available_fields TO service_role;
GRANT SELECT ON TABLE public.ghl_available_fields TO readonly_agent;


--
-- Name: TABLE ghl_custom_field_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ghl_custom_field_mappings TO anon;
GRANT ALL ON TABLE public.ghl_custom_field_mappings TO authenticated;
GRANT ALL ON TABLE public.ghl_custom_field_mappings TO service_role;
GRANT SELECT ON TABLE public.ghl_custom_field_mappings TO readonly_agent;


--
-- Name: TABLE ghl_oauth_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ghl_oauth_tokens TO anon;
GRANT ALL ON TABLE public.ghl_oauth_tokens TO authenticated;
GRANT ALL ON TABLE public.ghl_oauth_tokens TO service_role;
GRANT SELECT ON TABLE public.ghl_oauth_tokens TO readonly_agent;


--
-- Name: TABLE internal_marketing_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.internal_marketing_settings TO anon;
GRANT ALL ON TABLE public.internal_marketing_settings TO authenticated;
GRANT ALL ON TABLE public.internal_marketing_settings TO service_role;
GRANT SELECT ON TABLE public.internal_marketing_settings TO readonly_agent;


--
-- Name: TABLE lead_attribution; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lead_attribution TO anon;
GRANT ALL ON TABLE public.lead_attribution TO authenticated;
GRANT ALL ON TABLE public.lead_attribution TO service_role;
GRANT SELECT ON TABLE public.lead_attribution TO readonly_agent;


--
-- Name: TABLE lead_delivery_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lead_delivery_logs TO anon;
GRANT ALL ON TABLE public.lead_delivery_logs TO authenticated;
GRANT ALL ON TABLE public.lead_delivery_logs TO service_role;
GRANT SELECT ON TABLE public.lead_delivery_logs TO readonly_agent;


--
-- Name: TABLE lead_pipeline_metrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lead_pipeline_metrics TO anon;
GRANT ALL ON TABLE public.lead_pipeline_metrics TO authenticated;
GRANT ALL ON TABLE public.lead_pipeline_metrics TO service_role;
GRANT SELECT ON TABLE public.lead_pipeline_metrics TO readonly_agent;


--
-- Name: TABLE lead_status_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lead_status_history TO anon;
GRANT ALL ON TABLE public.lead_status_history TO authenticated;
GRANT ALL ON TABLE public.lead_status_history TO service_role;
GRANT SELECT ON TABLE public.lead_status_history TO readonly_agent;


--
-- Name: TABLE leads; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.leads TO anon;
GRANT ALL ON TABLE public.leads TO authenticated;
GRANT ALL ON TABLE public.leads TO service_role;
GRANT SELECT ON TABLE public.leads TO readonly_agent;


--
-- Name: TABLE lesson_progress; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lesson_progress TO anon;
GRANT ALL ON TABLE public.lesson_progress TO authenticated;
GRANT ALL ON TABLE public.lesson_progress TO service_role;
GRANT SELECT ON TABLE public.lesson_progress TO readonly_agent;


--
-- Name: TABLE lesson_ratings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lesson_ratings TO anon;
GRANT ALL ON TABLE public.lesson_ratings TO authenticated;
GRANT ALL ON TABLE public.lesson_ratings TO service_role;
GRANT SELECT ON TABLE public.lesson_ratings TO readonly_agent;


--
-- Name: TABLE lessons; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.lessons TO anon;
GRANT ALL ON TABLE public.lessons TO authenticated;
GRANT ALL ON TABLE public.lessons TO service_role;
GRANT SELECT ON TABLE public.lessons TO readonly_agent;


--
-- Name: TABLE live_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.live_stats TO anon;
GRANT ALL ON TABLE public.live_stats TO authenticated;
GRANT ALL ON TABLE public.live_stats TO service_role;
GRANT SELECT ON TABLE public.live_stats TO readonly_agent;


--
-- Name: TABLE mcp_audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.mcp_audit_log TO anon;
GRANT ALL ON TABLE public.mcp_audit_log TO authenticated;
GRANT ALL ON TABLE public.mcp_audit_log TO service_role;
GRANT SELECT ON TABLE public.mcp_audit_log TO readonly_agent;


--
-- Name: TABLE modules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.modules TO anon;
GRANT ALL ON TABLE public.modules TO authenticated;
GRANT ALL ON TABLE public.modules TO service_role;
GRANT SELECT ON TABLE public.modules TO readonly_agent;


--
-- Name: TABLE notification_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notification_preferences TO anon;
GRANT ALL ON TABLE public.notification_preferences TO authenticated;
GRANT ALL ON TABLE public.notification_preferences TO service_role;
GRANT SELECT ON TABLE public.notification_preferences TO readonly_agent;


--
-- Name: TABLE nps_responses; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.nps_responses TO anon;
GRANT ALL ON TABLE public.nps_responses TO authenticated;
GRANT ALL ON TABLE public.nps_responses TO service_role;
GRANT SELECT ON TABLE public.nps_responses TO readonly_agent;


--
-- Name: TABLE onboarding_automation_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_automation_runs TO anon;
GRANT ALL ON TABLE public.onboarding_automation_runs TO authenticated;
GRANT ALL ON TABLE public.onboarding_automation_runs TO service_role;
GRANT SELECT ON TABLE public.onboarding_automation_runs TO readonly_agent;


--
-- Name: TABLE onboarding_checklist; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_checklist TO anon;
GRANT ALL ON TABLE public.onboarding_checklist TO authenticated;
GRANT ALL ON TABLE public.onboarding_checklist TO service_role;
GRANT SELECT ON TABLE public.onboarding_checklist TO readonly_agent;


--
-- Name: TABLE onboarding_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_settings TO anon;
GRANT ALL ON TABLE public.onboarding_settings TO authenticated;
GRANT ALL ON TABLE public.onboarding_settings TO service_role;
GRANT SELECT ON TABLE public.onboarding_settings TO readonly_agent;


--
-- Name: TABLE onboarding_tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.onboarding_tasks TO anon;
GRANT ALL ON TABLE public.onboarding_tasks TO authenticated;
GRANT ALL ON TABLE public.onboarding_tasks TO service_role;
GRANT SELECT ON TABLE public.onboarding_tasks TO readonly_agent;


--
-- Name: TABLE partners; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.partners TO anon;
GRANT ALL ON TABLE public.partners TO authenticated;
GRANT ALL ON TABLE public.partners TO service_role;
GRANT SELECT ON TABLE public.partners TO readonly_agent;


--
-- Name: TABLE performance_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.performance_snapshots TO anon;
GRANT ALL ON TABLE public.performance_snapshots TO authenticated;
GRANT ALL ON TABLE public.performance_snapshots TO service_role;
GRANT SELECT ON TABLE public.performance_snapshots TO readonly_agent;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO readonly_agent;


--
-- Name: TABLE proposals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.proposals TO anon;
GRANT ALL ON TABLE public.proposals TO authenticated;
GRANT ALL ON TABLE public.proposals TO service_role;
GRANT SELECT ON TABLE public.proposals TO readonly_agent;


--
-- Name: TABLE prospect_activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.prospect_activities TO anon;
GRANT ALL ON TABLE public.prospect_activities TO authenticated;
GRANT ALL ON TABLE public.prospect_activities TO service_role;
GRANT SELECT ON TABLE public.prospect_activities TO readonly_agent;


--
-- Name: TABLE prospect_attribution; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.prospect_attribution TO anon;
GRANT ALL ON TABLE public.prospect_attribution TO authenticated;
GRANT ALL ON TABLE public.prospect_attribution TO service_role;
GRANT SELECT ON TABLE public.prospect_attribution TO readonly_agent;


--
-- Name: TABLE prospect_available_fields; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.prospect_available_fields TO anon;
GRANT ALL ON TABLE public.prospect_available_fields TO authenticated;
GRANT ALL ON TABLE public.prospect_available_fields TO service_role;
GRANT SELECT ON TABLE public.prospect_available_fields TO readonly_agent;


--
-- Name: TABLE prospect_field_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.prospect_field_mappings TO anon;
GRANT ALL ON TABLE public.prospect_field_mappings TO authenticated;
GRANT ALL ON TABLE public.prospect_field_mappings TO service_role;
GRANT SELECT ON TABLE public.prospect_field_mappings TO readonly_agent;


--
-- Name: TABLE prospects; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.prospects TO anon;
GRANT ALL ON TABLE public.prospects TO authenticated;
GRANT ALL ON TABLE public.prospects TO service_role;
GRANT SELECT ON TABLE public.prospects TO readonly_agent;


--
-- Name: TABLE referral_codes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.referral_codes TO anon;
GRANT ALL ON TABLE public.referral_codes TO authenticated;
GRANT ALL ON TABLE public.referral_codes TO service_role;
GRANT SELECT ON TABLE public.referral_codes TO readonly_agent;


--
-- Name: TABLE referral_commission_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.referral_commission_config TO anon;
GRANT ALL ON TABLE public.referral_commission_config TO authenticated;
GRANT ALL ON TABLE public.referral_commission_config TO service_role;
GRANT SELECT ON TABLE public.referral_commission_config TO readonly_agent;


--
-- Name: TABLE referral_partners; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.referral_partners TO anon;
GRANT ALL ON TABLE public.referral_partners TO authenticated;
GRANT ALL ON TABLE public.referral_partners TO service_role;
GRANT SELECT ON TABLE public.referral_partners TO readonly_agent;


--
-- Name: TABLE referral_rewards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.referral_rewards TO anon;
GRANT ALL ON TABLE public.referral_rewards TO authenticated;
GRANT ALL ON TABLE public.referral_rewards TO service_role;
GRANT SELECT ON TABLE public.referral_rewards TO readonly_agent;


--
-- Name: TABLE referrals; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.referrals TO anon;
GRANT ALL ON TABLE public.referrals TO authenticated;
GRANT ALL ON TABLE public.referrals TO service_role;
GRANT SELECT ON TABLE public.referrals TO readonly_agent;


--
-- Name: TABLE rolling_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rolling_snapshots TO anon;
GRANT ALL ON TABLE public.rolling_snapshots TO authenticated;
GRANT ALL ON TABLE public.rolling_snapshots TO service_role;
GRANT SELECT ON TABLE public.rolling_snapshots TO readonly_agent;


--
-- Name: TABLE sales_pipeline_stages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_pipeline_stages TO anon;
GRANT ALL ON TABLE public.sales_pipeline_stages TO authenticated;
GRANT ALL ON TABLE public.sales_pipeline_stages TO service_role;
GRANT SELECT ON TABLE public.sales_pipeline_stages TO readonly_agent;


--
-- Name: TABLE sales_team_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sales_team_members TO anon;
GRANT ALL ON TABLE public.sales_team_members TO authenticated;
GRANT ALL ON TABLE public.sales_team_members TO service_role;
GRANT SELECT ON TABLE public.sales_team_members TO readonly_agent;


--
-- Name: TABLE sheet_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sheet_config TO anon;
GRANT ALL ON TABLE public.sheet_config TO authenticated;
GRANT ALL ON TABLE public.sheet_config TO service_role;
GRANT SELECT ON TABLE public.sheet_config TO readonly_agent;


--
-- Name: TABLE sla_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sla_settings TO anon;
GRANT ALL ON TABLE public.sla_settings TO authenticated;
GRANT ALL ON TABLE public.sla_settings TO service_role;
GRANT SELECT ON TABLE public.sla_settings TO readonly_agent;


--
-- Name: TABLE support_agents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.support_agents TO anon;
GRANT ALL ON TABLE public.support_agents TO authenticated;
GRANT ALL ON TABLE public.support_agents TO service_role;
GRANT SELECT ON TABLE public.support_agents TO readonly_agent;


--
-- Name: TABLE support_tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.support_tickets TO anon;
GRANT ALL ON TABLE public.support_tickets TO authenticated;
GRANT ALL ON TABLE public.support_tickets TO service_role;
GRANT SELECT ON TABLE public.support_tickets TO readonly_agent;


--
-- Name: SEQUENCE support_tickets_ticket_number_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.support_tickets_ticket_number_seq TO anon;
GRANT ALL ON SEQUENCE public.support_tickets_ticket_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.support_tickets_ticket_number_seq TO service_role;


--
-- Name: TABLE system_alerts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_alerts TO anon;
GRANT ALL ON TABLE public.system_alerts TO authenticated;
GRANT ALL ON TABLE public.system_alerts TO service_role;
GRANT SELECT ON TABLE public.system_alerts TO readonly_agent;


--
-- Name: TABLE testimonials; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.testimonials TO anon;
GRANT ALL ON TABLE public.testimonials TO authenticated;
GRANT ALL ON TABLE public.testimonials TO service_role;
GRANT SELECT ON TABLE public.testimonials TO readonly_agent;


--
-- Name: TABLE ticket_activity_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_activity_log TO anon;
GRANT ALL ON TABLE public.ticket_activity_log TO authenticated;
GRANT ALL ON TABLE public.ticket_activity_log TO service_role;
GRANT SELECT ON TABLE public.ticket_activity_log TO readonly_agent;


--
-- Name: TABLE ticket_attachments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_attachments TO anon;
GRANT ALL ON TABLE public.ticket_attachments TO authenticated;
GRANT ALL ON TABLE public.ticket_attachments TO service_role;
GRANT SELECT ON TABLE public.ticket_attachments TO readonly_agent;


--
-- Name: TABLE ticket_replies; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_replies TO anon;
GRANT ALL ON TABLE public.ticket_replies TO authenticated;
GRANT ALL ON TABLE public.ticket_replies TO service_role;
GRANT SELECT ON TABLE public.ticket_replies TO readonly_agent;


--
-- Name: TABLE ticket_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_templates TO anon;
GRANT ALL ON TABLE public.ticket_templates TO authenticated;
GRANT ALL ON TABLE public.ticket_templates TO service_role;
GRANT SELECT ON TABLE public.ticket_templates TO readonly_agent;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT ON TABLE public.user_roles TO readonly_agent;


--
-- Name: TABLE visitor_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.visitor_events TO anon;
GRANT ALL ON TABLE public.visitor_events TO authenticated;
GRANT ALL ON TABLE public.visitor_events TO service_role;
GRANT SELECT ON TABLE public.visitor_events TO readonly_agent;


--
-- Name: TABLE visitor_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.visitor_sessions TO anon;
GRANT ALL ON TABLE public.visitor_sessions TO authenticated;
GRANT ALL ON TABLE public.visitor_sessions TO service_role;
GRANT SELECT ON TABLE public.visitor_sessions TO readonly_agent;


--
-- Name: TABLE wallet_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.wallet_transactions TO anon;
GRANT ALL ON TABLE public.wallet_transactions TO authenticated;
GRANT ALL ON TABLE public.wallet_transactions TO service_role;
GRANT SELECT ON TABLE public.wallet_transactions TO readonly_agent;


--
-- Name: TABLE webhook_api_keys; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.webhook_api_keys TO anon;
GRANT ALL ON TABLE public.webhook_api_keys TO authenticated;
GRANT ALL ON TABLE public.webhook_api_keys TO service_role;
GRANT SELECT ON TABLE public.webhook_api_keys TO readonly_agent;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE messages_2026_03_10; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_10 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_10 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_11; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_11 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_11 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_12; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_12 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_12 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_13; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_13 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_13 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_14; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_14 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_14 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_15; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_15 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_15 TO dashboard_user;


--
-- Name: TABLE messages_2026_03_16; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_16 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_16 TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: cron; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA cron GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO readonly_agent;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict Y0blzfj16VdypVpVFDP5q9FeDjEfgn9bP1ne7NnH9koU3ehZaDMRedMKbtPok4F

