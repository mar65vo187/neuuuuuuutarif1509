@echo off
setlocal EnableExtensions EnableDelayedExpansion
title TarifWerk - Cloudflare Deploy
cd /d "%~dp0"

echo.
echo ============================================================
echo   TarifWerk - Cloudflare Workers Deployment
echo ============================================================
echo.

echo [1/7] Suche Node.js...
where node.exe >nul 2>nul
if errorlevel 1 (
  set "NODEHOME="
  for /f "usebackq delims=" %%D in (`powershell.exe -NoProfile -Command "$roots=@($env:USERPROFILE+'\Downloads',$env:USERPROFILE+'\Desktop',$env:USERPROFILE+'\Tools'); $n=Get-ChildItem -Path $roots -Recurse -Filter node.exe -ErrorAction SilentlyContinue ^| Where-Object { $_.FullName -match 'node-v22\..*-win-x64' } ^| Select-Object -First 1; if($n){$n.Directory.FullName}"`) do set "NODEHOME=%%D"
  if defined NODEHOME set "PATH=!NODEHOME!;!PATH!"
)

where node.exe >nul 2>nul
if errorlevel 1 goto :node_missing

for /f "delims=" %%V in ('node.exe -v') do set "NODE_VERSION=%%V"
echo       Node: %NODE_VERSION%

where npm.cmd >nul 2>nul
if errorlevel 1 goto :npm_missing
where npx.cmd >nul 2>nul
if errorlevel 1 goto :npm_missing

echo.
echo [2/7] Installiere Projekt-Abhaengigkeiten...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto :failed

echo.
echo [3/7] Pruefe Next.js/vinext-Kompatibilitaet...
call npx.cmd vinext check
if errorlevel 1 goto :failed

echo.
echo [4/7] Erzeuge Produktions-Build...
call npm.cmd run build
if errorlevel 1 goto :failed

echo.
echo [5/7] Pruefe Cloudflare-Anmeldung...
call npx.cmd wrangler whoami >nul 2>nul
if errorlevel 1 (
  echo       Browser wird fuer die Cloudflare-Freigabe geoeffnet.
  echo       Dort nur anmelden und "Allow" bzw. "Zulassen" anklicken.
  call npx.cmd wrangler login
  if errorlevel 1 goto :failed
)

call npx.cmd wrangler whoami
if errorlevel 1 goto :failed

echo.
echo [6/7] Lade TarifWerk zu Cloudflare Workers hoch...
call npx.cmd @vinext/cloudflare deploy --skip-build
if errorlevel 1 goto :failed

echo.
echo [7/7] DEPLOYMENT ABGESCHLOSSEN
echo.
echo Die oben ausgegebene https://...workers.dev-Adresse ist der Test-Link.
echo www.tarifwerk.eu wird mit diesem Skript absichtlich NICHT automatisch
echo umgestellt, bevor der Worker geprueft wurde.
echo.
pause
exit /b 0

:node_missing
echo.
echo FEHLER: Portable Node.js wurde nicht gefunden.
echo Erwartet wird die bereits entpackte Node-22-ZIP in Downloads, Desktop oder Tools.
echo.
pause
exit /b 1

:npm_missing
echo.
echo FEHLER: npm.cmd oder npx.cmd wurde neben Node.js nicht gefunden.
echo Bitte die vollstaendige Node-ZIP entpacken, nicht nur node.exe.
echo.
pause
exit /b 1

:failed
echo.
echo ============================================================
echo DEPLOYMENT GESTOPPT
echo Der relevante Fehler steht direkt ueber dieser Zeile.
echo Keine Tokens, Passwoerter oder API-Schluessel weitergeben.
echo ============================================================
echo.
pause
exit /b 1
