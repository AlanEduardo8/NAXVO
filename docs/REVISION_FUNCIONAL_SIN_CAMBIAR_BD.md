# NAXVO: auditoría de conservación y correcciones

Esta entrega parte de `NAXVO_D_Supabase_RN.zip`; NO modifica ninguna tabla ni credencial ni cambia la conexión configurada en el equipo del usuario.

## Evidencia de conservación del frontend

Se comparó el `mobile/` de este archivo con `NAXVO.zip` (versión previa a la sustitución del backend). **Todas las pantallas/componentes del frontend están presentes; los cambios principales son en `src/api/client.ts`, `src/api/index.ts` y la implementación de Supabase.** Eso demuestra conservación de archivos, no equivalencia funcional con la API anterior.

## Correcciones en código incluidas

1. El asistente **no repite artificialmente el mensaje de bienvenida al fallar Groq**. El cliente muestra un error identificable. La Edge Function responde con una explicación cuando falta `GROQ_API_KEY`, cuando Groq falla o cuando no hay una sesión válida.
2. La función `help-bot` acepta historia corta, contexto de pantalla, lenguaje sencillo y el modelo configurable `GROQ_MODEL`; la clave sigue siendo secreta del servidor. **Hay que desplegar la función y configurar el secreto para tener IA real**.
3. Las **categorías base** siguen disponibles si Supabase no responde o su catálogo está vacío. Es solo una ayuda de interfaz: no se inventan profesionales ni servicios publicados. Si los datos de producción usan otra estructura, será necesario adaptar la consulta de verdad.
4. **Tarjeta de crédito/débito** se envía como `mercadopago`, porque el esquema actual solo admite `efectivo` y `mercadopago`. Los datos de tarjeta no pasan por NAXVO.
5. Al crear una solicitud se verifica que el servidor haya devuelto un folio válido.

## No modificar la base sin comprobar su compatibilidad

El archivo `supabase/00_FULL_SETUP.sql` incluido en el proyecto recibido define un **esquema nuevo** (incluye `auth_user_id`, tabla `categorias`, vistas `naxvo_*` y procedimientos RPC). **No es una migración comprobada de la base PHP/Supabase anterior.** Ejecutarlo ciegamente en una base existente puede romper flujos o políticas; en esta entrega se conserva sin ejecutar.

Ejecuta `scripts/AUDITORIA_SOLO_LECTURA.sql` en el SQL Editor del proyecto Supabase que figura en `mobile/.env`. El script no modifica nada. Deben verificarse los objetos que aparezcan como `false`.

**Atención al proyecto Supabase:** el archivo `.env` del ZIP recibido está configurado para un proyecto distinto del proyecto que se vinculó en pasos anteriores de la conversación. No cambiamos esa configuración arbitrariamente; confirma cuál contiene realmente tus cuentas y datos. No copies una `service_role` al cliente.

## Pruebas necesarias para afirmar 100 % funcionalidad

- Cliente: registro/login con Supabase Auth, búsqueda, favoritos, perfil y cambio de rol, solicitud con GPS/calendario/fotos/pagos, chat, aceptación/corrección de cotización, finalización.
- Trabajador: verificación, oportunidades, gestión de servicios, cotizaciones, inicio/finalización de trabajo, portafolio y evidencias.
- Administración: permisos, revisión de documentos, gestión de usuarios, solicitudes, pagos, reportes y auditoría.
- Groq: desplegar `help-bot`, configurar `GROQ_API_KEY`, probar dos mensajes diferentes y conversación con contexto. Sin secreto no hay respuestas generativas.
- Mercado Pago: `mercadopago-checkout` y `mercadopago-webhook`, credenciales de prueba y confirmación real desde el proveedor.
- Android: comprobar geolocalización/permisos, almacenamiento, reconocimiento de voz disponible según plataforma, APK con datos móviles y sin XAMPP.

**Verificación realizada localmente:** comparación de archivos, TypeScript y pruebas de lógica aislada (sin base de datos real). **No se realizaron pagos ni pruebas reales de Supabase, Groq, APK o biometría.**

## Cómo instalar sin perder nada

Este proyecto es una copia corregida del frontend y funciones originales. Si prefieres aplicar solo los cambios, usa el ZIP de parche incremental que acompaña a esta entrega; conserva tu `.env`, tus `node_modules` y todo lo demás. **No ejecutes `00_FULL_SETUP.sql` por esta corrección.**

Para probar en Windows, desde `mobile`:

```powershell
npm install
npm run typecheck
npx expo start --clear
```

En Supabase Edge Functions, para activar el chatbot después de verificar el proyecto correcto:

```powershell
npx supabase secrets set GROQ_API_KEY="TU_CLAVE_PRIVADA" GROQ_MODEL="openai/gpt-oss-120b"
npx supabase functions deploy help-bot
```

No copies la clave privada al chat, al ZIP ni a `mobile/.env`.
