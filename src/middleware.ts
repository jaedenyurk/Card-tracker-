import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, computeSessionToken } from "@/lib/auth";

// Gate every page and API route behind a single shared password, since this
// app holds real business financial data and will be reachable at a public
// Vercel URL. /login and its API are the only unauthenticated routes.
//
// /api/mcp is also excluded from the cookie check: it's called by external
// MCP clients (e.g. Claude), which can't hold a browser session cookie, so it
// enforces its own separate bearer-token auth (see api/mcp/route.ts) instead.
//
// The /.well-known/* discovery documents and the OAuth registration/token
// endpoints are public too — they're called by MCP clients' own backends
// during connector setup, which can't complete an interactive login either.
// Actual access is still gated: /oauth/authorize (the consent screen) stays
// behind the cookie check below, so a token can only ever be issued to
// someone who has logged in with the site password.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/mcp") ||
    pathname.startsWith("/.well-known/") ||
    pathname.startsWith("/api/oauth/register") ||
    pathname.startsWith("/api/oauth/token") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublic) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = await computeSessionToken();

  if (!cookie || cookie !== expected) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
