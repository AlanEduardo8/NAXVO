// Prueba de contrato sin claves privadas ni conexiones externas.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
let handler;
const settings = { GROQ_API_KEY: 'test-only', GROQ_MODEL: 'openai/gpt-oss-120b', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: '', SUPABASE_PUBLISHABLE_KEY: '' };
globalThis.Deno = { env: {get: n => settings[n] ?? ''}, serve: cb => { handler = cb; } };
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/auth/v1/user')) {
    assert.equal(init.headers.apikey, 'publishable-test');
    return Response.json({id:'user-test'});
  }
  if (String(url).includes('api.groq.com')) {
    const body = JSON.parse(init.body);
    assert.equal(body.messages.at(-1).content,'¿Cómo funciona NAXVO?');
    return Response.json({choices:[{message:{content:'NAXVO conecta clientes con profesionales.'}}]});
  }
  throw Error('unexpected fetch: '+url);
};
await import(pathToFileURL(resolve('supabase/functions/help-bot/index.ts')).href);
assert.equal(typeof handler,'function');
const url='https://example.supabase.co/functions/v1/help-bot';
let res=await handler(new Request(url,{method:'OPTIONS',headers:{Origin:'http://localhost:8081','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,apikey,content-type'}}));
assert.equal(res.status,200);
assert.equal(res.headers.get('access-control-allow-origin'),'*');
res=await handler(new Request(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':'publishable-test'},body:JSON.stringify({message:'hola'})}));
assert.equal(res.status,401);
res=await handler(new Request(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':'publishable-test','Authorization':'Bearer user-jwt-test'},body:JSON.stringify({message:'¿Cómo funciona NAXVO?'})}));
assert.equal(res.status,200);
assert.match((await res.json()).reply, /conecta clientes/);
console.log('PASS: CORS OPTIONS, autorizacion y respuesta generativa simulada');
