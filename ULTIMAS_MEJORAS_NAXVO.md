# NAXVO · Últimas mejoras funcionales

Esta entrega incorpora los cambios finales solicitados sobre NAXVO. La app móvil está en `mobile/` y los cambios de Supabase están en `supabase/`.

## Cambios incluidos

1. **Categoría fija del profesional**
   - Cuando el cliente elige un profesional, la solicitud muestra únicamente la especialidad/categoría principal configurada en el perfil del profesional.
   - El cliente no puede modificarla.
   - La regla también se valida en PostgreSQL dentro de `naxvo_create_request`, para que no dependa solo de la interfaz.

2. **Mercado Pago Marketplace · comisión NAXVO 10%**
   - Las solicitudes conservan **Efectivo** y **Mercado Pago**. El split automático 10/90 se aplica a los cobros procesados mediante Mercado Pago.
   - Cada profesional debe vincular su propia cuenta de Mercado Pago desde su perfil.
   - El checkout se crea con el Access Token OAuth del profesional y `marketplace_fee` equivalente al 10%.
   - NAXVO registra el desglose de comisión y monto asignado al profesional.
   - El 90% mostrado corresponde al importe bruto del profesional antes de las comisiones propias de Mercado Pago.

3. **Verificación de identidad**
   - Captura guiada con cámara de:
     - frente del INE;
     - reverso del INE;
     - rostro frontal.
   - Los archivos permanecen en el bucket privado `verification-docs`.
   - Administración debe revisar las tres evidencias antes de aprobar.
   - La captura facial es revisión manual de identidad. Esta entrega NO afirma realizar reconocimiento facial biométrico, prueba de vida ni comparación automática INE/rostro.

4. **Registro y teclado**
   - `KeyboardAvoidingView` + `ScrollView` con ajuste de teclado.
   - Android usa `softwareKeyboardLayoutMode: resize`.
   - Se evita que el teclado cubra los últimos campos del registro.

5. **Mostrar / ocultar contraseña**
   - Componente reutilizable `PasswordField` con icono de ojo.
   - Aplicado en registro e inicio de sesión.

6. **Mensaje de autenticación**
   - Credenciales inválidas muestran: **“Correo o contraseña incorrectos”**.

7. **Mapas y ubicación en vivo**
   - La dirección manual se intenta geocodificar antes de crear la solicitud.
   - El profesional asignado puede visualizar el domicilio en el mapa y abrirlo en Maps.
   - El profesional puede iniciar/detener la ubicación en vivo mientras va en camino.
   - El cliente visualiza la última ubicación compartida y se actualiza aproximadamente cada 5 segundos.
   - La ubicación se comparte únicamente con participantes de la solicitud y administradores mediante RLS.
   - El seguimiento de esta versión es **en primer plano**: si NAXVO deja de estar activa, el sistema operativo pausa las actualizaciones.

---

# 1. Aplicar cambios de Supabase

Proyecto de producción actual:

```text
sasmyicaobgzjlwnkxfb
```

En **Supabase → SQL Editor** abre y ejecuta completo:

```text
supabase/02_ULTIMAS_MEJORAS_NAXVO.sql
```

El script agrega las columnas de verificación, tablas privadas de OAuth, campos de split, tabla de ubicación en vivo, RLS y reemplaza los RPC necesarios.

> Recomendación: ejecutarlo primero en un proyecto de prueba o respaldar el esquema antes de producción.

---

# 2. Configurar Mercado Pago Marketplace

El split 10/90 real requiere que NAXVO sea una integración Marketplace y que cada profesional autorice su cuenta mediante OAuth.

## 2.1 En Mercado Pago Developers

En la aplicación de NAXVO registra exactamente esta URL de redirección OAuth:

```text
https://sasmyicaobgzjlwnkxfb.supabase.co/functions/v1/mercadopago-connect
```

Obtén de la aplicación Marketplace:

- `CLIENT_ID`
- `CLIENT_SECRET`

No guardes estos valores dentro de la app móvil.

## 2.2 Secrets de Supabase

Desde la raíz que contiene la carpeta `supabase`:

```cmd
npx supabase secrets set MERCADOPAGO_CLIENT_ID="TU_CLIENT_ID" --project-ref sasmyicaobgzjlwnkxfb
npx supabase secrets set MERCADOPAGO_CLIENT_SECRET="TU_CLIENT_SECRET" --project-ref sasmyicaobgzjlwnkxfb
npx supabase secrets set MERCADOPAGO_REDIRECT_URI="https://sasmyicaobgzjlwnkxfb.supabase.co/functions/v1/mercadopago-connect" --project-ref sasmyicaobgzjlwnkxfb
npx supabase secrets set NAXVO_MP_APP_RETURN="naxvo://mercadopago-connected" --project-ref sasmyicaobgzjlwnkxfb
```

