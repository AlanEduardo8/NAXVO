# Checklist de pruebas — NAXVO_D Supabase

Realiza estas pruebas con al menos tres cuentas: cliente, profesional y administrador.

## Base

- La app abre sin intentar conectarse a XAMPP/localhost.
- Registro de cliente crea fila en `auth.users` y `public.usuarios`.
- Registro de profesional crea perfil con verificación pendiente.
- Login, persistencia de sesión y cerrar sesión funcionan.
- Perfil, foto y preferencias se guardan y vuelven a cargar.

## Marketplace

- Categorías cargan en bienvenida/búsqueda.
- Un profesional verificado puede publicar, editar, pausar y eliminar servicios.
- Los clientes pueden buscar profesionales/servicios y marcar favoritos.
- Portafolio carga imágenes desde el bucket público.

## Flujo de servicio

- Cliente crea una solicitud general o directa.
- Profesional verificado ve oportunidades y puede aceptar/rechazar.
- Profesional envía cotización y cliente acepta o solicita cambios.
- Se habilita el inicio del servicio después de aceptar la cotización.
- Chat envía/lee mensajes guardados en Supabase.
- Profesional carga evidencias privadas y solicita finalización.
- Cliente puede pedir corrección o confirmar al completarse el pago.

## Pagos

- Efectivo: cliente marca entrega y profesional confirma recepción.
- Mercado Pago: checkout se crea mediante Edge Function.
- Al volver a la app, **Actualizar estado** consulta Mercado Pago.
- Webhook de Mercado Pago puede actualizar a `pagado` sin exponer secretos al móvil.

## Verificaciones y administración

- Documentos de identidad no tienen URL pública.
- Administración puede aprobar/rechazar verificación profesional.
- Administración puede revisar documentos de cliente mediante URL firmada temporal.
- Dashboard, usuarios, solicitudes, pagos, reportes, reseñas y auditoría cargan únicamente con cuenta admin.

## Producción

Antes del AAB final confirma:

- `npm run typecheck` termina sin errores.
- `npx expo-doctor` no reporta incompatibilidades críticas.
- `android.package` es `com.naxvo.myappy`.
- Las variables Supabase existen en EAS `production`.
- No existen credenciales `service_role`, tokens Mercado Pago ni contraseñas dentro de `mobile/`.
- APK `preview` probado físicamente con datos móviles, no solo en la misma Wi‑Fi de la computadora.
