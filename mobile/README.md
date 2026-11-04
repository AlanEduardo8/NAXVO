# NAXVO_D Mobile — React Native + Supabase

Versión reestructurada de NAXVO_D. El móvil ya no depende de PHP, XAMPP, Apache ni una API alojada en una PC.

## Arquitectura

- React Native + Expo + TypeScript
- Supabase Auth para registro, login y sesión
- Supabase PostgreSQL + RLS para datos
- Supabase Storage para avatares, portafolio, evidencias y verificaciones
- Supabase Edge Functions para Mercado Pago y el asistente opcional
- Expo SecureStore para conservar la sesión en el dispositivo

## Inicio rápido

1. Crea/configura un proyecto de Supabase.
2. Ejecuta `../supabase/00_FULL_SETUP.sql` en SQL Editor.
3. Copia `.env.example` a `.env` y coloca la URL base y la Publishable Key del proyecto.
4. Instala dependencias y valida:

```powershell
npm install
npm run typecheck
npx expo-doctor
npx expo start --clear
```

La URL debe ser la base del proyecto, por ejemplo `https://abc.supabase.co`, sin `/rest/v1/`.

## Producción

`eas.json` contiene un perfil `preview` para APK y `production` para AAB. Antes de publicar, configura las mismas variables `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en el entorno production de EAS.

Los secretos de Mercado Pago o IA nunca se colocan en `.env` del móvil. Se configuran únicamente como secretos de Supabase Edge Functions.
