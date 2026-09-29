import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/content";
import { INSURANCE_ARBITRATION, LICENSE_KIND_LABELS, REGISTERED_KINDS, VERMITTLER_REGISTER, type LicenseKind } from "@/lib/advisor-licenses";
import { listPublicLicenses, type PublicLicense } from "@/lib/advisor-licenses-server";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("/erstinformation");

export default async function FirstInformationPage() {
  let licenses: PublicLicense[] = [];
  let unavailable = false;
  try {
    licenses = await listPublicLicenses();
  } catch {
    unavailable = true;
  }

  return (
    <LegalPage eyebrow="Rechtliches" title="Erstinformation für Vermittler">
      <section>
        <p>
          TarifWerk ({SITE.founder}, Wiesbaden) arbeitet mit selbstständigen Beraterinnen und Beratern, die als Handelsvertreter tätig sind.
          Versicherungen und Immobilien vermitteln ausschließlich Berater, die die dafür erforderliche Qualifikation und Gewerbeerlaubnis haben.
        </p>
        <p>
          Die folgenden Angaben gelten für den jeweils genannten Vermittler. Zusätzlich erhalten Sie die Erstinformation vor Beginn einer
          Versicherungs- oder Immobilienberatung in Textform.
        </p>
      </section>

      {unavailable ? (
        <section><p>Die Vermittlerangaben können gerade nicht geladen werden. Bitte versuchen Sie es später erneut oder fragen Sie Ihren Berater direkt.</p></section>
      ) : licenses.length === 0 ? (
        <section><p>Die Erstinformation des jeweiligen Vermittlers erhalten Sie vor Beginn einer Versicherungs- oder Immobilienberatung.</p></section>
      ) : (
        licenses.map((license) => {
          const kind = license.kind as LicenseKind;
          const registered = REGISTERED_KINDS.includes(kind);
          return (
            <section key={`${license.advisorSlug}-${license.kind}`}>
              <h2>{license.holderName}</h2>
              <p className="text-[13px] text-steel">{LICENSE_KIND_LABELS[kind] ?? license.kind} · Berater: {license.advisorName}</p>
              <ul>
                <li>Anschrift: {license.businessAddress}</li>
                <li>Status: {license.status}</li>
                <li>Zuständige Erlaubnisbehörde: {license.authority}</li>
                {registered && license.registerNumber ? (
                  <li>
                    Registrierungsnummer: {license.registerNumber}. Register: {VERMITTLER_REGISTER.name}, {VERMITTLER_REGISTER.address},{" "}
                    <a href={VERMITTLER_REGISTER.url} rel="noopener noreferrer" target="_blank">{VERMITTLER_REGISTER.url.replace("https://", "")}</a>
                  </li>
                ) : null}
                {kind === "34d" && license.noHoldingsConfirmed ? (
                  <li>Der Vermittler hält keine direkten oder indirekten Beteiligungen von über 10 % an den Stimmrechten oder am Kapital eines Versicherungsunternehmens. Kein Versicherungsunternehmen hält eine solche Beteiligung am Vermittler.</li>
                ) : null}
                {license.remuneration ? <li>Art der Vergütung: {license.remuneration}</li> : null}
              </ul>
              {kind === "34d" ? (
                <>
                  <h3>Schlichtungsstellen</h3>
                  <ul>
                    {INSURANCE_ARBITRATION.map((entry) => (
                      <li key={entry.name}>{entry.name}, {entry.address}, <a href={entry.url} rel="noopener noreferrer" target="_blank">{entry.url.replace("https://", "")}</a></li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          );
        })
      )}
    </LegalPage>
  );
}
