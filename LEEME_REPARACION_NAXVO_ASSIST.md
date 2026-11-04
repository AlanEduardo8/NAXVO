# Reparación específica de NAXVO Assist — sin reemplazar tu configuración

Este parche contiene **solo dos archivos modificados de código** (`help-bot` y el manejo de errores del móvil) y **un instalador PowerShell nuevo**. No toca diseños, usuarios, solicitudes, tablas, pagos ni las variables públicas `.env`.

## Instalar

1. Guarda una copia del proyecto que actualmente utilizas.
2. Descomprime el ZIP del parche sobre la carpeta raíz del proyecto, manteniendo la estructura `mobile/`, `supabase/`, `scripts/`.
3. En PowerShell, desde la raíz del proyecto, ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ACTIVAR_NAXVO_ASSIST.ps1
```

El script **lee el proyecto Supabase del `mobile/.env` existente**, no el proyecto vinculado anteriormente en otra carpeta. Busca la clave Groq en el archivo original `C:\xampp\htdocs\NAXVO_Movil\backend\.env`, `C:\NAXVO\NAXVO_Movil\backend\.env`, o en un ZIP original `C:\NAXVO\NAXVO.zip` / Descargas. La sube a los **secretos de ese proyecto Supabase**, mediante un archivo temporal borrado después de usarlo. **No agrega claves privadas al APK ni al código frontend.** Si el secreto ya existe en Supabase no lo reemplaza cuando no hay original disponible.

Si conservaste el backend o ZIP en otra ubicación:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\ACTIVAR_NAXVO_ASSIST.ps1 -LegacyBackendEnv 'C:\RUTA\backend\.env'
# o:
powershell -ExecutionPolicy Bypass -File .\scripts\ACTIVAR_NAXVO_ASSIST.ps1 -LegacyZip 'C:\RUTA\NAXVO.zip'
```

4. Reinicia Metro (Ctrl+C, `cd mobile`, `npx expo start --clear`), inicia sesión y consulta NAXVO Assist.

## Seguridad y límites

- Desplegar usa tu sesión **Supabase CLI** ya autenticada y requiere permiso para modificar Edge Functions/Secrets. **No modifica bases de datos**.
- El contenido de la clave no se muestra en la terminal ni se almacena permanentemente en el parche; sí se lee del archivo antiguo y pasa por un temporal que se elimina después. Tu instalación antigua podría contener otras credenciales; no distribuyas ese archivo.
- Sin despliegue y prueba real, no puede asegurarse que Groq funcione ni que la API remota esté configurada correctamente. Si falla, revisa `Supabase > Edge Functions > help-bot > Logs`, sin compartir secretos.
- **No ejecuta** migraciones ni cambia las 89 rutas, ni proyectos, ni la configuración de Mercado Pago.
