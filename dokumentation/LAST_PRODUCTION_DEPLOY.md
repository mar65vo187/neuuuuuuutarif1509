# Letzter Produktions-Deploy

Dieser Marker dokumentiert den bewusst ausgelösten Produktions-Deploy nach dem Financial-Integrity- und Owner-Privacy-Audit.

Geprüfter Code-Basis-Commit: `44b1367019e96c0f6bc27a00f63756652b13b532`

Prüfkette vor Merge:
- PostgreSQL-Migrationen
- Produktschema-Prüfung
- TypeScript
- ESLint
- Regressionstests
- Next.js Production Build

Der Deployment-Workflow baut mit Vercel CLI vor und veröffentlicht anschließend mit `vercel deploy --prebuilt --prod`.
