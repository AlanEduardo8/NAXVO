const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const LEGACY_MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? '';
const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_CLIENT_ID') ?? '';
const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET') ?? '';
const RETURN_URL = Deno.env.get('NAXVO_RETURN_URL') ?? '';
const COMMISSION_RATE = 0.10;

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
async function decode(res: Response) { const text = await res.text(); if (!text) return null; try { return JSON.parse(text); } catch { return { message: text }; } }
async function currentAuthUser(req: Request) { const authorization = req.headers.get('Authorization') ?? ''; if (!authorization.startsWith('Bearer ')) throw new Error('unauthorized'); const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: authorization, Accept: 'application/json' } }); const body = await decode(res); if (!res.ok || !body?.id) throw new Error('unauthorized'); return body; }
function serviceHeaders(extra: Record<string, string> = {}) { return { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, Accept: 'application/json', ...extra }; }
async function serviceGet(path: string) { const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: serviceHeaders() }); const body = await decode(res); if (!res.ok) throw new Error(body?.message ?? 'database_error'); return body; }
async function serviceWrite(path: string, method: 'POST' | 'PATCH', body: unknown, prefer = 'return=representation') { const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers: serviceHeaders({ 'Content-Type': 'application/json', Prefer: prefer }), body: JSON.stringify(body) }); const payload = await decode(res); if (!res.ok) throw new Error(payload?.message ?? 'database_error'); return payload; }
function money(value:number){return Math.round((value + Number.EPSILON) * 100) / 100;}
function mapMpState(status?: string) { switch (status) { case 'approved': return 'pagado'; case 'rejected': return 'fallido'; case 'cancelled': return 'cancelado'; case 'refunded': case 'charged_back': return 'reembolsado'; case 'in_process': case 'in_mediation': return 'procesando'; case 'pending': default: return 'pendiente'; } }

