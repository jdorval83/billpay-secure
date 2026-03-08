"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Template = { id: string; name: string; description: string | null; amount_cents: number; default_due_days: number };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [defaultDueDays, setDefaultDueDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const fetchTemplates = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (!name.trim() || amountCents <= 0) {
      setMessage({ type: "error", text: "Name and amount are required." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const r = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          amount_cents: amountCents,
          default_due_days: parseInt(defaultDueDays, 10) || 30,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed");
      setModal(null);
      setName("");
      setDescription("");
      setAmount("");
      setDefaultDueDays("30");
      setMessage({ type: "success", text: "Template created." });
      fetchTemplates();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const format = (c: number) => "$" + (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <main className="page-container">
      <div className="content-max">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Bill templates</h1>
          <button type="button" onClick={() => setModal("create")} className="btn-primary">
            New template
          </button>
        </div>
        {message && (
          <div className={`mb-4 rounded-lg border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {message.text}
          </div>
        )}
        {loading ? (
          <div className="card p-8">
            <div className="skeleton h-12 w-full mb-3" />
            <div className="skeleton h-12 w-full mb-3" />
            <div className="skeleton h-12 w-3/4" />
          </div>
        ) : templates.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-600 mb-4">No templates yet. Create reusable templates to speed up billing.</p>
            <button type="button" onClick={() => setModal("create")} className="btn-primary">
              Create template
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Description</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Default due</th>
                  <th className="p-4 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{t.name}</td>
                    <td className="p-4 text-slate-600">{t.description || "—"}</td>
                    <td className="p-4 font-medium text-slate-900">{format(t.amount_cents)}</td>
                    <td className="p-4 text-slate-600">{t.default_due_days} days</td>
                    <td className="p-4 text-right">
                      <Link href={`/bills/new?template=${t.id}&amount=${t.amount_cents}&description=${encodeURIComponent(t.description || t.name)}&dueDays=${t.default_due_days}`} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                        Use
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal === "create" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModal(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">New template</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Monthly retainer" required />
              </div>
              <div>
                <label className="label">Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Optional" />
              </div>
              <div>
                <label className="label">Amount ($) *</label>
                <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="0.00" required />
              </div>
              <div>
                <label className="label">Default due (days)</label>
                <input type="number" min="1" max="365" value={defaultDueDays} onChange={(e) => setDefaultDueDays(e.target.value)} className="input" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Creating…" : "Create"}</button>
                <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
