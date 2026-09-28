# Öffentliche TarifWerk-KI

Stand: 28.09.2026

Die öffentlich zugängliche Website-KI ist technisch getrennt von der internen Mitarbeiter-KI.

## Provider-Reihenfolge

1. Groq mit `qwen/qwen3.8-27b`
2. xKiro/Qwen als Ausfall-Fallback

## Laufzeitregeln

- API-Schlüssel liegen ausschließlich als serverseitige Firebase App Hosting Secrets.
- Der Browser erhält keinen Provider-Key.
- Groq wird in `auto` bevorzugt, sobald `GROQ_API_KEY` vorhanden ist.
- Ohne Groq-Key, bei Provider-Ausfall oder nach dem konfigurierten Groq-Tagesbudget wird automatisch der bestehende xKiro/Qwen-Fallback genutzt.
- Die öffentliche KI erhält nur öffentliche TarifWerk-Inhalte und keine internen CRM-, Provisions- oder Trainingsdaten.
- Kontaktangaben werden vor externen KI-Anfragen redigiert.
- Same-Origin- und serverseitige Rate-Limits bleiben aktiv.

## Release

Der vorgesehene Hosting-Pfad ist Firebase App Hosting, verbunden mit diesem GitHub-Repository. Ein erfolgreicher Firebase-Produktionsrollout ist noch nicht verifiziert; siehe `dokumentation/LAST_PRODUCTION_DEPLOY.md`.
