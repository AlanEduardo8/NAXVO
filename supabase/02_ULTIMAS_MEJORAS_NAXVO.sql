-- ============================================================================
-- NAXVO · Últimas mejoras funcionales
-- 1) Categoría fija en solicitudes directas
-- 2) Split Mercado Pago 10% NAXVO / 90% profesional
-- 3) Captura guiada de INE + rostro
-- 4) Seguimiento de ubicación por solicitud
--
-- Ejecutar UNA VEZ en el SQL Editor del proyecto Supabase antes de publicar
-- la nueva versión de la app y antes de desplegar las Edge Functions incluidas.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- Verificación de identidad: frente/reverso de INE y rostro
-- --------------------------------------------------------------------------
alter table public.verificaciones_profesionales
  add column if not exists ine_frente_path text,
  add column if not exists ine_reverso_path text,
  add column if not exists rostro_path text;

alter table public.verificaciones_clientes
  add column if not exists ine_reverso_path text;

-- Conserva compatibilidad con verificaciones profesionales antiguas.
update public.verificaciones_profesionales
set ine_frente_path = coalesce(ine_frente_path, documento_path)
where documento_path is not null and ine_frente_path is null;

-- El cliente pasa a revisión únicamente cuando tiene frente, reverso y selfie.
create or replace function public.naxvo_guard_client_verification()
returns trigger language plpgsql set search_path=public as $$
begin
  new.fecha_actualizacion := now();
  if coalesce(current_setting('naxvo.internal',true),'') <> '1' and not public.naxvo_is_admin() then
    new.usuario_id := public.naxvo_current_profile_id();
    new.estado := case when new.ine_path is not null and new.ine_reverso_path is not null and new.rostro_path is not null then 'pendiente' else 'borrador' end;
    new.nota_revision := null;
    new.revisado_por := null;
    new.fecha_revision := null;
  end if;
  return new;
end $$;

