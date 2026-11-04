# NAXVO: reutiliza las credenciales PRIVADAS existentes sin escribirlas en el APK.
# No cambia mobile/.env, no ejecuta SQL ni modifica datos.
# Compatible con Windows PowerShell 5.1.
param(
    [string]$OriginalEnv = '',
    [string]$OriginalZip = '',
    [switch]$PublicarFunciones,
    [switch]$SoloVerificar
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $PSScriptRoot

function Read-EnvValue([string]$Content, [string]$Name) {
    foreach ($line in ($Content -split "`r?`n")) {
        if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=\s*(.*)$')) {
            $value = $Matches[1].Trim()
            if ($value.Length -ge 2 -and ((($value[0] -eq '"') -and ($value[$value.Length-1] -eq '"')) -or (($value[0] -eq "'") -and ($value[$value.Length-1] -eq "'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            return $value
        }
    }
    return ''
}
function Read-ZipBackendEnv([string]$Path) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $entry = $archive.Entries | Where-Object { $_.FullName -match '(^|/)backend/\.env$' } | Select-Object -First 1
        if ($null -eq $entry) { return '' }
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        try { return $reader.ReadToEnd() }
        finally { $reader.Dispose(); $stream.Dispose() }
    }
    finally { $archive.Dispose() }
}
function Invoke-CLI([string[]]$Arguments, [string]$Step) {
    # En Windows PowerShell 5.1, stderr de npx puede lanzarse como NativeCommandError.
    # Capturar la salida evita abortar sin explicar el error 403.
    $prior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $result = (& npx @Arguments 2>&1 | Out-String); $code = $LASTEXITCODE }
    finally { $ErrorActionPreference = $prior }
    if ($code -ne 0) {
        if ($result -match '403|necessary privileges|access.control') {
            throw "Supabase devolvio 403 al intentar $Step. La cuenta CLI necesita permisos sobre el proyecto configurado por NAXVO. No cambies claves ni proyecto."
        }
        throw "No se pudo completar $Step (salida $code). Revisa tu sesion CLI, conexion a internet y permisos."
    }
    return $result
}
function Safe-Value([string]$Value, [string]$Name) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Contains("`r") -or $Value.Contains("`n") -or $Value.Contains([char]0)) {
        throw "El valor original de $Name no es valido o esta vacio."
    }
    return $Value
}

$mobileEnv = Join-Path $Root 'mobile\.env'
if (-not (Test-Path -LiteralPath $mobileEnv -PathType Leaf)) { throw 'No se encontro mobile\.env; ejecuta desde la raiz correcta del proyecto.' }
$mobileText = [IO.File]::ReadAllText($mobileEnv)
$baseUrl = Read-EnvValue $mobileText 'EXPO_PUBLIC_SUPABASE_URL'
if ($baseUrl -notmatch '^https://([a-z0-9]{15,30})\.supabase\.co/?$') { throw 'No se identifico el proyecto desde EXPO_PUBLIC_SUPABASE_URL. No se cambiara la URL.' }
$ProjectRef = $Matches[1]
Write-Host ('Proyecto que YA utiliza tu app: ' + $ProjectRef) -ForegroundColor Cyan
Write-Host 'Sin cambios en mobile/.env, base de datos, cuentas o diseno.'

# Nunca desplegar en un proyecto distinto: validar que tu sesion CLI puede acceder.
Write-Host 'Verificando permisos de la cuenta de Supabase CLI...' -ForegroundColor Cyan
$projectList = Invoke-CLI @('supabase', 'projects', 'list') 'consultar proyectos'
if ($projectList -notmatch [regex]::Escape($ProjectRef)) {
    throw ('La cuenta actual de Supabase CLI no tiene acceso al proyecto ' + $ProjectRef + '. El codigo y las claves NO pueden evitar un 403. Solicita permisos sobre ESTE proyecto; no cambies su URL.')
}

