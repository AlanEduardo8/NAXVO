# Configuración de Supabase para NAXVO_D

Esta versión fue preparada para funcionar sin PHP/XAMPP. El móvil se conecta directamente a Supabase para autenticación, base de datos y archivos; las operaciones que requieren secretos se ejecutan como Edge Functions.

## 1. Crear o elegir el proyecto

Se recomienda usar un proyecto de Supabase limpio para evitar conflictos con tablas antiguas. En el panel de Supabase abre **SQL Editor**, crea una consulta nueva y ejecuta completo:

`supabase/00_FULL_SETUP.sql`

El script crea tablas, relaciones, índices, RLS, vistas públicas/administrativas, funciones RPC, buckets y categorías base.

## 2. Authentication

En **Authentication > Providers > Email** habilita correo/contraseña. Para las primeras pruebas puedes desactivar temporalmente **Confirm email**. Si lo dejas activo, el registro funciona pero el usuario debe confirmar el correo antes del primer login.

El registro en Supabase Auth crea automáticamente el perfil correspondiente en `public.usuarios` mediante un trigger.

## 3. Variables del móvil

En `mobile/` copia `.env.example` como `.env` y coloca únicamente valores públicos:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE_PUBLICA
```

La URL debe ser la URL base, **sin** `/rest/v1/`. Nunca coloques `service_role`, contraseñas de base de datos ni tokens de Mercado Pago dentro de la app.

## 4. Primer administrador

Primero registra normalmente la cuenta mediante NAXVO. Después abre `supabase/01_PROMOTE_ADMIN.sql`, cambia `CAMBIA_AQUI@correo.com` por su correo y ejecuta el script en SQL Editor.

## 5. Edge Functions

Instala e inicia sesión con Supabase CLI, vincula la carpeta al proyecto y despliega:

```powershell
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy mercadopago-checkout
supabase functions deploy mercadopago-webhook --no-verify-jwt
supabase functions deploy help-bot
```

El webhook debe desplegarse con `--no-verify-jwt` porque Mercado Pago no posee una sesión de Supabase. La función no confía ciegamente en el webhook: vuelve a consultar el Payment ID directamente a Mercado Pago antes de registrar un pago.

### Mercado Pago

Configura el token únicamente como secreto de Supabase:

```powershell
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
```

Opcionalmente puedes indicar una URL HTTPS de retorno tras el checkout:

```powershell
supabase secrets set NAXVO_RETURN_URL="https://tudominio.com/pago"
```

No coloques el Access Token en `mobile/.env`.

### Asistente opcional

Sin una clave de IA el asistente conserva una ayuda guiada local. Si deseas habilitar respuestas de IA mediante la Edge Function incluida:

```powershell
supabase secrets set GROQ_API_KEY="TU_CLAVE"
supabase functions deploy help-bot
```

## 6. Storage

El SQL crea automáticamente:

- `avatars`: público; escritura en carpeta del propietario.
- `portfolio`: público; escritura en carpeta del profesional.
- `request-media`: privado; acceso de participantes de la solicitud.
- `completion-evidence`: privado; acceso de participantes de la solicitud.
- `verification-docs`: privado; acceso del propietario y administración.

No conviertas en públicos los tres buckets privados.

## 7. Ejecutar el móvil

Desde `mobile/`:

```powershell
npm install
npm run typecheck
npx expo-doctor
npx expo start --clear
```

## 8. Variables para EAS

Antes del APK/AAB configura también las variables públicas en EAS:

```powershell
eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://TU_PROJECT_REF.supabase.co --environment preview --visibility plaintext
eas env:set --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_TU_CLAVE --environment preview --visibility plaintext

eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://TU_PROJECT_REF.supabase.co --environment production --visibility plaintext
eas env:set --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_TU_CLAVE --environment production --visibility plaintext
```

Como se retiró la asociación EAS antigua del proyecto de tu compañero, cuando llegue el momento de compilar enlaza NAXVO_D a tu propia cuenta con:

```powershell
eas login
eas init
```

El identificador Android preparado es `com.naxvo.myappy`.

## 9. Seguridad

RLS está habilitado en las tablas privadas. Las operaciones sensibles de flujo —aceptar solicitudes, cotizar, cambiar estados, confirmar efectivo y acciones de administración— pasan por funciones PostgreSQL que verifican al usuario autenticado. Mercado Pago usa una Edge Function con secretos del servidor; el móvil nunca recibe el Access Token.
