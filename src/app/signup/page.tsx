"use client";

import Link from "next/link";
import { useState } from "react";

export default function SignupPage() {
  const [form, setForm] = useState({
    businessName: "",
    subdomain: "",
    email: "",
    password: "",
    supportEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ loginUrl: string; subdomain: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          subdomain: form.subdomain.trim() || undefined,
          email: form.email.trim(),
          password: form.password,
          supportEmail: form.supportEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }
      setSuccess({ loginUrl: data.loginUrl, subdomain: data.subdomain });
    } catch {
      setError("Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex flex-col lg:flex-row">
        <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/80 flex flex-col justify-center px-8 py-16" />
        <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
          <div className="w-full max-w-md">
            <div className="card p-8 shadow-lg">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Account created</h2>
              <p className="text-slate-600 text-sm mb-6">
                Your environment is ready. Sign in to get started.
              </p>
              <a
                href={success.loginUrl}
                className="btn-primary w-full py-3 block text-center"
              >
                Go to {success.subdomain}.billpaysecure.com →
              </a>
              <p className="mt-4 text-xs text-slate-500 text-center">
                <Link href="/" className="text-emerald-600 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/80 flex flex-col justify-center px-8 py-16">
        <h1 className="text-3xl font-bold text-white">Create your account</h1>
        <p className="mt-4 text-slate-300">
          Set up your billing environment on BillPay Secure. You’ll get a dedicated subdomain to manage customers, bills, and invoices.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="card p-8 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Sign up</h2>
            <p className="text-slate-600 text-sm mb-6">Enter your details to create an environment</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Business name</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  className="input"
                  placeholder="Acme Services"
                  required
                />
              </div>
              <div>
                <label className="label">Subdomain</label>
                <input
                  type="text"
                  value={form.subdomain}
                  onChange={(e) => setForm((f) => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  className="input"
                  placeholder="acme"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Leave blank to use a slug from your business name. You’ll access your app at subdomain.billpaysecure.com
                </p>
              </div>
              <div>
                <label className="label">Admin email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">At least 8 characters</p>
              </div>
              <div>
                <label className="label">Support email (optional)</label>
                <input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
                  className="input"
                  placeholder="support@company.com"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/" className="text-emerald-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
