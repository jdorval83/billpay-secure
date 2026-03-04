"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <main className="min-h-screen flex flex-col lg:flex-row">
      <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 lg:py-0">
        <div className="max-w-lg">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">BillPay Secure</h1>
          <p className="mt-4 text-slate-300 text-lg">Billing and accounts receivable for service businesses. Track customers, send invoices, and get paid faster.</p>
          <ul className="mt-8 space-y-3 text-slate-400">
            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Multi-tenant, secure by design</li>
            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Stripe-ready payments</li>
            <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Simple AR dashboard</li>
          </ul>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Sign in</h2>
            <p className="text-slate-600 text-sm mb-6">Enter your credentials to continue</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <p className="text-sm text-slate-500">
                First time? <a href="/api/setup-test-user" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-medium hover:underline">Create test account</a>
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
