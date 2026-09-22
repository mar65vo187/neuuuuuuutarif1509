import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/site/LegalPage";
import { PrivacyPolicyDocument } from "@/components/site/PrivacyPolicyDocument";
import { PRIVACY_POLICY_EN_HTML } from "@/content/legal/privacy-policy-en";

export const metadata = pageMetadata(
  "/datenschutz",
  {
    title: "Privacy Policy | TarifWerk",
    description: "Read how TarifWerk processes personal data, which rights you have and how to contact us about data protection.",
    noindex: true,
  },
  null,
  "/datenschutz/en",
);

export default function PrivacyPolicyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy">
      <PrivacyPolicyDocument
        html={PRIVACY_POLICY_EN_HTML}
        language="en"
        switchHref="/datenschutz"
        switchLabel="Deutsche Version"
        switchAriaLabel="Privacy policy language"
      />
    </LegalPage>
  );
}
