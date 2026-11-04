# NAXVO - Activa help-bot en el MISMO proyecto Supabase configurado por el APK.
# No modifica tablas, usuarios, pagos, pantalla ni clave publica del movil.
# No imprime ni incluye GROQ_API_KEY en la app. Compatible con Windows PowerShell 5.1.
param(
    [string]$LegacyBackendEnv = '',
    [string]$LegacyZip = ''
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $PSScriptRoot
$MobileEnv = Join-Path $Root 'mobile\.env'
$Function = Join-Path $Root 'supabase\functions\help-bot\index.ts'

function Read-EnvValue([string]$Text, [string]$Name) {
    foreach ($line in ($Text -split "`r?`n")) {
        if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=\s*(.*)$')) {
            $value = $Matches[1].Trim()
            if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            return $value
        }
    }
    return ''
}
function Read-LegacyZip([string]$Path) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $file = $archive.Entries | Where-Object { $_.FullName -match '(^|/)backend/\.env$' } | Select-Object -First 1
        if ($null -eq $file) { return '' }
        $stream = $file.Open()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8)
        try { return $reader.ReadToEnd() } finally { $reader.Dispose(); $stream.Dispose() }
    } finally { $archive.Dispose() }
}
function Check-Exit([string]$Step) {
    if ($LASTEXITCODE -ne 0) { throw "Fallo: $Step. Revisa el mensaje de Supabase de arriba; no se modifico el movil." }
}

if (-not (Test-Path -LiteralPath $MobileEnv)) { throw "Falta mobile\.env. Se conserva el original; no lo reemplaces por otra URL." }
if (-not (Test-Path -LiteralPath $Function)) { throw 'Falta supabase\functions\help-bot\index.ts. Aplica primero el parche.' }
$publicText = [System.IO.File]::ReadAllText($MobileEnv)
$url = Read-EnvValue $publicText 'EXPO_PUBLIC_SUPABASE_URL'
$publicKey = Read-EnvValue $publicText 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
if ([string]::IsNullOrWhiteSpace($publicKey)) { throw 'Falta la clave PUBLICA en mobile\.env. No alteraremos tu configuracion.' }
if ($url -notmatch '^https://([a-z0-9]{15,30})\.supabase\.co/?$') { throw 'EXPO_PUBLIC_SUPABASE_URL no parece una URL publica valida de Supabase.' }
$ProjectRef = $Matches[1]
Write-Host ("Proyecto detectado directamente de mobile\.env: {0}" -f $ProjectRef) -ForegroundColor Cyan
Write-Host 'Se publicara SOLO help-bot en ese proyecto. No se modifica la base ni Mercado Pago.'

$sourceText = ''
$sourceName = ''
$possibleEnv = @($LegacyBackendEnv, (Join-Path $Root 'backend\.env'), 'C:\xampp\htdocs\NAXVO_Movil\backend\.env', 'C:\NAXVO\NAXVO_Movil\backend\.env')
foreach ($p in $possibleEnv) {
    if (-not [string]::IsNullOrWhiteSpace($p) -and (Test-Path -LiteralPath $p -PathType Leaf)) {
        $sourceText = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $p).Path)
        $sourceName = 'backend/.env existente en tu computadora'
        break
    }
}
if (-not $sourceText) {
    $possibleZips = @($LegacyZip, (Join-Path $Root 'NAXVO.zip'), 'C:\NAXVO\NAXVO.zip', (Join-Path $HOME 'Downloads\NAXVO.zip'))
    foreach ($p in $possibleZips) {
        if (-not [string]::IsNullOrWhiteSpace($p) -and (Test-Path -LiteralPath $p -PathType Leaf)) {
            $sourceText = Read-LegacyZip $p
            if ($sourceText) { $sourceName = 'backend/.env del ZIP original'; break }
        }
    }
}
$groqKey = if ($sourceText) { Read-EnvValue $sourceText 'GROQ_API_KEY' } else { '' }
$groqModel = if ($sourceText) { Read-EnvValue $sourceText 'GROQ_MODEL' } else { '' }
if ([string]::IsNullOrWhiteSpace($groqModel)) { $groqModel = 'openai/gpt-oss-120b' }
if ($groqKey -match "[`r`n]") { throw 'El secreto encontrado tiene un formato inesperado.' }
if ($groqModel -match "[`r`n]") { throw 'GROQ_MODEL contiene caracteres no permitidos.' }

Push-Location $Root
try {
    # Usamos --project-ref explicitamente: nunca se desplegara por error en otro proyecto vinculado.
    if ($groqKey) {
        Write-Host "Clave de Groq localizada en $sourceName. Se configurara como secreto privado." -ForegroundColor Green
        $temp = Join-Path ([System.IO.Path]::GetTempPath()) ('naxvo_' + [guid]::NewGuid().ToString('N') + '.env')
        try {
            $secretContent = "GROQ_API_KEY=$groqKey`nGROQ_MODEL=$groqModel`n"
            [System.IO.File]::WriteAllText($temp, $secretContent, ([System.Text.UTF8Encoding]::new($false)))
            & npx supabase secrets set --env-file "$temp" --project-ref "$ProjectRef"
            Check-Exit 'configuracion privada de Groq'
        } finally {
            if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force }
            $secretContent = ''
        }
    } else {
        Write-Host 'No se encontro GROQ_API_KEY en archivos locales. Comprobando si ya esta en los secretos remotos...' -ForegroundColor Yellow
        $secretNames = (& npx supabase secrets list --project-ref "$ProjectRef" 2>&1 | Out-String)
        Check-Exit 'consulta de nombres de secretos'
        if ($secretNames -notmatch '(?m)\bGROQ_API_KEY\b') {
            throw 'No existe clave de Groq local ni remota. Conserva el backend/.env original y ejecuta con -LegacyBackendEnv, o usa -LegacyZip apuntando a NAXVO.zip. No pongas la clave en mobile/.env.'
        }
        Write-Host 'GROQ_API_KEY ya esta configurada en Supabase. No se modificara.' -ForegroundColor Green
    }
    Write-Host 'Publicando help-bot mediante Supabase CLI, sin Docker...' -ForegroundColor Cyan
    # Se omite la verificacion JWT DEL GATEWAY para admitir publishable keys;
    # la funcion valida siempre el JWT del usuario ante Supabase Auth.
    & npx supabase functions deploy help-bot --project-ref "$ProjectRef" --no-verify-jwt --use-api
    Check-Exit 'despliegue de help-bot'
    Write-Host ''
    Write-Host 'DESPLIEGUE COMPLETADO. Se conserva la URL/clave publica original.' -ForegroundColor Green
    Write-Host ("API: https://{0}.supabase.co/functions/v1/help-bot" -f $ProjectRef)
    Write-Host 'Reinicia Expo con: cd mobile ; npx expo start --clear'
    Write-Host 'Inicia sesion y pregunta algo distinto al asistente para probar una respuesta real.'
} finally { Pop-Location }
