import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/site/LegalPage";
import { PrivacyPolicyDocument } from "@/components/site/PrivacyPolicyDocument";
import { PRIVACY_POLICY_DE_HTML } from "@/content/legal/privacy-policy-de";

export const metadata = pageMetadata("/datenschutz");

export default function DatenschutzPage() {
  return (
    <LegalPage eyebrow="Rechtliches" title="Datenschutzerklärung">
      <PrivacyPolicyDocument
        html={PRIVACY_POLICY_DE_HTML}
        language="de"
        switchHref="/datenschutz/en"
        switchLabel="English version"
        switchAriaLabel="Sprache der Datenschutzerklärung"
      />
    </LegalPage>
  );
}
