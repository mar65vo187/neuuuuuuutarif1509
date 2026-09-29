@echo off
setlocal EnableExtensions EnableDelayedExpansion
title TarifWerk - Cloudflare Vorschau ohne Login
cd /d "%~dp0"

echo.
echo ============================================================
echo   TarifWerk - Cloudflare Vorschau OHNE Login
echo ============================================================
echo.
echo Dieser Weg braucht KEINEN Opera-/ChatGPT-Browser-Connector,
echo KEINEN Cloudflare-API-Token und KEINEN vorherigen Cloudflare-Login.
echo Die Vorschau ist temporaer. Wrangler gibt danach einen Claim-Link aus.
echo.

echo [1/5] Suche Node.js...
where node.exe >nul 2>nul
if errorlevel 1 (
  set "NODEHOME="
  for /f "usebackq delims=" %%D in (`powershell.exe -NoProfile -Command "$roots=@($env:USERPROFILE+'\Downloads',$env:USERPROFILE+'\Desktop',$env:USERPROFILE+'\Tools'); $n=Get-ChildItem -Path $roots -Recurse -Filter node.exe -ErrorAction SilentlyContinue ^| Where-Object { $_.FullName -match 'node-v22\..*-win-x64' } ^| Select-Object -First 1; if($n){$n.Directory.FullName}"`) do set "NODEHOME=%%D"
  if defined NODEHOME set "PATH=!NODEHOME!;!PATH!"
)
where node.exe >nul 2>nul
if errorlevel 1 goto :node_missing
where npm.cmd >nul 2>nul
if errorlevel 1 goto :npm_missing
where npx.cmd >nul 2>nul
if errorlevel 1 goto :npm_missing

echo.
echo [2/5] Installiere Abhaengigkeiten...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto :failed

echo.
echo [3/5] Pruefe vinext...
call npx.cmd vinext check
if errorlevel 1 goto :failed

echo.
echo [4/5] Erzeuge Produktions-Build...
call npm.cmd run build
if errorlevel 1 goto :failed

echo.
echo [5/5] Lade temporaere Cloudflare-Vorschau OHNE Login hoch...
echo.
call npx.cmd wrangler logout >nul 2>nul
set "CLOUDFLARE_API_TOKEN="
set "CLOUDFLARE_API_KEY="
set "CLOUDFLARE_EMAIL="
set "CLOUDFLARE_ACCOUNT_ID="
call npx.cmd wrangler deploy --temporary --config wrangler.temporary.jsonc
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo VORSCHAU ONLINE
echo Oben stehen:
echo   1. die workers.dev Test-Adresse
echo   2. der Cloudflare Claim-Link
echo.
echo Wichtig: In dieser Vorschau sind absichtlich KEINE echten
echo Produktionsdatenbank-Secrets hinterlegt.
echo ============================================================
echo.
pause
exit /b 0

:node_missing
echo.
echo FEHLER: Portable Node.js wurde nicht gefunden.
echo.
pause
exit /b 1

:npm_missing
echo.
echo FEHLER: npm.cmd oder npx.cmd fehlt.
echo.
pause
exit /b 1

:failed
echo.
echo ============================================================
echo VORSCHAU-DEPLOY GESTOPPT
echo Der relevante Fehler steht direkt ueber dieser Zeile.
echo ============================================================
echo.
pause
exit /b 1
