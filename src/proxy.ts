import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/security";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Always replace incoming values; callers cannot choose nonces or portal destinations.
  const nonce = randomBytes(18).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  headers.set("x-tarifwerk-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  headers.set("x-tarifwerk-portal-path", request.nextUrl.pathname + request.nextUrl.search);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  // HTML contains a per-response nonce and must not be shared by a cache.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next(?:/|$)|assets(?:/|$)|favicon.ico$|robots.txt$|sitemap.xml$).*)"],
};
