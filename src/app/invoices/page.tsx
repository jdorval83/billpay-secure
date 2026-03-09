"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

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
