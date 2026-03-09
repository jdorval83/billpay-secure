import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "./supabase";

const DEFAULT_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_SUBDOMAIN = "test";

export function getDefaultBusinessId(): string {
  return DEFAULT_BUSINESS_ID;
}

export function getTenantSlugFromHost(host: string | null): string {
  if (!host) return DEFAULT_SUBDOMAIN;
  const withoutPort = host.split(":")[0].toLowerCase().trim();
  if (withoutPort === "localhost" || withoutPort === "127.0.0.1") return DEFAULT_SUBDOMAIN;
  if (withoutPort.endsWith(".vercel.app")) return DEFAULT_SUBDOMAIN;
  const parts = withoutPort.split(".");
  if (parts.length <= 2) return DEFAULT_SUBDOMAIN;
  return parts[0];
}

export async function getBusinessIdForRequest(req: Request): Promise<string> {
  const override = process.env.PRIMARY_BUSINESS_ID;
  if (override && typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }

  // Use logged-in user's business when available (fixes no-subdomain / single-tenant)
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const meta = user?.user_metadata;
    const bizId = meta?.business_id;
    if (bizId && typeof bizId === "string") return bizId.trim();
    const subdomain = meta?.business_subdomain;
    if (subdomain && typeof subdomain === "string") {
      const { data } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("subdomain", String(subdomain).toLowerCase())
        .maybeSingle();
      if (data) return data.id as string;
    }
  } catch {
    // fall through to host-based resolution
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  return getBusinessIdFromHost(host);
}

export async function getBusinessIdFromHost(host: string | null): Promise<string> {
  const override = process.env.PRIMARY_BUSINESS_ID;
  if (override && typeof override === "string" && override.trim().length > 0) {
    return override.trim();
  }
  const slug = getTenantSlugFromHost(host);

  const { data: bySubdomain, error } = await supabaseAdmin
    .from("businesses")
    .select("id, kind")
    .eq("subdomain", slug)
    .single();

  // Prefer tenant over platform: root domain "test" often maps to platform, but bills live under tenant
  if (!error && bySubdomain) {
    if (bySubdomain.kind === "tenant") {
      return bySubdomain.id as string;
    }
    // Found platform business for "test" — use first tenant if one exists (single-tenant prod)
    if (bySubdomain.kind === "platform") {
      const { data: tenant } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq("kind", "tenant")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (tenant) return tenant.id as string;
    }
    return bySubdomain.id as string;
  }

  // Fallback: first tenant (e.g. www.billpaysecure.com when no "www" business)
  const { data: first } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("kind", "tenant")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (first) return first.id as string;

  return process.env.DEFAULT_BUSINESS_ID || DEFAULT_BUSINESS_ID;
}

