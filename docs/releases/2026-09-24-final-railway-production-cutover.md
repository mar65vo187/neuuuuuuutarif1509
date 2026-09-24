# Final Railway production cutover

Date: 2026-09-24

This non-empty production-branch commit triggers Railway GitHub autodeploy after the service was switched to branch-tracking mode.

Expected production guarantees:
- source branch: railway-production
- Groq/Qwen public AI with xKiro/local fallback
- public navigation handoff fix
- request-form next-step fix
- private direct messaging support
- predeploy migrations + migration verification + seed
- /api/ready healthcheck
- no committed secrets
