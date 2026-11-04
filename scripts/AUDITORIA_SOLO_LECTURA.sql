-- NAXVO: auditoría de compatibilidad. SOLO LECTURA, no modifica la base.
-- Ejecutar en el proyecto de Supabase que REALMENTE usa mobile/.env.
-- Sirve para detectar si la BD contiene la estructura de este ZIP.

WITH objetos(tipo, nombre) AS (
  VALUES
    ('tabla','usuarios'),('tabla','categorias'),('tabla','solicitudes'),
    ('tabla','servicios_profesionales'),('tabla','pagos'),('tabla','mensajes'),
    ('tabla','notificaciones'),('tabla','profesionales_favoritos'),
    ('tabla','trabajos_realizados'),('tabla','verificaciones_clientes'),
    ('tabla','verificaciones_profesionales'),('tabla','admin_auditoria'),
    ('vista','naxvo_public_workers'),('vista','naxvo_public_services'),
    ('vista','naxvo_public_portfolio'),('vista','naxvo_public_reviews'),
    ('vista','naxvo_admin_users'),('vista','naxvo_admin_requests'),
    ('columna usuarios','auth_user_id'),('columna usuarios','modo_dual_habilitado'),
    ('columna solicitudes','metodo_pago'),('columna solicitudes','fecha_preferida'),
    ('columna solicitudes','cotizacion_estado'),
    ('función','naxvo_create_request'),('función','naxvo_home_stats'),
    ('función','naxvo_get_opportunities'),('función','naxvo_send_message'),
    ('función','naxvo_submit_quote'),('función','naxvo_payment_status'),
    ('función','naxvo_admin_dashboard'),('función','naxvo_switch_role'),
    ('bucket','avatars'),('bucket','portfolio'),('bucket','request-media'),
    ('bucket','verification-docs'),('bucket','completion-evidence')
)
SELECT tipo, nombre,
  CASE
    WHEN tipo IN ('tabla','vista') THEN to_regclass(format('public.%I',nombre)) IS NOT NULL
    WHEN tipo LIKE 'columna %' THEN EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name=split_part(tipo,' ',2) AND c.column_name=nombre
    )
    WHEN tipo='función' THEN EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
      WHERE n.nspname='public' AND p.proname=nombre
    )
    WHEN tipo='bucket' THEN EXISTS (
      SELECT 1 FROM storage.buckets b WHERE b.id=nombre
    )
    ELSE false
  END AS existe
FROM objetos ORDER BY tipo,nombre;

-- Si auth_user_id existe, esta consulta adicional permite comprobar cuentas
-- sin equivalencia en Supabase Auth (sin mostrar emails ni contraseñas):
-- SELECT count(*) AS perfiles_sin_auth FROM public.usuarios WHERE auth_user_id IS NULL;
