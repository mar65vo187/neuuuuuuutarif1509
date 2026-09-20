import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/content";

export const metadata = pageMetadata("/impressum");

export default function ImpressumPage() {
  const businessAddress = process.env.BUSINESS_ADDRESS?.trim() || "Wiesbaden, Deutschland";
  return (
    <LegalPage eyebrow="Rechtliches" title="Impressum">
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          TarifWerk
          <br />
          Inhaber: {SITE.founder}
          <br />
          {businessAddress}
        </p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: {SITE.whatsappDisplay}
          <br />
          E-Mail: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p>{SITE.founder}, Anschrift wie oben.</p>
      </section>
      <section>
        <h2>Hinweis zur Tätigkeit</h2>
        <p>
          TarifWerk vermittelt Produkte und Dienstleistungen verschiedener Anbieter (u. a. Telekommunikation, Energie, Photovoltaik, Wärmepumpen,
          Immobilien, Edelmetalle, Versicherungen). Für vermittelte Verträge erhält TarifWerk eine Provision des jeweiligen Anbieters. Erstgespräch und
          Prüfung sind für Kundinnen und Kunden kostenlos. Erlaubnispflichtige Tätigkeiten werden ausschließlich durch entsprechend zugelassene
          Partner erbracht.
        </p>
      </section>
      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
    </LegalPage>
  );
}
