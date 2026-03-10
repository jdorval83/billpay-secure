"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Business = {
  id: string;
  name: string | null;
  slug: string | null;
  subdomain: string | null;
  support_email: string | null;
  invoice_footer: string | null;
  logo_url: string | null;
  kind: string | null;
  created_at?: string;
};

type CurrentBusiness = {
  id: string;
  name: string | null;
  slug: string | null;
  subdomain: string | null;
  support_email: string | null;
  invoice_footer: string | null;
  logo_url: string | null;
  kind: string | null;
};

type AdminStats = {
  businesses: number;
  customers: number;
  bills: number;
  invoices: number;
};

type SignupRequest = {
  id: string;
  business_name: string | null;
  subdomain: string | null;
  email: string | null;
  support_email: string | null;
  status: string | null;
  created_at: string | null;
};

export default function AdminPage() {
  const [current, setCurrent] = useState<CurrentBusiness | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Business>>({});

  const isPlatform = current?.kind === "platform";

  useEffect(() => {
    Promise.all([
      fetch("/api/business").then((r) => r.json()),
      fetch("/api/admin/businesses").then((r) => r.json()).catch(() => ({ businesses: [] })),
      fetch("/api/admin/stats").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/signup-requests").then((r) => r.json()).catch(() => ({ requests: [] })),
    ]).then(([bRes, aRes, sRes, srRes]) => {
      if (bRes.business) setCurrent(bRes.business);
      if (aRes.businesses && !aRes.error) setBusinesses(aRes.businesses);
      if (sRes && !sRes.error) setStats(sRes);
      if (srRes.requests && !srRes.error) setSignupRequests(srRes.requests);
      setLoading(false);
    });
  }, []);

  const handleSave = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setBusinesses((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...data.business } : b))
      );
      setEditingId(null);
      setForm({});
      setMessage({ type: "success", text: "Business updated." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to update",
      });
    }
  };

  const handleApproveSignup = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/signup-requests/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      setSignupRequests((prev) => prev.filter((r) => r.id !== id));
      setMessage({ type: "success", text: "Account created." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to approve" });
    }
  };

  const handleRejectSignup = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/signup-requests/${id}/reject`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject");
      setSignupRequests((prev) => prev.filter((r) => r.id !== id));
      setMessage({ type: "success", text: "Request rejected." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to reject" });
    }
  };

  const startEdit = (b: Business) => {
    setEditingId(b.id);
    setForm({
      name: b.name ?? "",
      slug: b.slug ?? "",
      subdomain: b.subdomain ?? "",
      support_email: b.support_email ?? "",
      invoice_footer: b.invoice_footer ?? "",
    });
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className="content-max">
          <div className="skeleton h-8 w-48 mb-6" />
          <div className="skeleton h-64 w-full" />
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="page-container">
        <div className="content-max">
          <p className="text-slate-600">Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="content-max">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">System Admin</h1>
        <p className="text-sm text-slate-600 mb-6">
          Manage business settings. Use <Link href="/settings" className="text-emerald-600 hover:underline">Settings</Link> for logo and invoice footer for this tenant.
        </p>

        {message && (
          <div
            className={`mb-4 rounded-lg border p-3 text-sm ${
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="card p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Current tenant</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Name</dt>
            <dd className="font-medium text-slate-900">{current.name ?? "—"}</dd>
            <dt className="text-slate-500">Subdomain</dt>
            <dd className="font-medium text-slate-900">{current.subdomain ?? "—"}</dd>
            <dt className="text-slate-500">Support email</dt>
            <dd className="font-medium text-slate-900">{current.support_email ?? "—"}</dd>
            <dt className="text-slate-500">Kind</dt>
            <dd className="font-medium text-slate-900">{current.kind ?? "—"}</dd>
          </dl>
          <Link href="/settings" className="btn-secondary mt-4 inline-block">
            Edit logo & invoice footer
          </Link>
        </section>

        {isPlatform && (
          <>
            {signupRequests.length > 0 && (
              <section className="card p-6 mb-8 border-amber-200 bg-amber-50/30">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Pending signup requests</h2>
                <p className="text-sm text-slate-600 mb-4">Review and approve or reject new account requests.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left">
                        <th className="p-3 font-semibold text-slate-700">Business</th>
                        <th className="p-3 font-semibold text-slate-700">Subdomain</th>
                        <th className="p-3 font-semibold text-slate-700">Email</th>
                        <th className="p-3 font-semibold text-slate-700">Requested</th>
                        <th className="p-3 font-semibold text-slate-700 w-40">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {signupRequests.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100">
                          <td className="p-3 font-medium text-slate-900">{r.business_name ?? "—"}</td>
                          <td className="p-3 text-slate-600">{r.subdomain ?? "—"}</td>
                          <td className="p-3 text-slate-600">{r.email ?? "—"}</td>
                          <td className="p-3 text-slate-600">
                            {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleApproveSignup(r.id)}
                                className="text-emerald-600 font-medium hover:text-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectSignup(r.id)}
                                className="text-red-600 font-medium hover:text-red-700"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {stats && (
              <section className="card p-6 mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Platform overview</h2>
                <p className="text-sm text-slate-600 mb-4">System-wide totals across all tenants.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.businesses}</p>
                    <p className="text-sm text-slate-500">Businesses</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.customers}</p>
                    <p className="text-sm text-slate-500">Customers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.bills}</p>
                    <p className="text-sm text-slate-500">Bills</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.invoices}</p>
                    <p className="text-sm text-slate-500">Sent bills</p>
                  </div>
                </div>
              </section>
            )}
            <section className="card overflow-hidden">
            <h2 className="text-lg font-semibold text-slate-900 p-6 pb-2">All businesses</h2>
            <p className="text-sm text-slate-600 px-6 mb-4">
              Toggle and edit settings for each tenant. Changes take effect immediately.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    <th className="p-3 font-semibold text-slate-700">Name</th>
                    <th className="p-3 font-semibold text-slate-700">Subdomain</th>
                    <th className="p-3 font-semibold text-slate-700">Support email</th>
                    <th className="p-3 font-semibold text-slate-700 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {businesses.map((b) => (
                    <tr key={b.id} className="border-b border-slate-100">
                      {editingId === b.id ? (
                        <>
                          <td className="p-3" colSpan={4}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                              <div>
                                <label className="label">Name</label>
                                <input
                                  type="text"
                                  value={form.name ?? ""}
                                  onChange={(e) =>
                                    setForm((f) => ({ ...f, name: e.target.value }))
                                  }
                                  className="input"
                                />
                              </div>
                              <div>
                                <label className="label">Subdomain</label>
                                <input
                                  type="text"
                                  value={form.subdomain ?? ""}
                                  onChange={(e) =>
                                    setForm((f) => ({ ...f, subdomain: e.target.value }))
                                  }
                                  className="input"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="label">Support email</label>
                                <input
                                  type="email"
                                  value={form.support_email ?? ""}
                                  onChange={(e) =>
                                    setForm((f) => ({ ...f, support_email: e.target.value }))
                                  }
                                  className="input"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="label">Invoice footer</label>
                                <textarea
                                  value={form.invoice_footer ?? ""}
                                  onChange={(e) =>
                                    setForm((f) => ({ ...f, invoice_footer: e.target.value }))
                                  }
                                  className="input min-h-[80px]"
                                  rows={3}
                                />
                              </div>
                              <div className="sm:col-span-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSave(b.id)}
                                  className="btn-primary"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setForm({});
                                  }}
                                  className="btn-secondary"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 font-medium text-slate-900">
                            {b.name ?? "—"}
                          </td>
                          <td className="p-3 text-slate-600">{b.subdomain ?? "—"}</td>
                          <td className="p-3 text-slate-600">{b.support_email ?? "—"}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => startEdit(b)}
                              className="text-emerald-600 font-medium hover:text-emerald-700"
                            >
                              Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {businesses.length === 0 && (
              <p className="p-6 text-slate-500 text-sm">No businesses found.</p>
            )}
          </section>
          </>
        )}

        {!isPlatform && (
          <p className="text-sm text-slate-500">
            Platform admin features are only available when signed in as the platform tenant.
          </p>
        )}
      </div>
    </main>
  );
}
