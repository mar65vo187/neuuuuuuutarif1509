import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/security";

export function proxy(request: NextRequest) {
  if (request.nextUrl.hostname === "tarifwerk.eu") {
    const canonical = request.nextUrl.clone();
    canonical.protocol = "https:";
    canonical.hostname = "www.tarifwerk.eu";
    canonical.port = "";
    return NextResponse.redirect(canonical, 308);
  }

  const headers = new Headers(request.headers);
  // Always replace incoming values; callers cannot choose nonces or portal destinations.
  const nonce = randomBytes(18).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  headers.set("x-tarifwerk-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  headers.set("x-tarifwerk-portal-path", request.nextUrl.pathname + request.nextUrl.search);

  const explicitAudience = request.nextUrl.searchParams.get("audience");
  if (explicitAudience === "b2b" || explicitAudience === "b2c") {
    const cookieParts = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !part.startsWith("tarifwerk-audience="));
    cookieParts.push(`tarifwerk-audience=${explicitAudience}`);
    headers.set("cookie", cookieParts.join("; "));
  }

  const response = NextResponse.next({ request: { headers } });
  if (explicitAudience === "b2b" || explicitAudience === "b2c") {
    response.cookies.set("tarifwerk-audience", explicitAudience, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  response.headers.set("Content-Security-Policy", policy);
  // HTML contains a per-response nonce and must not be shared by a cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|assets(?:/|$)|favicon.ico$|robots.txt$|sitemap.xml$).*)"],
};
