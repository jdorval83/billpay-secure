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

  // Don't redirect signup or auth APIs — keep them on root so signup works
  if (isRootDomain && (pathname === "/signup" || pathname.startsWith("/api/auth/"))) {
    const { user, response } = await updateSession(request);
    // Redirect signed-in users away from signup
    if (pathname === "/signup" && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url), 307);
    }
    return response;
  }

  // Redirect root domain to test subdomain (except signup handled above)
  if (isRootDomain) {
    const base = `https://${TEST_SUBDOMAIN}.${PRODUCTION_DOMAIN}`;
    const path = pathname + request.nextUrl.search;
    return NextResponse.redirect(base + path, 307);
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
