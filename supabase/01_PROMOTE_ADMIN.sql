-- Ejecuta este archivo SOLO después de registrar por la app la cuenta que será administradora.
-- Sustituye el correo antes de ejecutar.

begin;
select set_config('naxvo.internal','1',true);
update public.usuarios
set tipo='admin', estado_cuenta='activo', verificado=true, verificacion_estado='no_aplica'
where lower(email)=lower('CAMBIA_AQUI@correo.com');
commit;

select id,nombre,apellidos,email,tipo,estado_cuenta
from public.usuarios
where lower(email)=lower('CAMBIA_AQUI@correo.com');
