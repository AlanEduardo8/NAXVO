-- ============================================================================
-- NAXVO · Reparación de compatibilidad final
-- Ejecutar DESPUÉS de 00_FULL_SETUP.sql y 02_ULTIMAS_MEJORAS_NAXVO.sql.
--
-- Objetivos:
-- 1) Mantener compatibles administradores creados antes de estado_cuenta.
-- 2) Restaurar EXECUTE únicamente a los RPC que consume NAXVO.
-- 3) Corregir instalaciones donde un hardening previo dejó RPC sin permisos.
-- 4) Si existe naxvo_me(), conservarla y volver a exponerla a authenticated.
-- ============================================================================

begin;

-- Administradores históricos: si el campo quedó NULL/vacío, se considera activo.
update public.usuarios
set estado_cuenta = 'activo'
where tipo = 'admin'
  and (estado_cuenta is null or btrim(estado_cuenta) = '');

-- Helper compatible con perfiles antiguos, sin relajar cuentas suspendidas.
create or replace function public.naxvo_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.usuarios
    where auth_user_id = auth.uid()
      and tipo = 'admin'
      and coalesce(nullif(btrim(estado_cuenta), ''), 'activo') = 'activo'
  )
$$;

-- Acceso a las vistas que usa el panel administrativo.
grant usage on schema public to authenticated;
grant select on public.naxvo_admin_users,
                public.naxvo_admin_requests,
                public.naxvo_admin_payments,
                public.naxvo_admin_reviews,
                public.naxvo_admin_reports
  to authenticated;

-- No hacemos GRANT EXECUTE a todas las funciones del esquema. Solo restauramos
-- las funciones de aplicación conocidas que existan en esta instalación.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'naxvo_current_profile_id',
        'naxvo_is_admin',
        'naxvo_home_stats',
        'naxvo_me',
        'naxvo_create_request',
        'naxvo_get_opportunities',
        'naxvo_accept_request',
        'naxvo_decline_request',
        'naxvo_submit_quote',
        'naxvo_respond_quote',
        'naxvo_start_service',
        'naxvo_request_completion',
        'naxvo_request_correction',
        'naxvo_confirm_completion',
        'naxvo_send_message',
        'naxvo_submit_prof_verification',
        'naxvo_submit_prof_verification_scan',
        'naxvo_switch_role',
        'naxvo_payment_status',
        'naxvo_cash_declare',
        'naxvo_cash_confirm',
        'naxvo_admin_dashboard',
        'naxvo_admin_set_user_status',
        'naxvo_admin_review_professional',
        'naxvo_review_client_verification',
        'naxvo_admin_cancel_request',
        'naxvo_admin_moderate_review',
        'naxvo_admin_resolve_report',
        'naxvo_system_checks'
      ])
  loop
    execute format('grant execute on function %s to authenticated', f.signature);
  end loop;
end
$$;

-- Los tres helpers públicos necesarios antes/durante autenticación siguen
-- disponibles para anon si existen. naxvo_me NO se expone a anon.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array['naxvo_current_profile_id','naxvo_is_admin','naxvo_home_stats'])
  loop
    execute format('grant execute on function %s to anon', f.signature);
  end loop;
end
$$;

commit;

-- --------------------------------------------------------------------------
-- Comprobaciones manuales útiles (no modifican datos):
-- --------------------------------------------------------------------------
-- select id,email,tipo,estado_cuenta,auth_user_id
-- from public.usuarios
-- where tipo='admin';
--
-- select has_function_privilege('authenticated','public.naxvo_admin_dashboard()','EXECUTE')
--        as admin_dashboard_execute;
--
-- select p.proname,
--        has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute
-- from pg_proc p join pg_namespace n on n.oid=p.pronamespace
-- where n.nspname='public' and p.proname in ('naxvo_me','naxvo_admin_dashboard','naxvo_create_request');
