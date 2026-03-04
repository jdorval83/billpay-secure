"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  };

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

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <Link href="/dashboard" className="font-semibold text-slate-900 text-lg tracking-tight">
          BillPay Secure
        </Link>
        <div className="flex items-center gap-5">
          {link("/dashboard", "Dashboard")}
          {link("/customers", "Customers")}
          {link("/bills", "Bills")}
          <Link href="/bills/new" className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 text-sm transition-colors">
            New Bill
          </Link>
          <button onClick={handleLogout} className="text-slate-600 hover:text-slate-900 text-sm font-medium transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
