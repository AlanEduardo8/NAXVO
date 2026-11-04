const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-signature, x-request-id' };
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const LEGACY_MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? '';
const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_CLIENT_ID') ?? '';
const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET') ?? '';
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
async function decode(res: Response) { const t = await res.text(); if (!t) return null; try { return JSON.parse(t); } catch { return { message: t }; } }
function serviceHeaders(extra: Record<string, string> = {}) { return { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, Accept: 'application/json', ...extra }; }
async function db(path: string, init: RequestInit = {}) { const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: serviceHeaders(init.headers as Record<string, string> | undefined) }); const body = await decode(res); if (!res.ok) throw new Error(body?.message ?? 'database_error'); return body; }
function mapState(status?: string) { if (status === 'approved') return 'pagado'; if (status === 'rejected') return 'fallido'; if (status === 'cancelled') return 'cancelado'; if (status === 'refunded' || status === 'charged_back') return 'reembolsado'; if (status === 'in_process' || status === 'in_mediation') return 'procesando'; return 'pendiente'; }
async function sellerToken(workerId:number){const rows=await db(`mercadopago_cuentas?usuario_id=eq.${workerId}&select=*&limit=1`);const a=rows?.[0];if(!a?.access_token)throw new Error('seller_not_connected');const expires=a.expires_at?new Date(a.expires_at).getTime():0;if(!expires||expires>Date.now()+60_000)return String(a.access_token);if(!a.refresh_token||!MP_CLIENT_ID||!MP_CLIENT_SECRET)return String(a.access_token);const res=await fetch('https://api.mercadopago.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:MP_CLIENT_ID,client_secret:MP_CLIENT_SECRET,grant_type:'refresh_token',refresh_token:a.refresh_token})});const t=await decode(res);if(!res.ok||!t?.access_token)throw new Error('seller_token_expired');await db(`mercadopago_cuentas?usuario_id=eq.${workerId}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({access_token:String(t.access_token),refresh_token:t.refresh_token?String(t.refresh_token):a.refresh_token,provider_user_id:String(t.user_id??a.provider_user_id??''),expires_at:new Date(Date.now()+Number(t.expires_in??15552000)*1000).toISOString(),fecha_actualizacion:new Date().toISOString()})});return String(t.access_token)}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) return json({ ok: false, reason: 'not_configured' }, 503);
    const url = new URL(req.url); const body = await req.json().catch(() => ({}));
    const topic = url.searchParams.get('type') ?? body?.type ?? ''; const paymentId = String(url.searchParams.get('data.id') ?? body?.data?.id ?? body?.id ?? '');
    if (!paymentId || (topic && topic !== 'payment')) return json({ ok: true, ignored: true });

    // Primero intentamos ubicar el intento por provider_payment_id. Si la primera
    // notificación llega antes de que ese campo exista, usamos el payment id para
    // obtener el external_reference probando las cuentas de los intentos recientes.
    let attempts=await db(`pagos?provider_payment_id=eq.${encodeURIComponent(paymentId)}&select=*&limit=1`);
    let attempt=attempts?.[0]; let mp:any=null; let token='';
    if(attempt){token=attempt.split_aplicado?await sellerToken(Number(attempt.trabajador_id)):LEGACY_MP_ACCESS_TOKEN;if(!token)return json({ok:false,reason:'not_configured'},503);const r=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,{headers:{Authorization:`Bearer ${token}`}});mp=await decode(r);if(!r.ok||!mp?.id)return json({ok:false,reason:'provider_lookup_failed'},502)}
    else {
      const recent=await db('pagos?metodo=eq.mercadopago&select=*&order=fecha_creacion.desc&limit=40');
      for(const candidate of recent??[]){try{const candidateToken=candidate.split_aplicado?await sellerToken(Number(candidate.trabajador_id)):LEGACY_MP_ACCESS_TOKEN;if(!candidateToken)continue;const r=await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,{headers:{Authorization:`Bearer ${candidateToken}`}});if(!r.ok)continue;const found=await decode(r);if(found?.id&&String(found.external_reference??'')===String(candidate.external_reference??'')){attempt=candidate;mp=found;token=candidateToken;break}}catch{/* prueba siguiente cuenta */}}
    }
    if(!attempt||!mp)return json({ok:true,ignored:true,reason:'unknown_reference'});
    const requestId=Number(attempt.solicitud_id);const state=mapState(mp.status);const paidAt=state==='pagado'?(mp.date_approved??new Date().toISOString()):null;
    await db(`pagos?id=eq.${attempt.id}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({provider_payment_id:String(mp.id),provider_status:mp.status??null,provider_status_detail:mp.status_detail??null,estado:state,fecha_pago:paidAt,fecha_actualizacion:new Date().toISOString()})});
    const requestUpdate:Record<string,unknown>={estado_pago:state,pagado:state==='pagado'};if(state==='pagado'){requestUpdate.transaction_id=String(mp.id);requestUpdate.fecha_pago=paidAt}await db(`solicitudes?id=eq.${requestId}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(requestUpdate)});
    if(state==='pagado'){const requestRows=await db(`solicitudes?id=eq.${requestId}&select=cliente_id,trabajador_id&limit=1`);const r=requestRows?.[0];if(r)await db('notificaciones',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify([{usuario_id:r.cliente_id,actor_id:null,solicitud_id:requestId,tipo:'pago_confirmado',titulo:'Pago confirmado',mensaje:'Mercado Pago confirmó el pago y aplicó la distribución de NAXVO.'},...(r.trabajador_id?[{usuario_id:r.trabajador_id,actor_id:null,solicitud_id:requestId,tipo:'pago_confirmado',titulo:'Pago confirmado',mensaje:'Tu pago fue confirmado. Mercado Pago procesó la distribución del servicio.'}]:[])])})}
    return json({ok:true,payment_id:String(mp.id),state});
  } catch (error) { return json({ ok: false, message: error instanceof Error ? error.message : 'Error inesperado.' }, 500); }
});
