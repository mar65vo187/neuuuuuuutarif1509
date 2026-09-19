# TarifWerk Premium Conversion Redesign – Audit

Datum: 20.09.2026

## 1. Analyse

| Bereich | Ist-Zustand | Problem | Priorität |
|---|---|---|---:|
| Design | Starkes Dark-Premium-System mit Electric Blue, Champagne und klarer Typohierarchie | Hero hatte zwei gleichwertige CTAs; primäre Handlung wurde dadurch optisch geteilt | 5 |
| Struktur | Viele hochwertige Sektionen vorhanden | Vertrauens- und Erklärsektionen standen vor dem eigentlichen Leistungsangebot; Conversion-Logik war unnötig lang | 5 |
| Texte / Value Proposition | B2C/B2B bereits sauber getrennt, keine erfundenen Leistungsversprechen nötig | Mehrere Botschaften konkurrierten oberhalb der ersten konkreten Leistungsübersicht | 4 |
| Mobile | Mobile Navigation und Bottom-Bar vorhanden | Primär-CTA teilte sich auf Mobil exakt gleich viel Fläche mit WhatsApp und Telefon | 5 |
| Performance | Next.js, next/image, keine zusätzliche Client-Bibliothek für das Redesign | Zusätzliche Effekte dürfen nicht auf Kosten von Core Web Vitals gehen | 3 |
| Barrierefreiheit | Skip-Link, Focus-States und Reduced Motion vorhanden | Hero brauchte klarere Landmark-Zuordnung und aktive Prozessschritte sollten semantisch markiert sein | 4 |
| SEO-Basics | Metadata, FAQ-JSON-LD, Service-ItemList und Sitemap vorhanden | Kein grundlegender SEO-Neuaufbau nötig; Struktur muss semantisch stabil bleiben | 3 |
| Conversion-Pfad | Mehrere CTAs, Finder und Abschlusssektion vorhanden | Der Weg Hero → Angebot → Vertrauen → Handlung war nicht konsequent priorisiert | 5 |

## 2. Designsystem

- Primär: #060B16 (Ink)
- Akzent: #4F8DFF (Electric Blue)
- Neutral hell: #F5F7FA (Paper)
- Neutral mittel: #A9B4C4 (Silver)
- Sekundärer Luxusakzent: #D9B877 (Champagne, sparsam)
- Schrift: Manrope für UI/Text, Instrument Serif nur als bestehender Display-Akzent
- Größenlogik: fluid mit clamp(), bestehende Skala bleibt erhalten
- Spacing: 4/8-px-System, Container max. 1240 px
- Radius: 12 / 16 / 24 / 28 px
- Breakpoints: 480 / 768 / 1024 / 1440 px

## 3. Conversion-Reihenfolge

1. Hero mit einem dominanten CTA
2. Trust Strip
3. Themen-Ticker als schnelle Orientierung
4. Hauptangebote / Nutzen
5. Weitere Leistungen
6. Vertrauens- und Arbeitsprinzipien
7. Kurzer Entscheidungs-CTA
8. Finder / Haupt-Conversion
9. Ablauf
10. Transparenz / Manifesto
11. Gründer / Referral
12. FAQ
13. Final CTA

## 4. Umgesetzte Code-Maßnahmen

- Hero auf einen klar dominanten Primär-CTA reduziert; Leistungen bleiben als sekundärer Text-Link erreichbar.
- Hero mit aria-labelledby und semantisch markiertem aktiven Prozessschritt verbessert.
- Mobile Bottom-Bar gewichtet Beratung starten doppelt gegenüber WhatsApp und Telefon.
- Startseiten-Sektionen nach Conversion-Logik neu sortiert.
- Globaler Schutz gegen horizontalen Overflow ab 320 px ergänzt.
- Scroll-Margin für Sprungziele und Fallback für Browser ohne overflow: clip ergänzt.

## 5. QA-Ziele

- Mobile ab 320 px ohne horizontalen Overflow.
- Tastaturfokus sichtbar und Skip-Link erhalten.
- Reduced Motion bleibt wirksam.
- Keine neuen externen JavaScript-Abhängigkeiten.
- Bestehende Next.js-SEO-Struktur und strukturierte Daten bleiben erhalten.
- Lighthouse-Ziel: mindestens 90 in Performance, SEO und Accessibility; tatsächliche Werte sind nach Deployment mit realer Produktionsumgebung zu messen.
- Alle vorhandenen Haupt-CTAs behalten reale Ziele; keine erfundenen Testimonials, Preise, Auszeichnungen oder Geschäftszahlen.