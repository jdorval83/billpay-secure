import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getTenantSlugFromHost, hasSubdomainInHost } from "@/lib/tenant";

const PRODUCTION_DOMAIN = "billpaysecure.com";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Subdomain isolation: user must belong to the subdomain they're visiting
  if (user) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const hostSubdomain = getTenantSlugFromHost(host);
    const userSubdomain = user.user_metadata?.business_subdomain;
    const hasSubdomain = hasSubdomainInHost(host);

    if (hasSubdomain && userSubdomain && typeof userSubdomain === "string") {
      const normalizedUser = String(userSubdomain).toLowerCase().trim();
      const normalizedHost = hostSubdomain.toLowerCase();
      if (normalizedUser !== normalizedHost) {
        await supabase.auth.signOut();
        const pathname = request.nextUrl.pathname;
        const isApi = pathname.startsWith("/api/");
        if (isApi) {
          response = NextResponse.json(
            { error: "Access denied. You do not have access to this business." },
            { status: 403 }
          );
        } else {
          response = NextResponse.redirect(
            new URL(`https://${PRODUCTION_DOMAIN}/?error=wrong_subdomain`, request.url),
            307
          );
        }
        return { user: null, response, subdomainMismatch: true };
      }
    }
  }

  return { user, response };
}
