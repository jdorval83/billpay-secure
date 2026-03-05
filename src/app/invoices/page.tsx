"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  issued_at: string;
  due_at: string | null;
  total_cents: number;
  customers?: { name?: string | null; email?: string | null } | null;
};

const formatMoney = (cents: number) =>
  "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => {
        setInvoices(data.invoices || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedInvoices = invoices.filter((inv) => selectedIds.has(inv.id));
  const canDelete = selectedInvoices.length > 0;

  const handleDeleteSelected = async () => {
    if (!canDelete) return;
    if (!window.confirm(`Delete ${selectedInvoices.length} invoice${selectedInvoices.length === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedInvoices.map((i) => i.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete invoices");
      setInvoices((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="page-container">
      <div className="content-max">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          {canDelete ? (
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="btn-secondary"
            >
              {deleting ? "Deleting…" : `Delete (${selectedInvoices.length})`}
            </button>
          ) : null}
        </div>
        {loading ? (
          <div className="card p-8">
            <div className="skeleton h-4 w-32 mb-4" />
            <div className="skeleton h-10 w-full mb-3" />
            <div className="skeleton h-10 w-full mb-3" />
            <div className="skeleton h-10 w-3/4" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-600 mb-4">No invoices yet.</p>
            <p className="text-sm text-slate-500">Select bills on the Bills page and use &quot;Create invoice&quot; to add them to an invoice.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-left">
                  <th className="w-10 p-3 text-center">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="p-3 font-semibold text-slate-700">Invoice #</th>
                  <th className="p-3 font-semibold text-slate-700">Customer</th>
                  <th className="p-3 font-semibold text-slate-700">Issued</th>
                  <th className="p-3 font-semibold text-slate-700">Due</th>
                  <th className="p-3 font-semibold text-slate-700">Total</th>
                  <th className="p-3 font-semibold text-slate-700">Status</th>
                  <th className="p-3 font-semibold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`border-b border-slate-100 transition-colors ${
                      selectedIds.has(inv.id) ? "bg-emerald-50/50" : "hover:bg-slate-50/60"
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="p-3 font-medium text-slate-900">{inv.invoice_number}</td>
                    <td className="p-3 text-slate-700">
                      {inv.customers?.name ?? "—"}
                      {inv.customers?.email ? <span className="block text-xs text-slate-500">{inv.customers.email}</span> : null}
                    </td>
                    <td className="p-3 text-slate-600">{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : "—"}</td>
                    <td className="p-3 text-slate-600">{inv.due_at ? new Date(inv.due_at).toLocaleDateString() : "—"}</td>
                    <td className="p-3 font-medium text-slate-900">{formatMoney(inv.total_cents ?? 0)}</td>
                    <td className="p-3">
                      <span
                        className={
                          inv.status === "paid"
                            ? "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                            : inv.status === "void"
                            ? "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                            : "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                        }
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