async function sellerAccessToken(workerId:number){
  const rows=await serviceGet(`mercadopago_cuentas?usuario_id=eq.${workerId}&select=*&limit=1`);
  const account=rows?.[0];
  if(!account?.access_token) throw new Error('El profesional debe vincular su cuenta de Mercado Pago antes de recibir pagos.');
  const expires=account.expires_at?new Date(account.expires_at).getTime():0;
  if(expires && expires>Date.now()+60_000)return {token:String(account.access_token),sellerId:String(account.provider_user_id??'')};
  if(!account.refresh_token||!MP_CLIENT_ID||!MP_CLIENT_SECRET)return {token:String(account.access_token),sellerId:String(account.provider_user_id??'')};
  const res=await fetch('https://api.mercadopago.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({client_id:MP_CLIENT_ID,client_secret:MP_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:account.refresh_token})});
  const refreshed=await decode(res);
  if(!res.ok||!refreshed?.access_token)throw new Error('La vinculación de Mercado Pago del profesional expiró. Debe volver a vincularla.');
  const expiresAt=new Date(Date.now()+Number(refreshed.expires_in??15552000)*1000).toISOString();
  await serviceWrite(`mercadopago_cuentas?usuario_id=eq.${workerId}`,'PATCH',{access_token:String(refreshed.access_token),refresh_token:refreshed.refresh_token?String(refreshed.refresh_token):account.refresh_token,public_key:refreshed.public_key?String(refreshed.public_key):account.public_key,provider_user_id:String(refreshed.user_id??account.provider_user_id??''),expires_at:expiresAt,fecha_actualizacion:new Date().toISOString()},'return=minimal');
  return {token:String(refreshed.access_token),sellerId:String(refreshed.user_id??account.provider_user_id??'')};
}

async function syncPayment(paymentId: string, requestId: number, workerId:number, split:boolean) {
  let token='';
  if(split){ token=(await sellerAccessToken(workerId)).token; } else { token=LEGACY_MP_ACCESS_TOKEN; }
  if(!token) return { ok: false, reason: 'not_configured' };
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` } });
  const mp = await decode(mpRes);
  if (!mpRes.ok) return { ok: false, reason: 'provider_error' };
  const external = String(mp?.external_reference ?? '');
  if (!external.includes(`-${requestId}-`) && external !== `NAXVO-${requestId}`) return { ok: false, reason: 'reference_mismatch' };
  const state = mapMpState(mp?.status);
  const paidAt = state === 'pagado' ? (mp?.date_approved ?? new Date().toISOString()) : null;
  await serviceWrite(`pagos?provider_payment_id=eq.${encodeURIComponent(String(mp.id))}`, 'PATCH', { estado: state, provider_status: mp?.status ?? null, provider_status_detail: mp?.status_detail ?? null, fecha_pago: paidAt, fecha_actualizacion: new Date().toISOString() }, 'return=minimal');
  if (state === 'pagado') await serviceWrite(`solicitudes?id=eq.${requestId}`, 'PATCH', { estado_pago: 'pagado', pagado: true, transaction_id: String(mp.id), fecha_pago: paidAt }, 'return=minimal');
  else if (['fallido', 'cancelado', 'reembolsado'].includes(state)) await serviceWrite(`solicitudes?id=eq.${requestId}`, 'PATCH', { estado_pago: state, pagado: false }, 'return=minimal');
  return { ok: true, state };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ message: 'Método no permitido.' }, 405);
  try {
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE) return json({ message: 'Supabase Edge Functions no está configurado.' }, 500);
    const authUser = await currentAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? 'create');
    const requestId = Number(body?.request_id ?? 0);
    if (!requestId) return json({ message: 'Solicitud inválida.' }, 400);

    const profiles = await serviceGet(`usuarios?auth_user_id=eq.${encodeURIComponent(authUser.id)}&select=id,tipo,estado_cuenta&limit=1`);
    const profile = profiles?.[0];
    if (!profile || profile.estado_cuenta !== 'activo') return json({ message: 'Cuenta no disponible.' }, 403);
    const requests = await serviceGet(`solicitudes?id=eq.${requestId}&select=*&limit=1`);
    const serviceRequest = requests?.[0];
    if (!serviceRequest) return json({ message: 'Solicitud no encontrada.' }, 404);
    if (![Number(serviceRequest.cliente_id), Number(serviceRequest.trabajador_id)].includes(Number(profile.id))) return json({ message: 'No tienes acceso a este pago.' }, 403);

    if (action === 'refresh') {
      const attempts = await serviceGet(`pagos?solicitud_id=eq.${requestId}&metodo=eq.mercadopago&select=*&order=fecha_creacion.desc&limit=1`);
      const attempt = attempts?.[0];
      if (!attempt) return json({ ok: false, reason: 'no_attempt' });
      if (attempt.provider_payment_id) return json(await syncPayment(String(attempt.provider_payment_id), requestId, Number(attempt.trabajador_id||serviceRequest.trabajador_id||0), Boolean(attempt.split_aplicado)));
      const token=attempt.split_aplicado?(await sellerAccessToken(Number(attempt.trabajador_id||serviceRequest.trabajador_id||0))).token:LEGACY_MP_ACCESS_TOKEN;
      if (!token) return json({ ok: false, reason: 'not_configured' });
      if (attempt.external_reference) {
        const searchRes = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(String(attempt.external_reference))}&sort=date_created&criteria=desc`, { headers: { Authorization: `Bearer ${token}` } });
        const search = await decode(searchRes); const found = searchRes.ok && Array.isArray(search?.results) ? search.results[0] : null;
        if (found?.id) { await serviceWrite(`pagos?id=eq.${attempt.id}`, 'PATCH', { provider_payment_id: String(found.id), fecha_actualizacion: new Date().toISOString() }, 'return=minimal'); return json(await syncPayment(String(found.id), requestId, Number(attempt.trabajador_id||serviceRequest.trabajador_id||0), Boolean(attempt.split_aplicado))); }
      }
      return json({ ok: false, reason: 'no_payment_id' });
    }

    if (action !== 'create') return json({ message: 'Acción inválida.' }, 400);
    if (Number(serviceRequest.cliente_id) !== Number(profile.id)) return json({ message: 'Solo el cliente puede iniciar el pago.' }, 403);
    if (serviceRequest.metodo_pago !== 'mercadopago') return json({ message: 'La solicitud no usa Mercado Pago.' }, 409);
    if (serviceRequest.cotizacion_estado !== 'aceptada') return json({ message: 'Acepta la cotización antes de pagar.' }, 409);
    if (serviceRequest.estado_pago === 'pagado') return json({ message: 'Esta solicitud ya está pagada.' }, 409);
    const workerId=Number(serviceRequest.trabajador_id||0);
    if(!workerId)return json({message:'La solicitud todavía no tiene profesional asignado.'},409);
    const seller=await sellerAccessToken(workerId);

    const existing = await serviceGet(`pagos?solicitud_id=eq.${requestId}&metodo=eq.mercadopago&split_aplicado=eq.true&estado=in.(creado,pendiente,procesando)&select=*&order=fecha_creacion.desc&limit=1`);
    const old = existing?.[0];
    if (old?.checkout_url) return json({ request_id: requestId, checkout_url: old.checkout_url, simulation: false, reused: true, attempt_id: Number(old.id), public_callbacks: Boolean(RETURN_URL) });

    const amount = Number(serviceRequest.presupuesto ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return json({ message: 'El monto aceptado no es válido.' }, 409);
    const commission=money(amount*COMMISSION_RATE);
    const workerAmount=money(amount-commission);
    const externalReference = `NAXVO-${requestId}-${crypto.randomUUID()}`;
    const webhookUrl = `${SUPABASE_URL}/functions/v1/mercadopago-webhook`;
    const preference: Record<string, unknown> = {
      items: [{ title: `NAXVO · ${serviceRequest.servicio}`, quantity: 1, currency_id: 'MXN', unit_price: amount }],
      marketplace_fee: commission,
      external_reference: externalReference,
      notification_url: webhookUrl,
      metadata: { naxvo_request_id: requestId, naxvo_commission_rate: COMMISSION_RATE, naxvo_commission: commission, naxvo_worker_amount: workerAmount },
      statement_descriptor: 'NAXVO',
    };
    if (RETURN_URL && /^https:\/\//i.test(RETURN_URL)) { preference.back_urls = { success: `${RETURN_URL}?request_id=${requestId}&result=success`, pending: `${RETURN_URL}?request_id=${requestId}&result=pending`, failure: `${RETURN_URL}?request_id=${requestId}&result=failure` }; preference.auto_return = 'approved'; }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { Authorization: `Bearer ${seller.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(preference) });
    const mp = await decode(mpRes);
    if (!mpRes.ok || !mp?.id) return json({ message: mp?.message ?? 'Mercado Pago no pudo crear el checkout.' }, 502);
    const checkoutUrl = String(mp.init_point ?? mp.sandbox_init_point ?? '');
    if (!checkoutUrl) return json({ message: 'Mercado Pago no devolvió una URL de checkout.' }, 502);

    const inserted = await serviceWrite('pagos', 'POST', {
      solicitud_id: requestId, cliente_id: serviceRequest.cliente_id, trabajador_id: workerId,
      metodo: 'mercadopago', proveedor: 'mercadopago', external_reference: externalReference,
      provider_preference_id: String(mp.id), monto: amount, moneda: 'MXN', estado: 'pendiente',
      checkout_url: checkoutUrl, sandbox: Boolean(mp.sandbox_init_point && !mp.init_point),
      comision_naxvo:commission,monto_trabajador:workerAmount,split_aplicado:true,provider_seller_id:seller.sellerId,
      metadata: { preference_id: mp.id, commission_rate:COMMISSION_RATE, commission, worker_amount:workerAmount },
    });
    await serviceWrite(`solicitudes?id=eq.${requestId}`, 'PATCH', { estado_pago: 'procesando' }, 'return=minimal');
    return json({ request_id: requestId, checkout_url: checkoutUrl, simulation: false, reused: false, attempt_id: Number(inserted?.[0]?.id ?? 0), public_callbacks: Boolean(RETURN_URL), commission_amount:commission, worker_amount:workerAmount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado.';
    if (message === 'unauthorized') return json({ message: 'Sesión no válida.' }, 401);
    return json({ message }, 500);
  }
});
