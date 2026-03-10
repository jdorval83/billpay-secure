"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";

const PAGE_SIZE = 20;

type Bill = {
  id: string;
  customer_id: string;
  balance_cents: number;
  due_date: string;
  status: string;
  customers?: { name?: string | null } | null;
};

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
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentSubmitting, setRecordPaymentSubmitting] = useState(false);
  const [recordPaymentMessage, setRecordPaymentMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [recordPaymentForm, setRecordPaymentForm] = useState({
    amount: "",
    check_number: "",
    payer_name: "",
    paid_at: new Date().toISOString().slice(0, 10),
    notes: "",
    bill_ids: [] as string[],
    file: null as File | null,
  });
  const recordPaymentRef = useRef<HTMLFormElement>(null);

  const filteredInvoices = useMemo(() => {
    let out = invoices;
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (inv) =>
          (inv.invoice_number ?? "").toLowerCase().includes(q) ||
          (inv.customers?.name ?? "").toLowerCase().includes(q) ||
          (inv.customers?.email ?? "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      out = out.filter((inv) => (inv.issued_at ?? "").slice(0, 10) >= dateFrom);
    }
    if (dateTo) out = out.filter((inv) => (inv.issued_at ?? "").slice(0, 10) <= dateTo);
    if (statusFilter) out = out.filter((inv) => (inv.status || "").toLowerCase() === statusFilter);
    return out;
  }, [invoices, search, dateFrom, dateTo, statusFilter]);

  const paginatedInvoices = useMemo(() => {
    if (showAll) return filteredInvoices;
    const start = (page - 1) * PAGE_SIZE;
    return filteredInvoices.slice(start, start + PAGE_SIZE);
  }, [filteredInvoices, page, showAll]);

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const hasFilters = search.trim() || dateFrom || dateTo || statusFilter;

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => {
        setInvoices(data.invoices || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (recordPaymentOpen) {
      fetch("/api/bills")
        .then((r) => r.json())
        .then((d) => setBills(d.bills || []))
        .catch(() => setBills([]));
    }
  }, [recordPaymentOpen]);

  const unpaidBills = useMemo(
    () =>
      bills.filter(
        (b) =>
          (b.balance_cents ?? 0) > 0 &&
          (b.status || "").toLowerCase() !== "void"
      ),
    [bills]
  );

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(recordPaymentForm.amount || "0") * 100);
    if (amountCents <= 0) {
      setRecordPaymentMessage({ type: "error", text: "Enter a valid amount." });
      return;
    }
    setRecordPaymentSubmitting(true);
    setRecordPaymentMessage(null);
    try {
      const formData = new FormData();
      formData.set("amount_cents", String(amountCents));
      formData.set("check_number", recordPaymentForm.check_number);
      formData.set("payer_name", recordPaymentForm.payer_name);
      formData.set("paid_at", recordPaymentForm.paid_at);
      formData.set("notes", recordPaymentForm.notes);
      formData.set("bill_ids", JSON.stringify(recordPaymentForm.bill_ids));
      if (recordPaymentForm.file) formData.set("file", recordPaymentForm.file);
      const res = await fetch("/api/payment-records", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");
      setRecordPaymentMessage({
        type: "success",
        text: data.billsMarkedPaid
          ? `Payment recorded. ${data.billsMarkedPaid} bill(s) marked paid.`
          : "Payment recorded.",
      });
      setRecordPaymentOpen(false);
      setRecordPaymentForm({
        amount: "",
        check_number: "",
        payer_name: "",
        paid_at: new Date().toISOString().slice(0, 10),
        notes: "",
        bill_ids: [],
        file: null,
      });
      fetch("/api/invoices").then((r) => r.json()).then((d) => setInvoices(d.invoices || []));
      fetch("/api/bills").then((r) => r.json()).then((d) => setBills(d.bills || []));
    } catch (err) {
      setRecordPaymentMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to record payment",
      });
    } finally {
      setRecordPaymentSubmitting(false);
    }
  };

  const toggleRecordPaymentBill = (id: string) => {
    setRecordPaymentForm((f) => ({
      ...f,
      bill_ids: f.bill_ids.includes(id)
        ? f.bill_ids.filter((x) => x !== id)
        : [...f.bill_ids, id],
    }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedInvoices = filteredInvoices.filter((inv) => selectedIds.has(inv.id));
  const canDelete = selectedInvoices.length > 0;
  const selectableOnPage = paginatedInvoices;
  const allSelectedOnPage = selectableOnPage.length > 0 && selectableOnPage.every((inv) => selectedIds.has(inv.id));
  const toggleSelectAll = () => {
    if (allSelectedOnPage) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableOnPage.forEach((inv) => next.delete(inv.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableOnPage.forEach((inv) => next.add(inv.id));
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (!canDelete) return;
    if (!window.confirm(`Delete ${selectedInvoices.length} sent bill${selectedInvoices.length === 1 ? "" : "s"}? This cannot be undone.`)) {
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
      if (!res.ok) throw new Error(data.error || "Failed to delete sent bills");
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
          <h1 className="text-2xl font-bold text-slate-900">Sent bills</h1>
          <div className="flex items-center gap-3">
            {!recordPaymentOpen ? (
              <button
                type="button"
                onClick={() => setRecordPaymentOpen(true)}
                className="btn-secondary text-sm py-2"
              >
                Record payment (check / cash)
              </button>
            ) : null}
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
        </div>
        {recordPaymentMessage && (
          <div
            className={`mb-4 rounded-lg border p-3 text-sm ${
              recordPaymentMessage.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {recordPaymentMessage.text}
          </div>
        )}
        {recordPaymentOpen && (
          <div className="card p-6 mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Record payment (check / cash)</h2>
            <form ref={recordPaymentRef} onSubmit={handleRecordPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={recordPaymentForm.amount}
                    onChange={(e) =>
                      setRecordPaymentForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Payment date</label>
                  <input
                    type="date"
                    value={recordPaymentForm.paid_at}
                    onChange={(e) =>
                      setRecordPaymentForm((f) => ({ ...f, paid_at: e.target.value }))
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Check number (optional)</label>
                  <input
                    type="text"
                    value={recordPaymentForm.check_number}
                    onChange={(e) =>
                      setRecordPaymentForm((f) => ({ ...f, check_number: e.target.value }))
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Payer (optional)</label>
                  <input
                    type="text"
                    value={recordPaymentForm.payer_name}
                    onChange={(e) =>
                      setRecordPaymentForm((f) => ({ ...f, payer_name: e.target.value }))
                    }
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  value={recordPaymentForm.notes}
                  onChange={(e) =>
                    setRecordPaymentForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="input min-h-[60px]"
                  rows={2}
                />
              </div>
              <div>
                <label className="label">Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setRecordPaymentForm((f) => ({
                      ...f,
                      file: e.target.files?.[0] ?? null,
                    }))
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="label">Mark these bills paid</label>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {unpaidBills.length === 0 ? (
                    <p className="text-sm text-slate-500">No unpaid bills</p>
                  ) : (
                    unpaidBills.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recordPaymentForm.bill_ids.includes(b.id)}
                          onChange={() => toggleRecordPaymentBill(b.id)}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {(b.customers as { name?: string })?.name ?? "—"} —{" "}
                          {formatMoney(b.balance_cents)} — {b.due_date}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={recordPaymentSubmitting}
                  className="btn-primary"
                >
                  {recordPaymentSubmitting ? "Saving…" : "Record payment"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecordPaymentOpen(false);
                    setRecordPaymentMessage(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        {loading ? (
          <div className="card p-8">
            <div className="skeleton h-4 w-32 mb-4" />
            <div className="skeleton h-10 w-full mb-3" />
            <div className="skeleton h-10 w-full mb-3" />
            <div className="skeleton h-10 w-3/4" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-600 mb-4">No sent bills yet.</p>
            <p className="text-sm text-slate-500">Select bills on the Bills page and use &quot;Send bill&quot; to create a PDF and send to customers.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by sent bill # or customer…"
                className="input flex-1 min-w-[200px] max-w-xs"
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="input w-36"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="input w-36"
              />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-32">
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="void">Void</option>
              </select>
              <button
                type="button"
                onClick={() => { setShowAll(!showAll); setPage(1); }}
                className="btn-secondary text-sm"
              >
                {showAll ? "Paginate" : "Show all"}
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setStatusFilter(""); setPage(1); }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-left">
                  <th className="w-10 p-3 text-center">
                    {selectableOnPage.length > 0 ? (
                      <input
                        type="checkbox"
                        checked={allSelectedOnPage}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        title="Select all"
                        aria-label="Select all"
                      />
                    ) : (
                      <span className="sr-only">Select</span>
                    )}
                  </th>
                  <th className="p-3 font-semibold text-slate-700">Sent bill #</th>
                  <th className="p-3 font-semibold text-slate-700">Customer</th>
                  <th className="p-3 font-semibold text-slate-700">Issued</th>
                  <th className="p-3 font-semibold text-slate-700">Due</th>
                  <th className="p-3 font-semibold text-slate-700">Total</th>
                  <th className="p-3 font-semibold text-slate-700">Status</th>
                  <th className="p-3 font-semibold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={8} className="p-6 text-center text-slate-500">No sent bills match your search.</td></tr>
                ) : (
                paginatedInvoices.map((inv) => (
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
                ))
                )}
              </tbody>
            </table>
            </div>
            {!showAll && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-500">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
