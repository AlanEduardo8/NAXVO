# Instalación de correcciones de NAXVO_D

**No reemplaces la base de datos ni ejecutes `supabase/00_FULL_SETUP.sql` sobre el proyecto actual.** Este parche no necesita migraciones SQL.

## Opción A: proyecto completo

1. Haz copia del directorio de NAXVO_D actual.
2. Descomprime `NAXVO_D_REVISADO_CONSERVANDO_SUPABASE.zip` en otra carpeta. Conserva su estructura interna con dos niveles `NAXVO_D_Supabase_RN`.
3. La carpeta `mobile/.env` y las dependencias originales permanecen dentro de este proyecto (no publiques el ZIP).
4. Entra a `mobile`, ejecuta `npm run typecheck` y luego `npx expo start --clear`.

## Opción B: parche incremental (recomendado para no sobrescribir nada más)

1. Haz copia del proyecto actual.
2. Extrae `NAXVO_PARCHE_IA_CATEGORIAS_SOLICITUDES.zip` en el directorio que contiene `mobile/` y `supabase/`, combinando carpetas. **Solo** se sustituyen `mobile/src/api/index.ts` y `supabase/functions/help-bot/index.ts`. El archivo `categoryCatalog.ts` es nuevo; se agregan documentos y pruebas.
3. No se modifican `mobile/.env`, dependencias, otras pantallas ni tablas Supabase.
4. En `mobile`, ejecuta `npm run typecheck` y `npx expo start --clear`.

## Activar Groq real

La función necesita desplegarse en el **mismo proyecto de Supabase** utilizado en `mobile/.env`, y tener `GROQ_API_KEY` en los secretos del servidor. Se puede utilizar el modelo `openai/gpt-oss-120b` mediante `GROQ_MODEL`. No introduzcas la clave en el APK, `.env` de Expo, repositorios o capturas.

```powershell
# Desde la carpeta raíz del proyecto, una vez CONFIRMADO el project-ref correcto:
npx supabase link --project-ref EL_PROJECT_REF_QUE_USA_MOBILE_ENV
npx supabase functions deploy help-bot
```

Configura el secreto desde el panel de Supabase **Edge Functions → Secrets**; no es necesario compartirlo en el chat.

Si no se ha desplegado Groq, el chat indicará el problema en lugar de repetir una bienvenida. El comportamiento generativo requiere conexión real y cuota disponible en el proveedor.

## Base de datos

Ejecuta la consulta de **solo lectura** `scripts/AUDITORIA_SOLO_LECTURA.sql` en SQL Editor para comprobar los objetos que requiere esta versión. Si aparecen columnas, funciones, vistas o buckets ausentes, primero hay que acordar una migración **aditiva específica** con respaldo y pruebas; no ejecutar a ciegas el esquema completo.

## Observaciones

- GPS, fotos, fecha, hora y pagos de solicitud ya estaban presentes en el formulario del ZIP; se ven al desplazarse hacia abajo. Si no salen categorías por una consulta fallida, ahora se muestra un catálogo visual local.
- La opción «Tarjeta» se procesa mediante Mercado Pago. El backend no recopila datos de tarjetas.
- Se mantienen todos los archivos originales. Las pruebas locales no sustituyen las pruebas con los tres roles y una base Supabase real.
