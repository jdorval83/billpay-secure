"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Bill = {
  id: string;
  customer_id: string;
  amount_cents: number;
  balance_cents: number;
  due_date: string;
  description: string;
  status: string;
  customers?: { name?: string } | null;
};

function StatusBadge({ status }: { status: string }) {
  const s = (status || "draft").toLowerCase();
  const styles: Record<string, string> = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    finalized: "bg-sky-50 text-sky-700 border-sky-200",
    billed: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-indigo-50 text-indigo-700 border-indigo-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    written_off: "bg-rose-50 text-rose-700 border-rose-200",
    void: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const style = styles[s] || styles.draft;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}>{s}</span>;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const fetchBills = () => {
    fetch("/api/bills")
      .then((r) => r.json())
      .then((d) => {
        setBills(d.bills || []);
        setSelectedIds(new Set());
      })
      .catch(() => setBills([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchBills();
  }, []);

  const format = (c: number) => "$" + (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const canFinalize = (b: Bill) => (b.status || "draft").toLowerCase() === "draft";
  const canSelectForInvoice = (b: Bill) => {
    const s = (b.status || "").toLowerCase();
    return (s === "draft" || s === "finalized") && b.balance_cents > 0;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedBills = bills.filter((b) => selectedIds.has(b.id));
  const sameCustomer = selectedBills.length > 0 && selectedBills.every((b) => b.customer_id === selectedBills[0].customer_id);
  const canCreateInvoice = selectedBills.length > 0 && sameCustomer;
  const canDelete = selectedBills.length > 0;

  const handleFinalize = async (bill: Bill) => {
    if (!canFinalize(bill)) return;
    setFinalizingId(bill.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finalized" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize");
      setMessage({ type: "success", text: "Bill finalized. Ready to be added to an invoice." });
      fetchBills();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to finalize bill" });
    } finally {
      setFinalizingId(null);
    }
  };

  const updateStatus = async (bill: Bill, status: string, extraBody?: Record<string, unknown>) => {
    setStatusChangingId(bill.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(extraBody || {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update bill");
      let text = "";
      if (status === "sent") text = "Bill marked as sent.";
      else if (status === "paid") text = "Bill marked as paid.";
      else if (status === "written_off") text = "Bill written off.";
      else text = "Bill updated.";
      setMessage({ type: "success", text });
      fetchBills();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to update bill" });
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleMarkSent = async (bill: Bill) => {
    await updateStatus(bill, "sent");
  };

  const handleMarkPaid = async (bill: Bill) => {
    await updateStatus(bill, "paid");
  };

  const handleWriteOff = async (bill: Bill) => {
    const reason = window.prompt("Reason for write-off (optional):", "Bad debt");
    await updateStatus(bill, "written_off", { writeoffReason: reason ?? null });
  };

  const handleCreateInvoice = async () => {
    if (!canCreateInvoice) return;
    const customerId = selectedBills[0].customer_id;
    const billIds = selectedBills.map((b) => b.id);
    setCreatingInvoice(true);
    setMessage(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, billIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");
      setMessage({ type: "success", text: "Invoice created. View it on the Invoices page." });
      setSelectedIds(new Set());
      fetchBills();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to create invoice" });
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!canDelete) return;
    if (!window.confirm(`Delete ${selectedBills.length} bill${selectedBills.length === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/bills", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedBills.map((b) => b.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete bills");
      setMessage({ type: "success", text: "Bill(s) deleted." });
      fetchBills();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to delete bills" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className="content-max">
          <div className="skeleton h-8 w-24 mb-6" />
          <div className="card p-8">
            <div className="skeleton h-12 w-full mb-3" />
            <div className="skeleton h-12 w-full mb-3" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="content-max">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Bills</h1>
          <div className="flex items-center gap-3">
            {canCreateInvoice ? (
              <button type="button" onClick={handleCreateInvoice} disabled={creatingInvoice} className="btn-primary">
                {creatingInvoice ? "Creating…" : `Create invoice (${selectedIds.size} bill${selectedIds.size === 1 ? "" : "s"})`}
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="btn-secondary"
              >
                {deleting ? "Deleting…" : `Delete (${selectedIds.size})`}
              </button>
            ) : null}
            <Link href="/bills/new" className="btn-secondary">New Bill</Link>
          </div>
        </div>
        {message && (
          <div className={`mb-4 rounded-lg border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {message.text}
          </div>
        )}
        {bills.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-600 mb-4">No bills yet.</p>
            <Link href="/bills/new" className="btn-primary inline-block">Create your first bill</Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="w-10 p-3 text-center"><span className="sr-only">Select</span></th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Customer</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Description</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Due</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Status</th>
                  <th className="w-28 p-3 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className={`border-b border-slate-100 transition-colors ${selectedIds.has(b.id) ? "bg-emerald-50/50" : "hover:bg-slate-50/50"}`}>
                    <td className="p-3 text-center">
                      {canSelectForInvoice(b) ? (
                        <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-slate-900">{(b.customers as { name?: string })?.name ?? "—"}</td>
                    <td className="p-3 text-slate-600">{b.description || "Invoice"}</td>
                    <td className="p-3 font-medium text-slate-900">{format(b.amount_cents)}</td>
                    <td className="p-3 text-slate-600">{b.due_date}</td>
                    <td className="p-3"><StatusBadge status={b.status} /></td>
                    <td className="p-3 text-right">
                      {(() => {
                        const s = (b.status || "draft").toLowerCase();
                        const isBusy = finalizingId === b.id || statusChangingId === b.id;
                        if (s === "draft") {
                          return (
                            <button
                              type="button"
                              onClick={() => handleFinalize(b)}
                              disabled={finalizingId === b.id}
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                            >
                              {finalizingId === b.id ? "Finalizing…" : "Finalize"}
                            </button>
                          );
                        }
                        if (s === "finalized") {
                          return (
                            <button
                              type="button"
                              onClick={() => handleMarkSent(b)}
                              disabled={isBusy}
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                            >
                              {statusChangingId === b.id ? "Marking sent…" : "Mark sent"}
                            </button>
                          );
                        }
                        if (s === "sent") {
                          return (
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(b)}
                                disabled={isBusy}
                                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                              >
                                {statusChangingId === b.id ? "Updating…" : "Mark paid"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleWriteOff(b)}
                                disabled={isBusy}
                                className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                              >
                                {statusChangingId === b.id ? "Updating…" : "Write off"}
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Draft bills must be <strong>Finalized</strong> before they are ready to send. Select one or more draft or finalized bills (same customer) and use <strong>Create invoice</strong> to add them to an invoice.
        </p>
      </div>
    </main>
  );
}
