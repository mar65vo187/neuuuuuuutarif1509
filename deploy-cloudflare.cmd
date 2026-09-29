@echo off
setlocal EnableExtensions EnableDelayedExpansion
title TarifWerk - Cloudflare Deploy
cd /d "%~dp0"

echo.
echo ============================================================
echo   TarifWerk - Cloudflare Workers Deployment
echo ============================================================
echo.

echo [1/8] Suche Node.js...
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
echo [2/8] Installiere Projekt-Abhaengigkeiten...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto :failed

echo.
echo [3/8] Pruefe Next.js/vinext-Kompatibilitaet...
call npx.cmd vinext check
if errorlevel 1 goto :failed

echo.
echo [4/8] Erzeuge Produktions-Build...
call npm.cmd run build
if errorlevel 1 goto :failed

echo.
echo [5/8] Pruefe Cloudflare-Anmeldung...
call npx.cmd wrangler whoami >nul 2>nul
if errorlevel 1 (
  echo.
  echo       Kein Cloudflare-Login gefunden.
  echo       Nutze jetzt den Cloudflare DEVICE-LOGIN.
  echo       Dafuer ist KEIN Opera-/ChatGPT-Browser-Connector notwendig.
  echo.
  echo       Wrangler zeigt gleich eine Cloudflare-Adresse und einen kurzen Code.
  echo       Oeffne die Adresse in irgendeinem Browser oder auf dem Handy,
  echo       melde dich bei Cloudflare an und bestaetige den Code.
  echo.
  call npx.cmd wrangler login --device --browser=false
  if errorlevel 1 goto :failed
)

call npx.cmd wrangler whoami
if errorlevel 1 goto :failed

echo.
echo [6/8] Lade TarifWerk zu Cloudflare Workers hoch...
call npx.cmd @vinext/cloudflare deploy --skip-build
if errorlevel 1 goto :failed

echo.
echo [7/8] Pruefe Server-Sitzungsschluessel...
set "SECRET_LIST=%TEMP%\tarifwerk-worker-secrets-%RANDOM%.json"
call npx.cmd wrangler secret list --format json > "!SECRET_LIST!" 2>nul
findstr /i /c:"SESSION_SECRET" "!SECRET_LIST!" >nul 2>nul
if errorlevel 1 (
  echo       SESSION_SECRET fehlt - erzeuge ihn einmalig sicher.
  set "GENERATED_SESSION_SECRET="
  for /f "usebackq delims=" %%S in (`powershell.exe -NoProfile -Command "$b=New-Object byte[] 48; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)"`) do set "GENERATED_SESSION_SECRET=%%S"
  if not defined GENERATED_SESSION_SECRET goto :secret_failed
  echo(!GENERATED_SESSION_SECRET!| npx.cmd wrangler secret put SESSION_SECRET
  if errorlevel 1 goto :secret_failed
  set "GENERATED_SESSION_SECRET="
) else (
  echo       Vorhandener SESSION_SECRET bleibt unveraendert.
)
del /q "!SECRET_LIST!" >nul 2>nul

echo.
echo [8/8] DEPLOYMENT ABGESCHLOSSEN
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

:secret_failed
set "GENERATED_SESSION_SECRET="
if defined SECRET_LIST del /q "!SECRET_LIST!" >nul 2>nul
echo.
echo FEHLER: SESSION_SECRET konnte nicht sicher bei Cloudflare hinterlegt werden.
echo Der Worker wurde nicht als fertig markiert.
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
