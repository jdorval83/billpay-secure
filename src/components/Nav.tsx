"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type BusinessMeta = {
  name: string;
  logo_url: string | null;
  kind?: string | null;
};

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessMeta | null>(null);

  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then((data) => {
        if (data.business) {
          setBusiness({
            name: data.business.name,
            logo_url: data.business.logo_url,
            kind: data.business.kind,
          });
        }
      })
      .catch(() => {
        // ignore, fall back to default branding
      });
  }, []);

  if (pathname === "/" || pathname === "/signup" || pathname.startsWith("/public")) return null;

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        pathname === href ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );

  const displayName = business?.name || "BillPay Secure";

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          {business?.logo_url ? (
            <img
              src={business.logo_url}
              alt="Logo"
              className="h-8 w-8 rounded-lg border border-slate-200 object-contain bg-white"
            />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow-sm">
              BP
            </span>
          )}
          <span className="flex flex-col">
            <span className="font-semibold text-slate-900 leading-tight tracking-tight">
              {displayName}
            </span>
            <span className="text-[11px] text-slate-500 leading-tight">
              AR for service businesses
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-6">
          {link("/dashboard", "Dashboard")}
          {link("/customers", "Customers")}
          {link("/bills", "Bills")}
          {link("/templates", "Templates")}
          {link("/invoices", "Invoices")}
          {link("/reports", "Reports")}
          {link("/settings", "Settings")}
          {link("/admin", "Admin")}
          <Link href="/bills/new" className="btn-primary text-sm py-2">
            New bill
          </Link>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.refresh();
              router.push("/");
            }}
            className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
