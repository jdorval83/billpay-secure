import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The setAll method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/** Use request cookies directly - more reliable in Route Handlers */
export function createClientFromRequest(request: NextRequest | Request) {
  let cookieList: { name: string; value: string }[] = [];
  if ("cookies" in request && typeof request.cookies?.getAll === "function") {
    cookieList = request.cookies.getAll();
  } else {
    const raw = request.headers.get("cookie");
    if (raw) {
      cookieList = raw.split(";").map((c) => {
        const [name, ...v] = c.trim().split("=");
        return { name: name || "", value: v.join("=").trim() };
      }).filter((c) => c.name);
    }
  }
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieList;
        },
        setAll() {
          // Read-only for auth check; middleware handles session refresh
        },
      },
    }
  );
}
