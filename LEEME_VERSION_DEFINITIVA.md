# NAXVO · versión definitiva corregida

Esta carpeta parte de **NaxvoF** y conserva las mejoras agregadas, pero corrige regresiones detectadas al compararla contra **NAXVO (2)**.

## Qué se corrigió

- Se conservaron todas las pantallas/rutas del NAXVO anterior.
- Se restauró **Efectivo** como método de pago disponible y predeterminado, sin quitar Mercado Pago ni el split 10/90.
- Se conserva la opción de tarjeta procesada mediante Mercado Pago.
- `request/[id].tsx` ya no puede quedar atrapado indefinidamente en **“Cargando solicitud…”**: ahora muestra el error, permite reintentar y permite volver a la lista.
- Se mantienen categoría fija del profesional, geocodificación, mapa/ubicación en vivo, verificación INE frente/reverso/rostro, mejoras de teclado/contraseña y Mercado Pago Connect.
- El panel admin ahora detecta cuando Supabase devuelve un dashboard vacío por falta de rol/permisos, en vez de mostrar métricas vacías silenciosamente.
- Se añadió `supabase/03_REPARACION_COMPATIBILIDAD_FINAL.sql` para:
  - normalizar administradores antiguos con `estado_cuenta` vacío;
  - restaurar `EXECUTE` a los RPC usados por NAXVO;
  - restaurar el permiso de `naxvo_me()` si esa función existe en la base actual;
  - mantener protegidas las funciones internas no utilizadas por la app.

## Orden de SQL en Supabase

Si tu base ya tiene `00_FULL_SETUP.sql`, **no vuelvas a recrearla**. Para la versión final ejecuta, en este orden:

1. `supabase/02_ULTIMAS_MEJORAS_NAXVO.sql` (si todavía no lo aplicaste completo).
2. `supabase/03_REPARACION_COMPATIBILIDAD_FINAL.sql`.

El archivo `03` es idempotente para los cambios de compatibilidad incluidos y puede ejecutarse sobre la base actual.

## Preparar la app

Desde la raíz de este proyecto puedes ejecutar en PowerShell:

```powershell
.\PREPARAR_NAXVO.ps1
```

O manualmente:

```powershell
cd mobile
npm install
npm run typecheck
```

`npm install` genera un `package-lock.json` nuevo y coherente, incluyendo `react-native-maps`.

## Generar APK descargable con EAS

Desde `mobile/`:

```powershell
eas build -p android --profile preview
```

El perfil `preview` está configurado con `android.buildType = "apk"`.

## Variables de EAS

Mantén configuradas en el entorno `preview` al menos:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Para mostrar Google Maps dentro de Android agrega también:

- `GOOGLE_MAPS_API_KEY`

Sin esa última key, la app conserva la ubicación y el botón para abrir Maps, pero el mapa nativo puede no mostrarse correctamente.
