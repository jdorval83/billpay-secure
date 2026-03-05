import { supabaseAdmin } from "./supabase";

const DEFAULT_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_SUBDOMAIN = "test";

export function getDefaultBusinessId(): string {
  return DEFAULT_BUSINESS_ID;
}

export function getTenantSlugFromHost(host: string | null): string {
  if (!host) return DEFAULT_SUBDOMAIN;
  const withoutPort = host.split(":")[0].toLowerCase();
  if (withoutPort === "localhost") return DEFAULT_SUBDOMAIN;
  const parts = withoutPort.split(".");
  if (parts.length <= 2) return DEFAULT_SUBDOMAIN;
  return parts[0];
}

export async function getBusinessIdForRequest(req: Request): Promise<string> {
  const host = req.headers.get("host");
  const slug = getTenantSlugFromHost(host);

  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("subdomain", slug)
    .single();

  if (error || !data) {
    return DEFAULT_BUSINESS_ID;
  }

  return data.id as string;
}

