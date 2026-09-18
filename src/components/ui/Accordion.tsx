import { Plus } from "lucide-react";

export function Accordion({
  items,
  tone = "light",
}: {
  items: { q: string; a: string }[];
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <div className={`divide-y ${dark ? "divide-white/10" : "divide-ink/10"}`}>
      {items.map((item, index) => (
        <details key={item.q} open={index === 0} className="group">
          <summary
            className={`flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left transition-colors [&::-webkit-details-marker]:hidden ${
              dark ? "text-white hover:text-electric-soft" : "text-ink hover:text-electric-deep"
            }`}
          >
            <span className="text-[17px] font-semibold tracking-tight sm:text-[18px]">{item.q}</span>
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-[transform,background,color,border-color] duration-200 ease-premium group-open:rotate-45 group-open:border-electric group-open:bg-electric group-open:text-white ${
                dark ? "border-white/15" : "border-ink/10"
              }`}
              aria-hidden
            >
              <Plus className="h-4 w-4" />
            </span>
          </summary>
          <div className="faq-panel">
            <p className={`max-w-2xl pb-6 text-[15.5px] leading-relaxed ${dark ? "text-silver" : "text-steel"}`}>{item.a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
