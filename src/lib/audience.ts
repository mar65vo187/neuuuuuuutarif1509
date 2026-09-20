export type AudienceMode = "b2c" | "b2b";

export function withAudience(href: string, audience: AudienceMode) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const [pathAndQuery, hash = ""] = href.split("#", 2);
  const [path, query = ""] = pathAndQuery.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("audience", audience);
  return path + "?" + params.toString() + (hash ? "#" + hash : "");
}