$sourceText = ''
$sourceKind = ''
$envPaths = @($OriginalEnv, (Join-Path $Root 'backend\.env'), 'C:\xampp\htdocs\NAXVO_Movil\backend\.env', 'C:\NAXVO\NAXVO_Movil\backend\.env')
foreach ($p in $envPaths) {
    if (-not [string]::IsNullOrWhiteSpace($p) -and (Test-Path -LiteralPath $p -PathType Leaf)) {
        $sourceText = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $p).Path)
        $sourceKind = 'backend/.env original'
        break
    }
}
if (-not $sourceText) {
    $zipPaths = @($OriginalZip, (Join-Path $Root 'NAXVO.zip'), 'C:\NAXVO\NAXVO.zip', (Join-Path $HOME 'Downloads\NAXVO.zip'))
    foreach ($p in $zipPaths) {
        if (-not [string]::IsNullOrWhiteSpace($p) -and (Test-Path -LiteralPath $p -PathType Leaf)) {
            $sourceText = Read-ZipBackendEnv $p
            if ($sourceText) { $sourceKind = 'NAXVO.zip original'; break }
        }
    }
}
if (-not $sourceText) {
    throw 'El ultimo ZIP movil NO contiene las claves privadas. Usa -OriginalEnv o -OriginalZip para leer las de la ultima version PHP, sin copiarlas al APK.'
}
$groq = Safe-Value (Read-EnvValue $sourceText 'GROQ_API_KEY') 'GROQ_API_KEY'
$mercado = Safe-Value (Read-EnvValue $sourceText 'MP_ACCESS_TOKEN') 'MP_ACCESS_TOKEN'
$modelo = Read-EnvValue $sourceText 'GROQ_MODEL'
$webhook = Read-EnvValue $sourceText 'MP_WEBHOOK_SECRET'
if ($modelo) { $modelo = Safe-Value $modelo 'GROQ_MODEL' }
if ($webhook) { $webhook = Safe-Value $webhook 'MP_WEBHOOK_SECRET' }
Write-Host ('Credenciales privadas localizadas en: ' + $sourceKind) -ForegroundColor Green
Write-Host 'Groq: encontrada; Mercado Pago: encontrado. No se muestran sus valores.' -ForegroundColor Green
if (-not $webhook) { Write-Host 'MP_WEBHOOK_SECRET no esta configurado en el archivo original. No se inventara un valor.' -ForegroundColor Yellow }
if ($SoloVerificar) { Write-Host 'SoloVerificar: no se modificaron secretos ni funciones remotas.'; exit 0 }

# Secretos remotos usando un archivo temporal fuera del proyecto y eliminado al finalizar.
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('naxvo-secret-' + [guid]::NewGuid().ToString('N') + '.env')
try {
    $lines = @('GROQ_API_KEY=' + $groq, 'MERCADOPAGO_ACCESS_TOKEN=' + $mercado)
    if ($modelo) { $lines += 'GROQ_MODEL=' + $modelo }
    if ($webhook) { $lines += 'MP_WEBHOOK_SECRET=' + $webhook }
    [IO.File]::WriteAllText($temporary, (($lines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding($false)))
    Push-Location $Root
    try {
        Write-Host 'Guardando las claves EXISTENTES solo en los secretos privados de Supabase...' -ForegroundColor Cyan
        [void](Invoke-CLI @('supabase', 'secrets', 'set', '--env-file', $temporary, '--project-ref', $ProjectRef) 'guardar secretos privados')
        Write-Host 'Secretos registrados. No se tocaron los archivos del movil.' -ForegroundColor Green
        if ($PublicarFunciones) {
            $functions = @('help-bot', 'mercadopago-checkout', 'mercadopago-webhook')
            foreach ($fn in $functions) {
                $index = Join-Path $Root ('supabase\functions\' + $fn + '\index.ts')
                if (-not (Test-Path -LiteralPath $index -PathType Leaf)) { throw "Falta el codigo de la funcion $fn." }
                Write-Host ('Desplegando: ' + $fn) -ForegroundColor Cyan
                [void](Invoke-CLI @('supabase', 'functions', 'deploy', $fn, '--project-ref', $ProjectRef, '--no-verify-jwt', '--use-api') ('despliegue ' + $fn))
            }
            Write-Host 'Funciones publicadas. Faltan pruebas reales de chat y pagos.' -ForegroundColor Green
        } else {
            Write-Host 'No se desplegaron funciones: para hacerlo, ejecuta con -PublicarFunciones.'
        }
    }
    finally { Pop-Location }
}
finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue }
    $groq = ''
    $mercado = ''
    $webhook = ''
    $sourceText = ''
}
