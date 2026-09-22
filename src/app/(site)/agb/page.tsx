import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata = pageMetadata("/agb");

export default function AgbPage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Allgemeine Geschäftsbedingungen">
      <section>
        <p className="text-[13px] text-steel">Stand: 22. September 2026</p>
      </section>

      <section>
        <h2>1. Anbieter und Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für die Beratungs-, Orientierungs- und Vermittlungsleistungen von TarifWerk,
          betrieben durch Marvin Noel Egenolf, Karawankenstraße 1, 65187 Wiesbaden, gegenüber Privat- und Geschäftskunden.
        </p>
        <p>
          Für Verträge, die Kunden mit einem vermittelten Anbieter oder Kooperationspartner schließen, gelten zusätzlich die jeweiligen
          Vertragsbedingungen dieses Anbieters. Zwingende gesetzliche Rechte der Kunden bleiben unberührt.
        </p>
      </section>

      <section>
        <h2>2. Rolle und Leistungen von TarifWerk</h2>
        <p>
          TarifWerk unterstützt Kunden bei der Orientierung, Bedarfsklärung und Auswahl möglicher Angebote und kann auf Wunsch Verträge
          oder sonstige Leistungen von Drittanbietern vermitteln. Dazu gehören insbesondere Bereiche wie Internet, Mobilfunk, TV, Strom,
          Gas, Solar und Photovoltaik, Wärmepumpen, Versicherungen, Immobilien, Edelmetalle, Klimaanlagen und Sicherheitslösungen.
        </p>
        <p>
          Soweit nicht ausdrücklich etwas anderes vereinbart wird, erbringt der jeweilige Anbieter die vermittelte Hauptleistung in eigener
          Verantwortung. TarifWerk wird dadurch nicht selbst zum Anbieter der vermittelten Telekommunikations-, Energie-, Versicherungs-,
          Finanz-, Immobilien-, Handwerks- oder sonstigen Drittleistung.
        </p>
      </section>

      <section>
        <h2>3. Anfrage, Beratung und Vertragsschluss</h2>
        <p>
          Eine Anfrage über die Website, telefonisch, per E-Mail, über WhatsApp oder im persönlichen Gespräch ist zunächst unverbindlich.
          Ein Vertrag über ein Produkt oder eine Leistung eines Drittanbieters kommt ausschließlich nach den hierfür geltenden Regeln und
          Unterlagen des jeweiligen Anbieters zustande.
        </p>
        <p>
          Produktinformationen, Preise, Verfügbarkeiten und Konditionen können sich bis zum Vertragsschluss ändern. Maßgeblich sind die
          dem Kunden beim jeweiligen Abschluss zur Verfügung gestellten Vertragsunterlagen und Pflichtinformationen.
        </p>
      </section>

      <section>
        <h2>4. Vergütung und Provisionen</h2>
        <p>
          Die Erstorientierung und die allgemeine Prüfung durch TarifWerk sind für Kunden grundsätzlich kostenlos, sofern vorab nicht
          ausdrücklich eine abweichende Vergütung vereinbart wird. Für erfolgreich vermittelte Verträge kann TarifWerk vom jeweiligen
          Anbieter oder Kooperationspartner eine Provision oder sonstige Vergütung erhalten.
        </p>
        <p>
          Eine solche Vergütung ändert nichts daran, dass der Kunde selbst entscheidet, ob und welches Angebot er annimmt. Etwaige Kosten
          des vermittelten Vertrags ergeben sich aus den Unterlagen des jeweiligen Anbieters.
        </p>
      </section>

      <section>
        <h2>5. Mitwirkung und Richtigkeit von Angaben</h2>
        <p>
          Kunden sind dafür verantwortlich, die für Beratung, Prüfung oder Vermittlung erforderlichen Angaben vollständig und richtig
          mitzuteilen. TarifWerk darf grundsätzlich auf die vom Kunden bereitgestellten Informationen und Unterlagen vertrauen, soweit
          keine offensichtlichen Widersprüche erkennbar sind.
        </p>
        <p>
          Ändern sich wesentliche Umstände vor dem Abschluss, sollte TarifWerk darüber informiert werden, damit die Einordnung und
          Vermittlung auf einer aktuellen Grundlage erfolgen kann.
        </p>
      </section>

      <section>
        <h2>6. Termine und Kommunikation</h2>
        <p>
          Terminwünsche über die Website oder andere Kommunikationskanäle sind Anfragen und werden erst durch ausdrückliche Bestätigung
          verbindlich. Termine können nach Absprache verschoben oder abgesagt werden.
        </p>
        <p>
          Bei digitaler Kommunikation kann TarifWerk die vom Kunden gewählten oder angebotenen Kommunikationswege nutzen. Für besonders
          vertrauliche Unterlagen können gesonderte sichere Übermittlungswege vereinbart werden.
        </p>
      </section>

      <section>
        <h2>7. Drittanbieter, Widerruf und Stornierung</h2>
        <p>
          Widerrufs-, Kündigungs-, Stornierungs- und Gewährleistungsrechte in Bezug auf vermittelte Verträge richten sich nach den
          gesetzlichen Vorschriften und den Vertragsunterlagen des jeweiligen Anbieters. TarifWerk schränkt gesetzliche Verbraucherrechte
          nicht ein.
        </p>
        <p>
          Wird ein vermittelter Vertrag widerrufen, storniert, nicht angenommen oder aus anderen Gründen nicht wirksam beziehungsweise
          nicht provisionsfähig, kann dies auch Auswirkungen auf daran geknüpfte freiwillige Prämien oder Empfehlungsvergütungen haben.
        </p>
      </section>

      <section id="empfehlungsprogramm" className="scroll-mt-28">
        <h2>8. Empfehlungsprogramm</h2>
        <p>
          TarifWerk bietet ein freiwilliges Empfehlungsprogramm an. Teilnehmende können einen persönlichen Empfehlungslink erstellen und
          diesen an Personen weitergeben, für die eine Beratung durch TarifWerk interessant sein könnte. Die empfohlene Person entscheidet
          selbst, ob sie den Link nutzt und Kontakt zu TarifWerk aufnimmt.
        </p>
        <p>
          Eine Prämie setzt voraus, dass eine Empfehlung eindeutig zugeordnet werden kann, daraus ein tatsächlich erfolgreich vermitteltes
          Geschäft entsteht und die für dieses Geschäft relevanten Prüf-, Widerrufs- und Stornofristen abgeschlossen sind. Die Prämie wird
          erst nach interner Prüfung und Freigabe verbindlich bestätigt.
        </p>
        <p>
          Die auf der Seite <Link href="/freund-werben" className="underline underline-offset-2">Freunde werben</Link> veröffentlichten
          Beträge sind Maximalwerte („bis zu“) und keine automatische Anspruchszusage. Der konkrete Betrag hängt insbesondere vom
          vermittelten Bereich, dem tatsächlich zustande gekommenen Geschäft und den dafür geltenden Voraussetzungen ab.
        </p>
        <p>
          Nach Bestätigung kann die Prämie als Wunschgutschein in der bestätigten Höhe ausgegeben werden. Soweit für die jeweilige Empfehlung
          eine alternative Geld-Auszahlung angeboten wird, beträgt diese 50&nbsp;% des bestätigten Gutscheinwerts. Mehrere Empfehlungen sind
          zulässig; jede Empfehlung wird separat geprüft. Eine Empfehlung oder ein identisches Geschäft kann nicht mehrfach für mehrere
          Prämien berücksichtigt werden.
        </p>
        <p>
          Im privaten Statusbereich werden der empfehlenden Person nur die für die Zuordnung und den Status erforderlichen Informationen
          angezeigt. Namen, Kontaktdaten und Vertragsdetails der empfohlenen Person werden dort nicht offengelegt.
        </p>
      </section>

      <section>
        <h2>9. Keine Erfolgs-, Einspar- oder Renditegarantie</h2>
        <p>
          TarifWerk gibt keine Garantie für bestimmte Einsparungen, Renditen, Wertentwicklungen, Förderungen, Genehmigungen, Verfügbarkeiten
          oder Annahmeentscheidungen eines Drittanbieters. Einschätzungen beruhen auf den vom Kunden mitgeteilten Angaben und den zum
          jeweiligen Zeitpunkt verfügbaren Informationen.
        </p>
        <p>
          Die Entscheidung über den Abschluss eines Vertrags oder die Umsetzung einer Empfehlung liegt beim Kunden.
        </p>
      </section>

      <section>
        <h2>10. Haftung</h2>
        <p>
          TarifWerk haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach den gesetzlichen Vorschriften bei Schäden aus der
          Verletzung des Lebens, des Körpers oder der Gesundheit. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die
          Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt.
        </p>
        <p>
          Soweit TarifWerk lediglich Leistungen Dritter vermittelt, bleibt der jeweilige Drittanbieter für die ordnungsgemäße Erbringung
          seiner eigenen vertraglichen Leistung verantwortlich.
        </p>
      </section>

      <section>
        <h2>11. Datenschutz</h2>
        <p>
          Informationen zur Verarbeitung personenbezogener Daten enthält die jeweils aktuelle{" "}
          <Link href="/datenschutz" className="underline underline-offset-2">Datenschutzerklärung</Link>. Für die englische Fassung steht
          zusätzlich die <Link href="/datenschutz/en" className="underline underline-offset-2">English Privacy Policy</Link> bereit.
        </p>
      </section>

      <section>
        <h2>12. Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section>
        <h2>13. Schlussbestimmungen</h2>
        <p>
          Es gilt deutsches Recht unter Beachtung zwingender Verbraucherschutzvorschriften. Sollte eine einzelne Bestimmung dieser AGB ganz
          oder teilweise unwirksam sein, bleiben die übrigen Bestimmungen davon unberührt.
        </p>
      </section>
    </LegalPage>
  );
}
