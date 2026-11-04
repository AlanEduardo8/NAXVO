const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_CLIENT_ID') ?? '';
const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET') ?? '';
const MP_REDIRECT_URI = Deno.env.get('MERCADOPAGO_REDIRECT_URI') ?? `${SUPABASE_URL}/functions/v1/mercadopago-connect`;
const APP_RETURN = Deno.env.get('NAXVO_MP_APP_RETURN') ?? 'naxvo://mercadopago-connected';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
function redirect(url:string){ return new Response(null,{status:302,headers:{Location:url,'Cache-Control':'no-store'}}); }
async function decode(res:Response){const t=await res.text();if(!t)return null;try{return JSON.parse(t)}catch{return {message:t}}}
function serviceHeaders(extra:Record<string,string>={}){return {apikey:SERVICE_ROLE,Authorization:`Bearer ${SERVICE_ROLE}`,Accept:'application/json',...extra}}
async function db(path:string,init:RequestInit={}){const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:serviceHeaders(init.headers as Record<string,string>|undefined)});const body=await decode(res);if(!res.ok)throw new Error(body?.message??'database_error');return body}
async function currentAuthUser(req:Request){const authorization=req.headers.get('Authorization')??'';if(!authorization.startsWith('Bearer '))throw new Error('unauthorized');const res=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:ANON_KEY,Authorization:authorization,Accept:'application/json'}});const body=await decode(res);if(!res.ok||!body?.id)throw new Error('unauthorized');return body}
async function profileForAuth(authId:string){const rows=await db(`usuarios?auth_user_id=eq.${encodeURIComponent(authId)}&select=id,tipo,estado_cuenta&limit=1`);return rows?.[0]}
function appResult(success:boolean,error=''){const u=new URL(APP_RETURN);u.searchParams.set('success',success?'1':'0');if(error)u.searchParams.set('error',error.slice(0,160));return u.toString()}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    if(!SUPABASE_URL||!ANON_KEY||!SERVICE_ROLE)return json({message:'Supabase Edge Functions no está configurado.'},500);
    if(!MP_CLIENT_ID||!MP_CLIENT_SECRET)return json({message:'Faltan MERCADOPAGO_CLIENT_ID y MERCADOPAGO_CLIENT_SECRET.'},503);

    const url=new URL(req.url);
    if(req.method==='GET'){
      const code=url.searchParams.get('code')??'';
      const state=url.searchParams.get('state')??'';
      const providerError=url.searchParams.get('error')??'';
      if(providerError)return redirect(appResult(false,providerError));
      if(!code||!state)return redirect(appResult(false,'Código OAuth incompleto'));

      const states=await db(`mercadopago_oauth_states?state=eq.${encodeURIComponent(state)}&select=*&limit=1`);
      const record=states?.[0];
      if(!record||record.usado||new Date(record.expires_at).getTime()<Date.now())return redirect(appResult(false,'La autorización expiró'));

      const tokenRes=await fetch('https://api.mercadopago.com/oauth/token',{
        method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({client_id:MP_CLIENT_ID,client_secret:MP_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:MP_REDIRECT_URI}),
      });
      const token=await decode(tokenRes);
      if(!tokenRes.ok||!token?.access_token)return redirect(appResult(false,token?.message??'Mercado Pago rechazó la autorización'));
      const expiresIn=Number(token.expires_in??15552000);
      const expiresAt=new Date(Date.now()+Math.max(60,expiresIn)*1000).toISOString();
      await db('mercadopago_cuentas?on_conflict=usuario_id',{
        method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify({usuario_id:record.usuario_id,provider_user_id:String(token.user_id??''),access_token:String(token.access_token),refresh_token:token.refresh_token?String(token.refresh_token):null,public_key:token.public_key?String(token.public_key):null,token_type:token.token_type?String(token.token_type):null,scope:token.scope?String(token.scope):null,expires_at:expiresAt,fecha_actualizacion:new Date().toISOString()}),
      });
      await db(`mercadopago_oauth_states?state=eq.${encodeURIComponent(state)}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({usado:true})});
      return redirect(appResult(true));
    }

    if(req.method!=='POST')return json({message:'Método no permitido.'},405);
    const auth=await currentAuthUser(req);
    const profile=await profileForAuth(auth.id);
    if(!profile||profile.tipo!=='trabajador'||profile.estado_cuenta!=='activo')return json({message:'Solo un profesional activo puede vincular Mercado Pago.'},403);
    const body=await req.json().catch(()=>({}));
    const action=String(body?.action??'status');

    if(action==='status'){
      const rows=await db(`mercadopago_cuentas?usuario_id=eq.${profile.id}&select=provider_user_id,expires_at,fecha_conexion&limit=1`);
      const account=rows?.[0];
      return json({connected:Boolean(account),provider_user_id:account?.provider_user_id??null,expires_at:account?.expires_at??null,connected_at:account?.fecha_conexion??null});
    }
    if(action==='disconnect'){
      await db(`mercadopago_cuentas?usuario_id=eq.${profile.id}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
      return json({disconnected:true});
    }
    if(action==='authorize'){
      const state=crypto.randomUUID();
      await db('mercadopago_oauth_states',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({state,usuario_id:profile.id,expires_at:new Date(Date.now()+10*60*1000).toISOString()})});
      const authUrl=new URL('https://auth.mercadopago.com/authorization');
      authUrl.searchParams.set('client_id',MP_CLIENT_ID);
      authUrl.searchParams.set('response_type','code');
      authUrl.searchParams.set('platform_id','mp');
      authUrl.searchParams.set('state',state);
      authUrl.searchParams.set('redirect_uri',MP_REDIRECT_URI);
      return json({authorization_url:authUrl.toString()});
    }
    return json({message:'Acción inválida.'},400);
  }catch(error){const message=error instanceof Error?error.message:'Error inesperado.';if(message==='unauthorized')return json({message:'Sesión no válida.'},401);return json({message},500)}
});
