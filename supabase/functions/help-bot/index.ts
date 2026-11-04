// NAXVO Assist — unica funcion cambiada; compatible con el frontend existente.
// GROQ_API_KEY es un secreto del servidor, nunca una variable EXPO_PUBLIC_*.
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const model = (Deno.env.get('GROQ_MODEL') ?? 'openai/gpt-oss-120b').trim();
const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

// Verifica el JWT de Supabase Auth en el servidor; sin exponer una service role key.
async function authenticated(request: Request): Promise<boolean> {
  const authorization = request.headers.get('authorization') ?? '';
  if (!/^Bearer\s+\S+$/i.test(authorization) || !supabaseUrl) return false;
  const publicKey = (request.headers.get('apikey') ?? '').trim() ||
    (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim() ||
    (Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '').trim();
  if (!publicKey) return false;
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: { apikey: publicKey, Authorization: authorization },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return false;
    const user = await response.json();
    return typeof user?.id === 'string' && user.id.length > 0;
  } catch {
    return false;
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  const groqKey = (Deno.env.get('GROQ_API_KEY') ?? '').trim();
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  // Comprobacion publica limitada: permite verificar el despliegue sin mostrar secretos.
  if (request.method === 'GET') return respond({ ok: true, service: 'naxvo-help-bot', groq_configured: !!groqKey });
  if (request.method !== 'POST') return respond({ code: 'method_not_allowed', message: 'Metodo no permitido.' }, 405);

  if (!(await authenticated(request))) {
    return respond({ code: 'unauthorized', message: 'Inicia sesion de nuevo para usar NAXVO Assist.' }, 401);
  }
  const payload = await request.json().catch(() => null);
  const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
  if (!message || message.length > 1800) {
    return respond({ code: 'invalid_message', message: 'Escribe una pregunta de hasta 1800 caracteres.' }, 400);
  }
  if (!groqKey) {
    return respond({ code: 'groq_not_configured', message: 'Falta configurar el secreto GROQ_API_KEY en Supabase.' }, 503);
  }

  const history = Array.isArray(payload?.history) ? payload.history.slice(-8)
    .filter((item: any) => (item?.role === 'user' || item?.role === 'assistant') && typeof item?.content === 'string')
    .map((item: any) => ({ role: item.role, content: item.content.slice(0, 1200) })) : [];
  const simple = payload?.simple_language === true;
  const screen = typeof payload?.screen === 'string' ? payload.screen.slice(0, 80) : 'general';
  const system = [
    'Eres NAXVO Assist, el asistente oficial de la aplicacion NAXVO para conectar clientes y profesionales de servicios.',
    'Responde en espanol de Mexico de forma clara, util, natural y directamente relacionada con la pregunta.',
    'Puedes orientar sobre contratar, publicar servicios, solicitudes, cotizaciones, favoritos, perfil, verificaciones, pagos, trabajo y administracion.',
    'No inventes datos personales, cotizaciones, estados de pagos, tarifas exactas ni detalles internos de la base de datos.',
    'No puedes consultar documentos de identidad, contrasenas ni operaciones privadas desde esta conversacion.',
    'Nunca respondas con la misma bienvenida repetida; sigue el hilo de la conversacion.',
    `Seccion actual: ${screen}.`,
    simple ? 'Explica con palabras sencillas y frases cortas.' : '',
  ].filter(Boolean).join(' ');

  let result: Response;
  try {
    result = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 520,
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: message }],
      }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    console.error('Groq connection:', error instanceof Error ? error.name : 'unknown');
    return respond({ code: 'groq_unreachable', message: 'No se pudo contactar a la IA. Intenta otra vez.' }, 502);
  }
  if (!result.ok) {
    console.error('Groq status:', result.status);
    const messageForUser = result.status === 429
      ? 'Groq alcanzo su limite temporal de uso. Intenta mas tarde.'
      : result.status === 401 || result.status === 403
        ? 'La clave de Groq no esta autorizada. Hay que verificar el secreto del servidor.'
        : 'Groq no pudo generar una respuesta. Intenta otra vez.';
    return respond({ code: 'groq_error', message: messageForUser }, result.status === 429 ? 429 : 502);
  }
  try {
    const output = await result.json();
    const reply = typeof output?.choices?.[0]?.message?.content === 'string'
      ? output.choices[0].message.content.trim() : '';
    if (!reply) return respond({ code: 'groq_empty', message: 'La IA no devolvio texto. Intenta otra vez.' }, 502);
    return respond({ mode: 'ai', intent: 'assistant', reply, suggestions: [], action: null });
  } catch {
    return respond({ code: 'groq_invalid_response', message: 'La IA devolvio una respuesta invalida.' }, 502);
  }
});
