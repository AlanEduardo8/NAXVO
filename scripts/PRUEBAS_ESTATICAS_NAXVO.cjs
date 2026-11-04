// Pruebas sin conexión; no leen credenciales ni acceden a una base real.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('../mobile/node_modules/typescript');
const root = path.resolve(__dirname, '..');
const api = fs.readFileSync(path.join(root, 'mobile/src/api/index.ts'), 'utf8');
const form = fs.readFileSync(path.join(root, 'mobile/app/request/new.tsx'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'supabase/00_FULL_SETUP.sql'), 'utf8');
const assistantCode = fs.readFileSync(path.join(root, 'supabase/functions/help-bot/index.ts'), 'utf8');
const catalogCode = fs.readFileSync(path.join(root, 'mobile/src/lib/categoryCatalog.ts'), 'utf8');

function check(condition, description) { assert.ok(condition, description); console.log('OK:', description); }
async function main(){
  check(api.includes('return fallbackCategories'), 'Categorías base ante catálogo remoto vacío/error');
  check(form.includes('addLocation') && form.includes('reverseGeocodeAsync'), 'Solicitud conserva geolocalización inversa');
  check(form.includes('DatePickerField') && form.includes('TimePickerField'), 'Solicitud conserva calendario y hora');
  check(form.includes('uploadRequestImage') && form.includes('Agregar fotos'), 'Solicitud conserva adjuntos');
  check(['efectivo', 'mercadopago', 'tarjeta'].every(x => form.includes(`key:'${x}'`)), 'Solicitud conserva tres opciones de pago');
  check(api.includes("payload.metodo_pago === 'tarjeta' ? 'mercadopago'"), 'Tarjeta se normaliza para el checkout existente');
  check(!/catch\s*\{[\s\S]{0,800}return getHelpWelcome\(\);\s*\}/.test(api), 'Errores de IA no devuelven siempre bienvenida');
  check(sql.includes('naxvo_create_request') && sql.includes("'mercadopago'"), 'RPC de solicitudes declara flujo de Mercado Pago');
  check(!/https?:\/\/localhost|192\.168\./.test(fs.readFileSync(path.join(root,'mobile/src/lib/supabase.ts'),'utf8')), 'Cliente de Supabase sin URL local codificada');
  const categoryJS = ts.transpileModule(catalogCode, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const catalogModule={exports:{}};
  vm.runInNewContext(categoryJS,{exports:catalogModule.exports, module:catalogModule}, {filename:'categoryCatalog.js'});
  check(catalogModule.exports.fallbackCategories.length===8,'Ocho categorías base válidas');
  const source = ts.createSourceFile('index.ts', assistantCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  check(source.parseDiagnostics.length===0,'Edge Function de IA sin errores de sintaxis');
  const js = ts.transpileModule(assistantCode,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
  async function ask({message,configured=true,groqOk=true,authOk=true}) {
    let endpoint;
    const context = {
      Deno:{env:{get:(key) => ({GROQ_API_KEY:configured?'token-de-prueba':'',GROQ_MODEL:'openai/gpt-oss-120b',SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'clave-publica'}[key] ?? '')},serve:(fn)=>{endpoint=fn;}},
      Response,Request,Headers,AbortSignal,console,
      fetch:async url => {
        if(String(url).endsWith('/auth/v1/user')) return new Response(JSON.stringify(authOk?{id:'user-test'}:{message:'Unauthorized'}),{status:authOk?200:401,headers:{'Content-Type':'application/json'}});
        if(String(url).includes('api.groq.com')) return new Response(groqOk?JSON.stringify({choices:[{message:{content:'Respuesta específica de prueba'}}]}):JSON.stringify({error:'Quota'}),{status:groqOk?200:429,headers:{'Content-Type':'application/json'}});
        throw new Error('URL inesperada');
      }
    };
    vm.runInNewContext(js,context,{filename:'help-bot.js'});
    return endpoint(new Request('https://example.supabase.co/functions/v1/help-bot',{method:'POST',headers:{Authorization:'Bearer sesion-de-prueba','Content-Type':'application/json'},body:JSON.stringify({message})}));
  }
  let response=await ask({message:'¿Cómo puedo hacer una solicitud?',configured:false});
  check(response.status===503 && (await response.json()).code==='groq_not_configured','Sin clave Groq devuelve aviso y no una respuesta falsa');
  response=await ask({message:'¿Cómo funciona el pago?',groqOk:false});
  check(response.status===502 && (await response.json()).code==='groq_upstream_error','Errores Groq devuelven aviso específico');
  response=await ask({message:'Hola',authOk:false});
  check(response.status===401,'Se exige sesión válida antes de responder');
  response=await ask({message:'¿Cómo funcionan las solicitudes?'});
  check(response.status===200 && (await response.json()).mode==='ai','Con Groq simulado responde usando modo IA');
  console.log('PRUEBAS ESTÁTICAS Y SIMULADAS SUPERADAS');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
