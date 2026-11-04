# NAXVO_D — Migración React Native + Supabase

Este paquete conserva el frontend React Native/Expo de NAXVO_D y reemplaza el backend PHP/XAMPP por servicios gestionados de Supabase.

## Carpetas

- `mobile/`: aplicación Expo/React Native.
- `supabase/00_FULL_SETUP.sql`: esquema, RLS, RPC, vistas y Storage.
- `supabase/functions/`: Edge Functions para Mercado Pago y ayuda asistida.
- `docs/CONFIGURACION_SUPABASE.md`: instalación paso a paso.
- `docs/PRUEBAS_MIGRACION.md`: checklist funcional antes de generar el AAB.

No se incluye el backend PHP original porque ya no forma parte de la arquitectura final.
