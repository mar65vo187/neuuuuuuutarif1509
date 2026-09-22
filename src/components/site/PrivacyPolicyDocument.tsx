import Link from "next/link";

type PrivacyPolicyDocumentProps = {
  html: string;
  language: "de" | "en";
  switchHref: string;
  switchLabel: string;
  switchAriaLabel: string;
};

function withoutDuplicateDocumentTitle(html: string) {
  return html.replace(/^\s*<h1>[\s\S]*?<\/h1>\s*/, "");
}

export function PrivacyPolicyDocument({
  html,
  language,
  switchHref,
  switchLabel,
  switchAriaLabel,
}: PrivacyPolicyDocumentProps) {
  return (
    <>
      <nav aria-label={switchAriaLabel} className="not-prose flex justify-end">
        <Link
          href={switchHref}
          className="inline-flex items-center rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-bold text-electric-deep no-underline shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          {switchLabel}
        </Link>
      </nav>
      <div
        lang={language}
        className="[&_h4]:mt-6 [&_h4]:text-[15.5px] [&_h4]:font-extrabold [&_h4]:text-ink [&_h5]:mt-6 [&_h5]:text-[15.5px] [&_h5]:font-extrabold [&_h5]:text-ink [&_li]:mt-1"
        dangerouslySetInnerHTML={{ __html: withoutDuplicateDocumentTitle(html) }}
      />
    </>
  );
}