Si ya usabas `NAXVO_RETURN_URL` para Checkout Pro puedes conservarlo.

## 2.3 Desplegar Edge Functions

```cmd
npx supabase functions deploy mercadopago-connect --project-ref sasmyicaobgzjlwnkxfb --no-verify-jwt --use-api
npx supabase functions deploy mercadopago-checkout --project-ref sasmyicaobgzjlwnkxfb --no-verify-jwt --use-api
npx supabase functions deploy mercadopago-webhook --project-ref sasmyicaobgzjlwnkxfb --no-verify-jwt --use-api
```

`mercadopago-connect` necesita aceptar el callback público de OAuth y `mercadopago-webhook` necesita aceptar notificaciones de Mercado Pago. `mercadopago-checkout` valida internamente la sesión del usuario antes de operar.

Después, cada profesional debe entrar a:

```text
Perfil → Cuenta de cobro → Vincular Mercado Pago
```

hasta que aparezca como cuenta vinculada.

---

# 3. Instalar mapas

La versión definitiva declara `react-native-maps` en `package.json`. **Antes de compilar ejecuta `npm install` para instalar dependencias y generar un `package-lock.json` coherente.**

Desde `mobile/`:

```cmd
npx expo install react-native-maps
```

Si npm indica que el lockfile necesita actualizarse, ejecuta después:

```cmd
npm install
```

## Google Maps para Android

En Google Cloud:

1. Activa **Maps SDK for Android**.
2. Crea una API key.
3. Restringe la key a la aplicación Android de NAXVO:
   - paquete: `com.naxvo.myappy`;
   - SHA-1: usa el certificado de firma de producción / Google Play App Signing correspondiente.
4. Guarda la variable `GOOGLE_MAPS_API_KEY` en el entorno de producción de EAS.

El archivo `mobile/app.config.js` carga esa variable y configura `react-native-maps` durante el build.

Ejemplo local antes de un build:

```powershell
$env:GOOGLE_MAPS_API_KEY="TU_GOOGLE_MAPS_KEY"
```

Para producción es preferible crearla desde **EAS → Environment Variables** para el entorno de producción.

---

# 4. Compilar una nueva versión

Estas mejoras **sí requieren un AAB nuevo**, porque incluyen cambios de interfaz y una dependencia nativa de mapas. No pueden aplicarse únicamente desde Supabase al AAB anterior.

Desde `mobile/`:

```powershell
$env:EAS_NO_VCS="1"
$env:EAS_PROJECT_ROOT=(Get-Location).Path
eas build -p android --profile production
```

---

# 5. Pruebas recomendadas antes de publicar

### Registro / login
- Abrir registro y llegar a los campos inferiores con el teclado abierto.
- Mostrar/ocultar contraseña.
- Probar contraseña incorrecta y verificar el mensaje exacto.

### Solicitud directa
- Seleccionar un profesional.
- Confirmar que solo aparece su categoría fija.
- Crear solicitud con dirección escrita manualmente y revisar que se guarden coordenadas cuando la geocodificación esté disponible.

### Verificación
- Trabajador: INE frente + reverso + rostro.
- Cliente: INE frente + reverso + rostro.
- Admin: abrir las tres imágenes y aprobar/rechazar.

### Pago
- Profesional vincula Mercado Pago.
- Cliente acepta cotización.
- Verificar en pago el desglose 10% / 90%.
- Abrir Checkout Pro con una cuenta de prueba antes de producción.
- Confirmar webhook y estado `pagado`.

### Ubicación
- Profesional asignado abre la solicitud y confirma que ve el domicilio.
- Pulsa **Compartir ubicación en camino**.
- Cliente abre la misma solicitud desde otro dispositivo y observa la posición.
- Profesional pulsa **Detener ubicación en vivo** y confirma que deja de mostrarse.

---

# Archivos principales modificados

```text
mobile/app/(auth)/login.tsx
mobile/app/(auth)/register.tsx
mobile/app/request/new.tsx
mobile/app/request/[id].tsx
mobile/app/payment/[id].tsx
mobile/app/verification.tsx
mobile/app/verification/client.tsx
mobile/app/admin/client-verifications.tsx
mobile/app/(admin)/verifications.tsx
mobile/app/mercadopago-connected.tsx
mobile/src/components/ui.tsx
mobile/src/components/RequestTrackingMap.tsx
mobile/src/screens/ProfileScreen.tsx
mobile/src/lib/supabase.ts
mobile/src/api/index.ts
mobile/src/types/api.ts
mobile/app.json
mobile/app.config.js
supabase/02_ULTIMAS_MEJORAS_NAXVO.sql
supabase/functions/mercadopago-connect/index.ts
supabase/functions/mercadopago-checkout/index.ts
supabase/functions/mercadopago-webhook/index.ts
```
