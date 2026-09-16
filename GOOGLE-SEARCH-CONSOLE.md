# Google Search Console: 3 Schritte

1. Öffne [Google Search Console](https://search.google.com/search-console/welcome), füge die **Domain-Property `tarifwerk.eu`** hinzu und kopiere den dort erzeugten TXT-Eintrag unverändert in die DNS-Einstellungen dieser Domain bei STRATO. Klicke anschließend in Search Console auf **Bestätigen**. Verwende ausschließlich den für dein Google-Konto angezeigten Wert. [Google: Inhaberschaft bestätigen](https://support.google.com/webmasters/answer/9008080)
2. Nach Veröffentlichung des Next.js-Servers auf `https://www.tarifwerk.eu/` öffne dort **Sitemaps**, trage **`https://www.tarifwerk.eu/sitemap.xml`** ein und klicke **Senden**. Die Adresse muss öffentlich XML mit HTTP 200 liefern. Die Sitemap enthält alle indexierbaren öffentlichen Seiten und aktiven Beraterprofile; Portal, privater Empfehlungsstatus und bereits auf `noindex` gesetzte Rechtstexte bleiben ausgeschlossen. [Google: Sitemaps-Bericht](https://support.google.com/webmasters/answer/7451001)
3. Öffne **URL-Prüfung**, prüfe **`https://www.tarifwerk.eu/`** mit **Live-URL testen** und klicke bei erreichbarer, indexierbarer Seite auf **Indexierung beantragen**. Wiederhole das für die wichtigsten Leistungsseiten; den Gesamtstatus findest du im Bericht **Seiten**. Eine Indexierung innerhalb von 24 Stunden oder Platz 1 lässt sich nicht zusichern; Google nennt Tage bis Wochen und garantiert auch nach einer Anfrage keine Aufnahme. [Google: Erneutes Crawlen beantragen](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)

# Fertige Dateien im Projekt

- `src/lib/seo.ts`: vollständige Metadaten für öffentliche Seiten, absolute Canonicals, Open Graph und Twitter Cards; Titel unter 60 und Beschreibungen unter 155 Zeichen.
- `src/app/layout.tsx`: Metadatenbasis, Favicon und Theme-Color.
- `src/app/(site)/**/page.tsx`: integrierte Seitendaten einschließlich dynamischer Leistungen und Beraterprofile. Es gibt keine getrennten produktiven HTML-Dateien in diesem Next.js-Projekt.
- `src/app/(site)/layout.tsx`: ProfessionalService als LocalBusiness-Untertyp und WebSite mit stabilen IDs. Vorhandene Service-, Person- und FAQ-Daten bleiben erhalten.
- `src/app/sitemap.ts` und `src/app/robots.ts`: tatsächlich ausgelieferte Dateien unter `/sitemap.xml` und `/robots.txt`.
- `sitemap.xml` und `robots.txt` in der Projektwurzel: fertige Exportkopien für die initialisierte Datenbank. Vor einer separaten Verwendung nach Profiländerungen `npm run seo:export` gegen deinen laufenden Server ausführen. Standardziel ist `http://127.0.0.1:3000`; eine andere Serveradresse lässt sich über `SEO_EXPORT_ORIGIN` setzen. Next.js verwendet weiterhin die dynamischen Routen. Kopien nicht zusätzlich unter `public/` ablegen, da dort derselbe Pfad mit den Routen kollidieren würde.

# Grenzen der strukturierten Daten

Es wurden keine Sterne, Bewertungszahlen, Zulassungen oder Straßenadressen erfunden. Der bestehende Unternehmensdatensatz enthält nur die übermittelten Standortangaben; vollständige LocalBusiness-Rich-Result-Voraussetzungen sind damit nicht nachgewiesen. `FinancialService` wird ohne passende belegte Unternehmensklassifizierung nicht zusätzlich behauptet. Google zeigt keine selbstbezogenen Bewertungssterne für LocalBusiness/Organization an. [Google: Bewertungsrichtlinien](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)

Vorhandenes FAQ-Markup beschreibt weiterhin sichtbare Fragen und Antworten. FAQ-Rich-Results erscheinen seit 7. Mai 2026 nicht mehr in Google Search; sie werden deshalb nicht als erreichbares Ergebnis versprochen. [Google: Änderungen Mai/Juni 2026](https://developers.google.com/search/updates)

Die Sitemap enthält keine künstlich bei jedem Abruf aktualisierten `lastmod`-Werte. Datenbankausfälle führen bei Beraterdaten und Sitemap zu Fehlerantworten statt zu vermeintlich gelöschten Profilen oder einer unvollständigen Erfolgssitemap. Private Seiten liefern `noindex`; robots.txt erlaubt ihren Abruf, damit Suchmaschinen dieses Signal lesen können. Der tatsächliche Zugriffsschutz bleibt Aufgabe der unveränderten Anmeldung und Rollenprüfung.

Die beschriebenen Search-Console-Aktionen wurden nicht in deinem Google-Konto ausgeführt. Sie setzen bestätigte Domain-Inhaberschaft und eine erreichbare Live-Veröffentlichung voraus. GitHub Pages kann die benötigten Next.js-Serverfunktionen weiterhin nicht ausführen; das SEO-Update ändert die Hostingvoraussetzung nicht.
