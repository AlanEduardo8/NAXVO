$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Mobile = Join-Path $Root "mobile"

Write-Host "NAXVO - preparando version definitiva..." -ForegroundColor Cyan
Set-Location $Mobile

Write-Host "Instalando dependencias y generando package-lock coherente..." -ForegroundColor Yellow
npm install

Write-Host "Validando TypeScript..." -ForegroundColor Yellow
npm run typecheck

Write-Host "Listo. Para APK: eas build -p android --profile preview" -ForegroundColor Green
