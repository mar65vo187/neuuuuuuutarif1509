# Annahmen und offene Voraussetzungen

## Grundlage und Umfang

- Grundlage dieser Startkorrektur ist die zuletzt gelieferte tarifwerk new.zip als Next.js-Serverprojekt, nicht ein leeres Websiteprojekt. Die angehängte Datei markdown(1).md ergänzt die Qualitätsanforderungen. Ihr Vanilla-Default ist nicht anwendbar, weil der Stack bereits feststeht.
- Vorhandene Farben, Typografie, Abstände, Bilddateien, Kontaktlinks und Werbeinhalte bleiben erhalten. Neue Startseitenarchitektur, Preis-/Fallstudienseiten, Social Proof und A/B-Kampagnen werden ohne konkrete Angebots-/Belegdaten nicht erfunden.
- Die Dateien in data/ sind erzeugte Prüfkopien der vorhandenen Quellen. Sie werden nicht als zweite, abweichende Laufzeitkonfiguration verwendet. Maßgeblich bleiben src/lib/content.ts, die Next.js-Metadaten und die tatsächlich vorhandenen API-Routen.

## Tatsachen und Aussagen

- data/claims.json inventarisiert statischen Quelltext einschließlich Oberflächenbeschriftungen. source=input bezeichnet mitgelieferten Quelltext und ist kein unabhängiger Wahrheitsnachweis.
- Die wenigen ergänzten allgemeinen Metabeschreibungen sind als safe-neutral erfasst.
- Dynamische Beraterangaben kommen aus administrativ gepflegten Datenbankeinträgen. Portal-/Empfehlungszahlen kommen aus den tatsächlichen Abfragen. Ohne Produktionsdaten können diese Werte nicht vorab belegt werden.
- Keine erfundenen Kundenbewertungen, Partnerlogos, Leistungszahlen, Rabatte, Fristen oder Verknappungen wurden hinzugefügt. Angaben wie Erreichbarkeit und Unabhängigkeit muss der Betreiber bestätigen.

## Sicherheit und Darstellung

- Next.js benötigt eigene Inline-Bootstrapdaten. Diese werden mit einem zufälligen Nonce je HTTP-Antwort autorisiert; beliebige Inline-Scripte und Inline-Eventhandler bleiben gesperrt. Ein pauschales CSP-Meta-Tag mit script-src 'self' würde diese Anwendung beschädigen. Die CSP wird deshalb als HTTP-Header gesetzt.
- Die vorhandenen Motion-Komponenten benötigen Inline-Stilattribute. style-src erlaubt diese weiterhin. Es gibt keine allgemeine unsafe-inline-Freigabe für JavaScript und in Produktion kein unsafe-eval.
- Nonce-basierte CSP erfordert hier dynamisch erzeugtes HTML ohne gemeinsamen HTML-Cache. Öffentliche Assets bleiben separat cachebar. Das ist eine bewusst dokumentierte Performance-Abwägung, kein Nachweis erreichter Core Web Vitals.
- Die tatsächlichen Bilderquellen der Serveranwendung und Next.js-Ressourcen sind in der Richtlinie berücksichtigt. Vorhandene Kontaktlinks und Marketinginhalte wurden nicht entfernt. Die Richtlinie muss bei später hinzugefügten Drittanbieterintegrationen gezielt überprüft werden.
- Die CSS-Ergänzung betrifft nur prefers-reduced-motion. Normale Animationen und alle Design-Tokens bleiben bestehen. JS-gesteuerte Bewegungen respektieren nun ebenfalls diese Einstellung; eine vollständige Browserprüfung über alle Viewports steht noch aus.

## Formulare, Hosting und Betrieb

- Die bestehenden Formularendpoints existieren und bleiben maßgeblich. Ein mailto-Link beweist keinen Versand. Daher wird kein API-Fehler in eine Erfolgsmeldung umgedeutet und keine Schein-Zustellung eingebaut.
- GitHub Pages kann diesen Server nicht ausführen. Das Paket erfordert einen Next.js-Host, PostgreSQL, Migration, sicheren Adminzugang und anschließend die Domainumschaltung. Diese Betriebsdaten und ein eingerichtetes Zielprojekt liegen nicht vor.
- Das neue Paket behebt die zuvor gemeldete GitHub-Pages-404 nicht durch erneutes Hochladen auf Pages. Die konkrete Hostinganleitung steht in README.md.
- Das Impressum enthält inzwischen die vom Betreiber bereitgestellte vollständige Geschäftsadresse Karawankenstraße 1, 65187 Wiesbaden sowie die aktuellen Kontaktangaben. Rechtstexte sind nicht unabhängig anwaltlich geprüft; insbesondere Datenschutzprozesse und die tatsächliche Durchführung des Empfehlungsprogramms müssen mit der realen Verarbeitung übereinstimmen.
- Datenschutz-, Aufbewahrungs- und Löschprozesse sowie tatsächliche Prämienbedingungen müssen vom Betreiber festgelegt werden. Es ist keine Auszahlung oder automatische Rabattberechnung eingerichtet.

## Grenzen der Prüfung

Produktionsbuild, TypeScript, ESLint, Auth-/Security-Tests und Serverintegration wurden geprüft. Browser-Konsole, reales Keyboard-/Drag-and-drop-Verhalten, Screenreader, Kontrastmessung, Core Web Vitals, Produktionslast und Live-Infrastruktur sind damit nicht vollständig nachgewiesen. Keine pauschale Zero-Bugs-, Sicherheits- oder Rechtskonformitätsgarantie.

## Ergänzung zur Startkorrektur

Die tatsächlichen STRATO-Vertragsleistungen und produktiven Zugangsdaten wurden nicht bereitgestellt. Die mitgelieferte Compose-Konfiguration richtet eine lokale PostgreSQL-Datenbank ein; sie bucht keinen Server und veröffentlicht keine Domain. Das ursprüngliche Paket enthielt einen mit den Serverrouten unvereinbaren statischen Export. Die reparierte Konfiguration erfordert weiterhin einen Node.js-Server.

## SEO-Ergänzung vom 16.09.2026

Seitentitel, Meta-Beschreibungen und Social-Vorschauen wurden anhand der bestehenden Leistungen neu formuliert. Sichtbare Werbetexte, CSS, Klassen, Layout, bestehende Bilder und Marketinglinks bleiben erhalten. Überschriftentags und Porträt-Alternativtexte wurden semantisch korrigiert; ein Favicon referenziert das unveränderte Markenbild. Sitemap-Daten stammen aus vorhandenen Routen und aktiven Beraterprofilen; bei Datenbankfehlern wird keine erfolgreiche unvollständige Sitemap mehr geliefert. Die vollständige Geschäftsadresse fehlt weiterhin. Es gibt keine erfundenen Sterne-Bewertungen, keine neue Behauptung einer FinancialService-Klassifizierung und keine Zusage einer Indexierung binnen 24 Stunden. Die Search-Console-Anleitung enthält die offiziellen Quellen.