create or replace function public.naxvo_submit_prof_verification_scan(
  p_identification text,
  p_ine_front_path text,
  p_ine_back_path text,
  p_face_path text
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare me bigint:=public.naxvo_current_profile_id();
begin
  if me is null then raise exception 'Sesión inválida'; end if;
  if not exists(select 1 from public.usuarios where id=me and tipo='trabajador' and estado_cuenta='activo') then
    raise exception 'Activa el modo profesional antes de verificarte';
  end if;
  if length(trim(coalesce(p_identification,'')))<3
     or length(trim(coalesce(p_ine_front_path,'')))<3
     or length(trim(coalesce(p_ine_back_path,'')))<3
     or length(trim(coalesce(p_face_path,'')))<3 then
    raise exception 'Completa el escaneo de INE y rostro';
  end if;

  perform set_config('naxvo.internal','1',true);
  insert into public.verificaciones_profesionales(
    usuario_id,identificacion,documento_path,ine_frente_path,ine_reverso_path,rostro_path,
    estado,nota_revision,revisado_por,fecha_solicitud,fecha_revision,fecha_actualizacion
  ) values (
    me,trim(p_identification),trim(p_ine_front_path),trim(p_ine_front_path),trim(p_ine_back_path),trim(p_face_path),
    'pendiente',null,null,now(),null,now()
  )
  on conflict (usuario_id) do update set
    identificacion=excluded.identificacion,documento_path=excluded.documento_path,
    ine_frente_path=excluded.ine_frente_path,ine_reverso_path=excluded.ine_reverso_path,rostro_path=excluded.rostro_path,
    estado='pendiente',nota_revision=null,revisado_por=null,fecha_solicitud=now(),fecha_revision=null,fecha_actualizacion=now();

  update public.usuarios set
    verificado=false,verificacion_estado='pendiente',verificacion_identificacion=trim(p_identification),
    verificacion_nota=null,disponible=false
  where id=me;

  return jsonb_build_object('submitted',true,'status','pendiente');
end $$;

grant execute on function public.naxvo_submit_prof_verification_scan(text,text,text,text) to authenticated;


-- La aprobación administrativa también valida las tres evidencias en servidor.
create or replace function public.naxvo_admin_review_professional(p_user_id bigint,p_decision text,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare me bigint:=public.naxvo_current_profile_id(); begin
  if not public.naxvo_is_admin() then raise exception 'Acceso administrativo requerido'; end if;
  if p_decision not in ('aprobada','rechazada') then raise exception 'Decisión inválida'; end if;
  if p_decision='aprobada' and not exists(
    select 1 from public.verificaciones_profesionales v
    where v.usuario_id=p_user_id
      and coalesce(v.ine_frente_path,v.documento_path) is not null
      and v.ine_reverso_path is not null
      and v.rostro_path is not null
  ) then raise exception 'Revisa INE frente, reverso y rostro antes de aprobar'; end if;
  perform set_config('naxvo.internal','1',true);
  update public.verificaciones_profesionales
     set estado=p_decision,nota_revision=nullif(trim(p_note),''),revisado_por=me,fecha_revision=now(),fecha_actualizacion=now()
   where usuario_id=p_user_id;
  if not found then raise exception 'No existe una solicitud de verificación profesional'; end if;
  update public.usuarios
     set verificado=(p_decision='aprobada'),verificacion_estado=p_decision,
         verificacion_nota=nullif(trim(p_note),''),
         verificacion_revisada_at=now(),verificacion_revisada_por=me,
         disponible=case when p_decision='aprobada' then true else false end
   where id=p_user_id;
  insert into public.admin_auditoria(administrador_id,accion,entidad_tipo,entidad_id,descripcion)
  values(me,'verificacion_profesional','usuario',p_user_id,p_decision);
  return jsonb_build_object('updated',true);
end $$;

grant execute on function public.naxvo_admin_review_professional(bigint,text,text) to authenticated;

create or replace function public.naxvo_review_client_verification(p_user_id bigint,p_decision text,p_note text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare me bigint:=public.naxvo_current_profile_id(); begin
  if not public.naxvo_is_admin() then raise exception 'Acceso administrativo requerido'; end if;
  if p_decision not in ('aprobada','rechazada') then raise exception 'Decisión inválida'; end if;
  if p_decision='aprobada' and not exists(
    select 1 from public.verificaciones_clientes v
    where v.usuario_id=p_user_id
      and v.ine_path is not null
      and v.ine_reverso_path is not null
      and v.rostro_path is not null
  ) then raise exception 'Revisa INE frente, reverso y rostro antes de aprobar'; end if;
  perform set_config('naxvo.internal','1',true);
  update public.verificaciones_clientes
     set estado=p_decision,nota_revision=nullif(trim(p_note),''),revisado_por=me,
         fecha_revision=now(),fecha_actualizacion=now()
   where usuario_id=p_user_id;
  if not found then raise exception 'No existe una solicitud de verificación de cliente'; end if;
  insert into public.admin_auditoria(administrador_id,accion,entidad_tipo,entidad_id,descripcion)
  values(me,'verificacion_cliente','usuario',p_user_id,p_decision);
  return jsonb_build_object('updated',true);
end $$;

grant execute on function public.naxvo_review_client_verification(bigint,text,text) to authenticated;

-- --------------------------------------------------------------------------
-- Mercado Pago Marketplace / Split 1:1
-- Tokens OAuth privados: no deben ser consultables desde la app.
-- --------------------------------------------------------------------------
create table if not exists public.mercadopago_cuentas (
  usuario_id bigint primary key references public.usuarios(id) on delete cascade,
  provider_user_id text,
  access_token text not null,
  refresh_token text,
  public_key text,
  token_type text,
  scope text,
  expires_at timestamptz,
  fecha_conexion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now()
);

create table if not exists public.mercadopago_oauth_states (
  state text primary key,
  usuario_id bigint not null references public.usuarios(id) on delete cascade,
  expires_at timestamptz not null,
  usado boolean not null default false,
  fecha_creacion timestamptz not null default now()
);

alter table public.mercadopago_cuentas enable row level security;
alter table public.mercadopago_oauth_states enable row level security;

-- Sin políticas para authenticated/anon: solo service_role/Edge Functions.
revoke all on public.mercadopago_cuentas from anon, authenticated;
revoke all on public.mercadopago_oauth_states from anon, authenticated;

alter table public.pagos
  add column if not exists comision_naxvo numeric(10,2),
  add column if not exists monto_trabajador numeric(10,2),
  add column if not exists split_aplicado boolean not null default false,
  add column if not exists provider_seller_id text;

-- --------------------------------------------------------------------------
-- Ubicación en vivo, aislada por solicitud.
-- Solo el profesional asignado escribe. Cliente/profesional/admin pueden leer.
-- --------------------------------------------------------------------------
create table if not exists public.solicitud_ubicacion_trabajador (
  solicitud_id bigint primary key references public.solicitudes(id) on delete cascade,
  trabajador_id bigint not null references public.usuarios(id) on delete cascade,
  latitud numeric(10,8) not null,
  longitud numeric(11,8) not null,
  precision_m numeric(10,2),
  rumbo numeric(7,2),
  velocidad_mps numeric(10,2),
  fecha_actualizacion timestamptz not null default now()
);
create index if not exists ix_solicitud_ubicacion_actualizada
  on public.solicitud_ubicacion_trabajador(fecha_actualizacion desc);

alter table public.solicitud_ubicacion_trabajador enable row level security;

drop policy if exists tracking_select_participants on public.solicitud_ubicacion_trabajador;
create policy tracking_select_participants on public.solicitud_ubicacion_trabajador
for select to authenticated
using (
  public.naxvo_is_admin()
  or exists (
    select 1 from public.solicitudes s
    where s.id = solicitud_id
      and public.naxvo_current_profile_id() in (s.cliente_id, s.trabajador_id)
  )
);

drop policy if exists tracking_worker_insert on public.solicitud_ubicacion_trabajador;
create policy tracking_worker_insert on public.solicitud_ubicacion_trabajador
for insert to authenticated
with check (
  trabajador_id = public.naxvo_current_profile_id()
  and exists (
    select 1 from public.solicitudes s
    where s.id = solicitud_id
      and s.trabajador_id = public.naxvo_current_profile_id()
      and s.estado in ('asignado','en_curso')
  )
);

drop policy if exists tracking_worker_update on public.solicitud_ubicacion_trabajador;
create policy tracking_worker_update on public.solicitud_ubicacion_trabajador
for update to authenticated
using (
  trabajador_id = public.naxvo_current_profile_id()
  and exists (
    select 1 from public.solicitudes s
    where s.id = solicitud_id
      and s.trabajador_id = public.naxvo_current_profile_id()
      and s.estado in ('asignado','en_curso')
  )
)
with check (
  trabajador_id = public.naxvo_current_profile_id()
);

drop policy if exists tracking_worker_delete on public.solicitud_ubicacion_trabajador;
create policy tracking_worker_delete on public.solicitud_ubicacion_trabajador
for delete to authenticated
using (
  trabajador_id = public.naxvo_current_profile_id()
  or public.naxvo_is_admin()
);

grant select,insert,update,delete on public.solicitud_ubicacion_trabajador to authenticated;

-- --------------------------------------------------------------------------
-- Solicitud: si el cliente eligió un profesional, la categoría queda fijada
-- por la especialidad principal del perfil del trabajador.
-- Se conservan Efectivo y Mercado Pago; el split automático aplica solo a Mercado Pago.
-- --------------------------------------------------------------------------
create or replace function public.naxvo_create_request(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  me bigint := public.naxvo_current_profile_id();
  rid bigint;
  worker bigint;
  serviceid bigint;
  addr text;
  fixed_category text;
begin
  if me is null then raise exception 'Sesión inválida'; end if;
  if not exists(select 1 from public.usuarios where id=me and tipo='cliente' and estado_cuenta='activo') then
    raise exception 'Activa el modo cliente para crear solicitudes';
  end if;

  worker := nullif(p_payload->>'trabajador_id','')::bigint;
  serviceid := nullif(p_payload->>'servicio_publicado_id','')::bigint;
  addr := concat_ws(', ',nullif(p_payload->>'calle',''),nullif(p_payload->>'numero',''),nullif(p_payload->>'colonia',''),nullif(p_payload->>'ciudad',''),nullif(p_payload->>'estado_dir',''),nullif(p_payload->>'codigo_postal',''));

  if coalesce(length(trim(p_payload->>'descripcion')),0)<15 then
    raise exception 'La descripción debe tener al menos 15 caracteres';
  end if;

  if worker is not null then
    select especialidad into fixed_category
    from public.usuarios
    where id=worker and tipo='trabajador' and verificado and estado_cuenta='activo';

    if not found then raise exception 'El profesional seleccionado no está disponible'; end if;
    if coalesce(trim(fixed_category),'')='' then raise exception 'El profesional no tiene una categoría principal configurada'; end if;
  end if;

  insert into public.solicitudes(
    cliente_id,trabajador_id,servicio_publicado_id,servicio,descripcion,direccion,
    latitud,longitud,estado_dir,fecha_preferida,hora_preferida,metodo_pago,
    urgencia,instrucciones,calle,numero,colonia,ciudad,codigo_postal
  ) values (
    me,worker,serviceid,
    case when worker is not null then fixed_category else coalesce(nullif(p_payload->>'servicio',''),'Servicio') end,
    p_payload->>'descripcion',addr,
    nullif(p_payload->>'latitud','')::numeric,nullif(p_payload->>'longitud','')::numeric,
    nullif(p_payload->>'estado_dir',''),nullif(p_payload->>'fecha_preferida','')::date,
    nullif(p_payload->>'hora_preferida','')::time,
    case when coalesce(p_payload->>'metodo_pago','efectivo') in ('efectivo','mercadopago')
         then coalesce(p_payload->>'metodo_pago','efectivo') else 'efectivo' end,
    coalesce(nullif(p_payload->>'urgencia',''),'media'),nullif(p_payload->>'instrucciones',''),
    nullif(p_payload->>'calle',''),nullif(p_payload->>'numero',''),nullif(p_payload->>'colonia',''),
    nullif(p_payload->>'ciudad',''),nullif(p_payload->>'codigo_postal','')
  ) returning id into rid;

  perform public.naxvo_add_event(rid,me,'solicitud_creada','Solicitud creada','El cliente registró una nueva solicitud.');
  if worker is not null then
    perform public.naxvo_notify(worker,me,rid,'solicitud_directa','Nueva solicitud directa','Un cliente te envió una solicitud.');
  end if;
  return jsonb_build_object('request_id',rid);
end $$;

grant execute on function public.naxvo_create_request(jsonb) to authenticated;

-- Estado de pago con desglose del split.
create or replace function public.naxvo_payment_status(p_request_id bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  me bigint:=public.naxvo_current_profile_id();
  r public.solicitudes%rowtype;
  p public.pagos%rowtype;
begin
  select * into r from public.solicitudes where id=p_request_id;
  if r.id is null or not (me=r.cliente_id or me=r.trabajador_id or public.naxvo_is_admin()) then
    raise exception 'Pago no disponible';
  end if;
  select * into p from public.pagos where solicitud_id=r.id order by fecha_creacion desc limit 1;

  return jsonb_build_object(
    'request_id',r.id,
    'method',r.metodo_pago,
    'state',coalesce(p.estado,r.estado_pago),
    'paid',r.estado_pago='pagado',
    'amount',r.presupuesto,
    'commission_rate',0.10,
    'commission_amount',coalesce(p.comision_naxvo,round(coalesce(r.presupuesto,0)*0.10,2)),
    'worker_amount',coalesce(p.monto_trabajador,round(coalesce(r.presupuesto,0)*0.90,2)),
    'split_applied',coalesce(p.split_aplicado,false),
    'quote_state',r.cotizacion_estado,
    'service_state',r.estado,
    'cash_client_declared',coalesce(p.cash_client_declared,false),
    'cash_worker_confirmed',coalesce(p.cash_worker_confirmed,false),
    'payment',case when p.id is null then null else jsonb_build_object(
      'id',p.id,'method',p.metodo,'state',p.estado,'provider',p.proveedor,
      'provider_status',p.provider_status,'provider_status_detail',p.provider_status_detail,
      'preference_id',p.provider_preference_id,'provider_payment_id',p.provider_payment_id,
      'checkout_url',p.checkout_url,'external_reference',p.external_reference,
      'created_at',p.fecha_creacion,'updated_at',p.fecha_actualizacion,'paid_at',p.fecha_pago,
      'simulation',p.sandbox,'commission_amount',p.comision_naxvo,
      'worker_amount',p.monto_trabajador,'split_applied',p.split_aplicado
    ) end,
    'refresh',null
  );
end $$;

grant execute on function public.naxvo_payment_status(bigint) to authenticated;

commit;

-- Verificación rápida
select 'verificaciones_profesionales' as objeto,
       count(*) filter (where column_name in ('ine_frente_path','ine_reverso_path','rostro_path')) as columnas_nuevas
from information_schema.columns
where table_schema='public' and table_name='verificaciones_profesionales'
union all
select 'pagos', count(*) filter (where column_name in ('comision_naxvo','monto_trabajador','split_aplicado','provider_seller_id'))
from information_schema.columns where table_schema='public' and table_name='pagos';
