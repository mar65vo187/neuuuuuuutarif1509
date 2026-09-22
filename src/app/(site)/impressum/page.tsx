import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata = pageMetadata("/impressum");

export default function ImpressumPage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Impressum">
      <section>
        <p>
          Marvin Noel Egenolf
          <br />
          TarifWerk
          <br />
          Karawankenstraße 1
          <br />
          65187 Wiesbaden
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: <a href="tel:+4915782301076">+49 157 82301076</a>
          <br />
          E-Mail: <a href="mailto:m.egenolf@tarifwerk.eu">m.egenolf@tarifwerk.eu</a>
        </p>
      </section>

      <section>
        <h2>Redaktionell verantwortlich</h2>
        <p>Marvin Noel Egenolf</p>
      </section>

      <section>
        <h2>Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
    </LegalPage>
  );
}
