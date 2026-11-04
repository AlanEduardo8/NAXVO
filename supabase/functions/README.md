# NAXVO Edge Functions

- `mercadopago-checkout`: autenticada; crea y sincroniza intentos de pago.
- `mercadopago-webhook`: pública para Mercado Pago; desplegar con `--no-verify-jwt`. Valida el estado consultando la API de Mercado Pago antes de actualizar NAXVO.
- `help-bot`: autenticada; usa ayuda guiada si no existe `GROQ_API_KEY`.

Secretos privados esperados:

- `MERCADOPAGO_ACCESS_TOKEN`
- `NAXVO_RETURN_URL` (opcional)
- `GROQ_API_KEY` (opcional)

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` son variables provistas por el entorno de Edge Functions de Supabase.
