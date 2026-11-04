# Ejecutar en Windows PowerShell por quien tenga acceso al proyecto de Supabase.
# Solo configura GROQ_API_KEY/GROQ_MODEL y publica help-bot. No cambia pagos, tablas ni APK.
param([string]$OriginalZip = '', [string]$BackendEnv = '')
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

function Find-Env([string]$Body, [string]$Var) {
    foreach($line in ($Body -split "`r?`n")) {
        if($line -match ('^\s*' + [regex]::Escape($Var) + '\s*=\s*(.*?)\s*$')) {
            $value = $Matches[1].Trim()
            if($value.Length -ge 2 -and (($value[0] -eq '"' -and $value[-1] -eq '"') -or ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
                $value = $value.Substring(1, $value.Length-2)
            }
            return $value
        }
    }
    return ''
}
function Get-OldZipEnv([string]$Path) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $z = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $entry = $z.Entries | Where-Object { $_.FullName -match '(^|/)backend/\.env$' } | Select-Object -First 1
        if($null -eq $entry) { return '' }
        $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8)
        try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
    } finally { $z.Dispose() }
}

$mobileEnv = Join-Path $Root 'mobile\.env'
$botFunction = Join-Path $Root 'supabase\functions\help-bot\index.ts'
if(-not (Test-Path -LiteralPath $mobileEnv)) { throw 'No se encontro mobile\.env del proyecto NAXVO. No se modifico nada.' }
if(-not (Test-Path -LiteralPath $botFunction)) { throw 'No se encontro help-bot/index.ts. Extrae el parche antes de continuar.' }
$text = [IO.File]::ReadAllText($mobileEnv)
$url = Find-Env $text 'EXPO_PUBLIC_SUPABASE_URL'
if($url -notmatch '^https://([a-z0-9]{15,30})\.supabase\.co/?$') { throw 'No se identifico una URL oficial de Supabase en mobile\.env.' }
$projectRef = $Matches[1]
Write-Host "Supabase del NAXVO actual: $projectRef" -ForegroundColor Cyan
Write-Host 'Solo se desplegara help-bot. No se alteraran pantallas, otras funciones o la base de datos.'

$legacy = ''
$paths = @($BackendEnv, (Join-Path $Root 'backend\.env'), 'C:\xampp\htdocs\NAXVO_Movil\backend\.env')
foreach($path in $paths) {
    if(-not [string]::IsNullOrWhiteSpace($path) -and (Test-Path -LiteralPath $path -PathType Leaf)) {
        $legacy = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $path).Path)
        break
    }
}
if(-not $legacy) {
    $zipPaths = @($OriginalZip, (Join-Path $Root 'NAXVO.zip'), 'C:\NAXVO\NAXVO.zip', (Join-Path $HOME 'Downloads\NAXVO.zip'))
    foreach($path in $zipPaths) {
        if(-not [string]::IsNullOrWhiteSpace($path) -and (Test-Path -LiteralPath $path -PathType Leaf)) {
            $legacy = Get-OldZipEnv $path
            if($legacy) { break }
        }
    }
}
$oldKey = if($legacy) { Find-Env $legacy 'GROQ_API_KEY' } else { '' }
$oldModel = if($legacy) { Find-Env $legacy 'GROQ_MODEL' } else { '' }
if([string]::IsNullOrWhiteSpace($oldModel)) { $oldModel = 'openai/gpt-oss-120b' }
if($oldKey -match '[\r\n]' -or $oldModel -match '[\r\n]') { throw 'Formato de variables no valido.' }

Push-Location $Root
try {
    # Si hay clave anterior, importarla como secreto SIN imprimirla ni ponerla en Expo.
    if(-not [string]::IsNullOrWhiteSpace($oldKey)) {
        $tempFile = Join-Path ([IO.Path]::GetTempPath()) ('naxvo-groq-' + [guid]::NewGuid().ToString('N') + '.env')
        try {
            [IO.File]::WriteAllText($tempFile, "GROQ_API_KEY=$oldKey`nGROQ_MODEL=$oldModel`n", ([Text.UTF8Encoding]::new($false)))
            & npx.cmd supabase secrets set --env-file $tempFile --project-ref $projectRef
            if($LASTEXITCODE -ne 0) { throw 'Supabase no permitio configurar la clave existente. Debe ejecutarlo un miembro con permisos sobre ese proyecto.' }
            Write-Host 'Clave privada anterior importada como secreto de Supabase.' -ForegroundColor Green
        } finally {
            if(Test-Path -LiteralPath $tempFile) { Remove-Item -LiteralPath $tempFile -Force }
        }
    } else {
        Write-Host 'No se encontro una copia local de GROQ_API_KEY; se usara el secreto remoto si ya existe.' -ForegroundColor Yellow
        try { $check = & npx.cmd supabase secrets list --project-ref $projectRef 2>&1 | Out-String }
        catch { throw 'No hay permiso para comprobar secretos. Ejecuta este instalador con la cuenta de Supabase propietaria del proyecto.' }
        if($LASTEXITCODE -ne 0) { throw 'No hay permiso para consultar los secretos de este proyecto.' }
        if($check -notmatch '\bGROQ_API_KEY\b') {
            throw 'La clave anterior no esta disponible. Ejecuta con -OriginalZip indicando NAXVO.zip (el original con backend/.env) o configura la clave desde Supabase Dashboard.'
        }
    }
    & npx.cmd supabase functions deploy help-bot --project-ref $projectRef --no-verify-jwt --use-api
    if($LASTEXITCODE -ne 0) { throw 'No se pudo publicar help-bot. Se requiere acceso a Edge Functions en este proyecto.' }
    Write-Host 'Funcion help-bot publicada. Comprobando disponibilidad...' -ForegroundColor Cyan
    $endpoint = "https://$projectRef.supabase.co/functions/v1/help-bot"
    try {
        $r = Invoke-RestMethod -Method Get -Uri $endpoint -TimeoutSec 20
        if(-not $r.ok) { throw 'La funcion no devolvio ok.' }
        if(-not $r.groq_configured) { throw 'La funcion se publico pero falta GROQ_API_KEY remoto.' }
        Write-Host 'NAXVO Assist: funcion activa con Groq configurado.' -ForegroundColor Green
    } catch { throw "La funcion se publico, pero la comprobacion de disponibilidad fallo: $($_.Exception.Message)" }
    Write-Host 'Ya se puede probar la respuesta real iniciando sesion en NAXVO.'
} finally { Pop-Location }
