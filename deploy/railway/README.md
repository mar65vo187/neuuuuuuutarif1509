# Railway production runtime fallbacks

These files mirror the temporary production runtime fixes that are currently applied in Railway while the project is still serving an older image snapshot.

## What is native in `main`

The current source already contains:

- Groq as primary public AI provider with Qwen 3.8 27B
- xKiro fallback
- public AI privacy/rate-limit protections
- navigation fix for the public AI handoff
- request-form next-step validation
- direct-message support in the portal

## Why these fallback files still exist

The running Railway app snapshot may lag behind `main`. Until a full source/image deployment of current `main` succeeds, Railway can reproduce the current live behavior with:

- `public-ai-runtime-bridge.cjs`: redirects only the public TarifWerk AI request from xKiro to Groq/Qwen, then falls back to xKiro on provider failure.
- `nginx-public-nav.conf`: proxies public traffic to `tarifwerk-prod` and injects the temporary hard-navigation shim for the "Persönlich beraten lassen" CTA.

No API keys or passwords belong in these files.

## Retirement rule

Remove the runtime bridges only after a deployment from current `main` is confirmed by commit metadata, terminal `SUCCESS`, `/api/ready`, and a live public-AI smoke test.
