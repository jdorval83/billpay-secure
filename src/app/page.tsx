"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BusinessMeta = {
  name: string;
  logo_url: string | null;
};

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [business, setBusiness] = useState<BusinessMeta | null>(null);

  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then((data) => {
        if (data.business) {
          setBusiness({
            name: data.business.name,
            logo_url: data.business.logo_url,
          });
        }
      })
      .catch(() => {
        // ignore, keep default text-only hero
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.refresh();
      router.push("/dashboard");
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col lg:flex-row relative">
      {/* Corner branding: text only when logo shown in hero (avoid duplicate logos) */}
      <div className="absolute top-5 left-5 sm:top-6 sm:left-6 flex items-center gap-3 z-10">
        {!business?.logo_url ? (
          <span className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-emerald-500 text-white text-xl sm:text-2xl font-bold shadow-lg">
            BP
          </span>
        ) : null}
        <span className="flex flex-col leading-tight">
          <span className="text-lg sm:text-xl font-bold text-white drop-shadow-sm tracking-tight">
            BillPay
          </span>
          <span className="text-xs sm:text-sm font-medium text-emerald-200/90 tracking-wide">
            Secure
          </span>
        </span>
      </div>
      <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/80 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 lg:py-0 min-h-[50vh]">
        <div className="max-w-lg mt-24 sm:mt-28 lg:mt-0">
          {/* Hero logo when available */}
          {business?.logo_url && (
            <img
              src={business.logo_url}
              alt="BillPay"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border border-white/10 object-contain bg-white/95 shadow-xl mb-6"
            />
          )}
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            BillPay
            <span className="block text-2xl sm:text-3xl font-semibold text-emerald-300/90 mt-0.5">
              Secure
            </span>
          </h1>
          <p className="mt-5 text-slate-300 text-lg leading-relaxed">
            Billing and accounts receivable for service businesses. Track customers, send invoices, and get paid faster.
          </p>
          <ul className="mt-8 space-y-3 text-slate-400">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Multi-tenant, secure by design
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Stripe-ready payments
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Simple AR dashboard
            </li>
          </ul>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="card p-8 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Sign in</h2>
            <p className="text-slate-600 text-sm mb-6">Enter your credentials to continue</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
