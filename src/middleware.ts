import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PRODUCTION_DOMAIN = "billpaysecure.com";
const TEST_SUBDOMAIN = "test";

const PROTECTED_PATHS = [
  "/dashboard",
  "/bills",
  "/customers",
  "/invoices",
  "/templates",
  "/reports",
  "/settings",
  "/admin",
];

const PROTECTED_API_PREFIXES = [
  "/api/bills",
  "/api/customers",
  "/api/invoices",
  "/api/dashboard",
  "/api/templates",
  "/api/reminders",
  "/api/payment-records",
  "/api/reports",
  "/api/admin",
];

const PUBLIC_PATHS = ["/", "/signup", "/privacy", "/terms", "/compliance"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/public"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/public/")) return true;
  return PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isProtectedApi(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const withoutPort = host.split(":")[0].toLowerCase();
  const pathname = request.nextUrl.pathname;

  const isRootDomain =
    withoutPort === PRODUCTION_DOMAIN || withoutPort === `www.${PRODUCTION_DOMAIN}`;

  // Root domain (billpaysecure.com, www) = login/landing. Do NOT redirect.
  // Signup: redirect signed-in users away to their subdomain
  if (isRootDomain) {
    const { user, response } = await updateSession(request);
    if (pathname === "/signup" && user) {
      const sub = user.user_metadata?.business_subdomain;
      if (sub && typeof sub === "string") {
        return NextResponse.redirect(new URL(`https://${sub}.${PRODUCTION_DOMAIN}/`), 307);
      }
      return NextResponse.redirect(new URL("/", request.url), 307);
    }
    // Root serves login, signup, etc. — run auth check for protected paths
    if (isProtectedPath(pathname) && !user) {
      return NextResponse.redirect(new URL("/", request.url), 307);
    }
    if (isProtectedApi(pathname) && !isPublicPath(pathname) && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return response;
  }

  const { user, response } = await updateSession(request);

  // Protect app routes — redirect to login if no session
  if (isProtectedPath(pathname) && !user) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  // Protect API routes — return 401 if no session
  if (isProtectedApi(pathname) && !isPublicPath(pathname) && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image
     * - favicon, icons, images
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
