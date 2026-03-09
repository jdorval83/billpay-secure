"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Bill = {
  id: string;
  customer_id: string;
  amount_cents: number;
  balance_cents: number;
  due_date: string;
  description: string;
  status: string;
  recurring_schedule?: string | null;
  customers?: { name?: string } | null;
  invoicePdfToken?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  ready: "Ready",
  draft: "Ready",
  billed: "Billed",
  finalized: "Billed",
  sent: "Billed",
  past_due: "Past due",
  overdue: "Past due",
  paid: "Paid",
};
function StatusBadge({ bill }: { bill: Bill }) {
  const s = (bill.status || "ready").toLowerCase();
  const displayStatus = s === "draft" ? "ready" : s === "finalized" || s === "sent" ? "billed" : s === "overdue" ? "past_due" : s;
  const styles: Record<string, string> = {
    ready: "bg-sky-50 text-sky-700 border-sky-200",
    billed: "bg-slate-100 text-slate-700 border-slate-200",
    past_due: "bg-rose-50 text-rose-700 border-rose-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const style = styles[displayStatus] || styles.ready;
  const label = STATUS_LABELS[displayStatus] || displayStatus;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}

function BillsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [showFilter, setShowFilter] = useState<"outstanding" | "paid" | "written_off">("outstanding");
  const [recurringFilter, setRecurringFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<20 | 50 | "all">(20);
  const [blastReminderLoading, setBlastReminderLoading] = useState(false);
  const [blastReminderModal, setBlastReminderModal] = useState<"confirm" | null>(null);
  const [blastReminderData, setBlastReminderData] = useState<{ count: number; recipients: { phone: string; customerName: string; amountCents: number; dueDate: string }[] } | null>(null);
  const [blastSending, setBlastSending] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const outstandingCount = useMemo(() =>
    bills.filter((b) => (b.balance_cents ?? 0) > 0 && ["billed", "past_due", "overdue", "finalized", "sent"].includes((b.status || "").toLowerCase())).length,
  [bills]);

  const filteredBills = useMemo(() => {
    let out = bills;
    if (customerFilter) out = out.filter((b) => b.customer_id === customerFilter);
    if (showFilter === "outstanding") {
      out = out.filter((b) => (b.balance_cents ?? 0) > 0 && (b.status || "").toLowerCase() !== "paid");
    } else if (showFilter === "paid") {
      out = out.filter((b) => (b.status || "").toLowerCase() === "paid");
    } else if (showFilter === "written_off") {
      out = out.filter((b) => (b.status || "").toLowerCase() === "written_off");
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (b) =>
          ((b.customers as { name?: string })?.name ?? "").toLowerCase().includes(q) ||
          (b.description ?? "").toLowerCase().includes(q)
      );
    }
    if (dateFrom) out = out.filter((b) => b.due_date >= dateFrom);
    if (dateTo) out = out.filter((b) => b.due_date <= dateTo);
    if (statusFilter) {
      const normalized = (s: string) => (s === "draft" ? "ready" : s === "finalized" || s === "sent" ? "billed" : s === "overdue" ? "past_due" : s);
      if (statusFilter === "past_due") {
        out = out.filter((b) => normalized((b.status || "").toLowerCase()) === "past_due");
      } else {
        out = out.filter((b) => normalized((b.status || "").toLowerCase()) === statusFilter);
      }
    }
    if (recurringFilter === "__none") out = out.filter((b) => !b.recurring_schedule);
    else if (recurringFilter) out = out.filter((b) => (b.recurring_schedule || "").toLowerCase() === recurringFilter);
    return out;
  }, [bills, search, dateFrom, dateTo, statusFilter, recurringFilter, customerFilter, showFilter]);

  const effectivePageSize = pageSize === "all" ? filteredBills.length : pageSize;
  const paginatedBills = useMemo(() => {
    if (pageSize === "all") return filteredBills;
    const start = (page - 1) * pageSize;
    return filteredBills.slice(start, start + pageSize);
  }, [filteredBills, page, pageSize]);

  const totalPages = pageSize === "all" ? 1 : Math.ceil(filteredBills.length / pageSize);
  const hasFilters = search.trim() || dateFrom || dateTo || statusFilter || recurringFilter || customerFilter || showFilter !== "outstanding";

  const fetchBills = () => {
    fetch("/api/bills", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setBills(d.bills || []);
        setSelectedIds(new Set());
      })
      .catch(() => setBills([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const q = searchParams?.get("search");
    if (q != null) setSearch(q || "");
    const cust = searchParams?.get("customer");
    if (cust) setCustomerFilter(cust);
    const show = searchParams?.get("show");
    if (show === "paid" || show === "written_off") setShowFilter(show);
    else if (cust) setShowFilter("outstanding");
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    fetchBills();
  }, []);

  const format = (c: number) => "$" + (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const canSelectForInvoice = (b: Bill) => {
    const s = (b.status || "").toLowerCase();
    return (s === "draft" || s === "ready") && b.balance_cents > 0;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableOnPage = paginatedBills;
  const allSelectedOnPage = selectableOnPage.length > 0 && selectableOnPage.every((b) => selectedIds.has(b.id));
  const toggleSelectAll = () => {
    if (allSelectedOnPage) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableOnPage.forEach((b) => next.delete(b.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectableOnPage.forEach((b) => next.add(b.id));
        return next;
      });
    }
  };

  const selectedBills = filteredBills.filter((b) => selectedIds.has(b.id));
  const sameCustomer = selectedBills.length > 0 && selectedBills.every((b) => b.customer_id === selectedBills[0].customer_id);
  const canCreateInvoice = selectedBills.length > 0 && sameCustomer;
  const canDelete = selectedBills.length > 0;

  const handleResendOne = async (bill: Bill) => {
    setActioningId(bill.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/bills/${bill.id}/resend`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      setMessage({ type: "success", text: data.message || "Payment link sent." });
      fetchBills();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to resend" });
    } finally {
      setActioningId(null);
    }
  };

  const updateOneStatus = async (bill: Bill, status: string, writeoffReason?: string | null) => {
    setActioningId(bill.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, writeoffReason }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage({ type: "success", text: "Bill updated." });
      fetchBills();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to update" });
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteOne = async (bill: Bill) => {
    if (!window.confirm("Delete this bill? This cannot be undone.")) return;
    setActioningId(bill.id);
    setMessage(null);
    try {
      const res = await fetch("/api/bills", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [bill.id] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage({ type: "success", text: "Bill deleted." });
      fetchBills();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setActioningId(null);
    }
  };

  const handleBulkStatus = async (status: string, writeoffReason?: string | null) => {
    const ids = selectedBills.map((b) => b.id);
    const eligible = selectedBills.filter((b) => {
      const s = (b.status || "").toLowerCase();
      const allowed = status === "billed" ? ["draft", "ready"] : ["billed", "past_due", "overdue"];
      return allowed.includes(s);
    });
    if (eligible.length === 0) {
      setMessage({ type: "error", text: `No selected bills can be ${status.replace("_", " ")}.` });
      return;
    }
    setBulkActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/bills", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: eligible.map((b) => b.id), status, writeoffReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage({ type: "success", text: `${data.updated ?? eligible.length} bill(s) updated.` });
      setSelectedIds(new Set());
      if (status === "billed") setStatusFilter("");
      fetchBills();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!canCreateInvoice) return;
    const customerId = selectedBills[0].customer_id;
    const billIds = selectedBills.map((b) => b.id);
    setCreatingInvoice(true);
    setMessage(null);
    try {
      const res = await fetch("/api/invoices", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, billIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create sent bill");
      setMessage({ type: "success", text: "Bill sent." });
      setSelectedIds(new Set());
      setStatusFilter("");
      fetchBills();
      router.push("/invoices");
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to create sent bill" });
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
      const res = await fetch("/api/bills", { method: "DELETE", credentials: "include",
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
          <div className="flex flex-wrap items-center gap-3">
            {outstandingCount > 0 && (
              <button
                type="button"
                onClick={async () => {
                  setBlastReminderLoading(true);
                  try {
                    const r = await fetch("/api/reminders/blast", { credentials: "include" });
                    const d = await r.json();
                    const recipients = (d.outstanding || []).map((x: { phone: string; customerName: string; amountCents: number; dueDate: string; paymentUrl?: string }) => ({
                      phone: x.phone,
                      customerName: x.customerName,
                      amountCents: x.amountCents,
                      dueDate: x.dueDate,
                      paymentUrl: x.paymentUrl,
                    }));
                    setBlastReminderData({ count: recipients.length, recipients });
                    setBlastReminderModal("confirm");
                  } catch {
                    setMessage({ type: "error", text: "Could not load outstanding bills." });
                  } finally {
                    setBlastReminderLoading(false);
                  }
                }}
                disabled={blastReminderLoading}
                className="btn-secondary"
              >
                {blastReminderLoading ? "Loading…" : `Remind all (${outstandingCount})`}
              </button>
            )}
            <Link href="/bills/new" className="btn-secondary">New bill</Link>
          </div>
        </div>
        {message && (
          <div className={`mb-4 rounded-lg border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {message.text}
          </div>
        )}
        {blastReminderModal === "confirm" && blastReminderData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setBlastReminderModal(null); setBlastReminderData(null); }}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Send text reminders</h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to send a text reminder for all {blastReminderData.count} outstanding bill{blastReminderData.count !== 1 ? "s" : ""}?
              </p>
              {blastReminderData.recipients.length === 0 ? (
                <p className="text-sm text-amber-600 mb-4">No customer phone numbers on file. Add phone numbers to customers to send text reminders.</p>
              ) : null}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (blastReminderData.recipients.length === 0) {
                      setBlastReminderModal(null);
                      setBlastReminderData(null);
                      return;
                    }
                    setBlastSending(true);
                    try {
                      const r = await fetch("/api/reminders/send-sms", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ recipients: blastReminderData.recipients }),
                      });
                      const data = await r.json();
                      if (!r.ok) {
                        setMessage({ type: "error", text: data.error || "Failed to send texts." });
                      } else {
                        setMessage({ type: "success", text: `Text reminders sent to ${data.sent} of ${data.total} customer${data.total !== 1 ? "s" : ""}.` });
                        setBlastReminderModal(null);
                        setBlastReminderData(null);
                        fetchBills();
                      }
                    } catch {
                      setMessage({ type: "error", text: "Failed to send text reminders." });
                    } finally {
                      setBlastSending(false);
                    }
                  }}
                  disabled={blastReminderData.recipients.length === 0 || blastSending}
                  className="btn-primary"
                >
                  {blastSending ? "Sending…" : "Send"}
                </button>
                <button type="button" onClick={() => { setBlastReminderModal(null); setBlastReminderData(null); }} className="btn-secondary" disabled={blastSending}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {bills.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-600 mb-4">No bills yet.</p>
            <Link href="/bills/new" className="btn-primary inline-block">Create your first bill</Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by customer or description…"
                className="input flex-1 min-w-[200px] max-w-xs"
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                placeholder="From"
                className="input w-36"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                placeholder="To"
                className="input w-36"
              />
              {customerFilter && (
                <select value={showFilter} onChange={(e) => { setShowFilter(e.target.value as "outstanding" | "paid" | "written_off"); setPage(1); }} className="input w-36">
                  <option value="outstanding">Outstanding only</option>
                  <option value="paid">Paid</option>
                  <option value="written_off">Written off</option>
                </select>
              )}
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-32">
                <option value="">All statuses</option>
                <option value="ready">Ready</option>
                <option value="billed">Billed</option>
                <option value="past_due">Past due</option>
                <option value="paid">Paid</option>
              </select>
              <select value={recurringFilter} onChange={(e) => { setRecurringFilter(e.target.value); setPage(1); }} className="input w-32">
                <option value="">All types</option>
                <option value="weekly">Recurring: Weekly</option>
                <option value="biweekly">Recurring: Biweekly</option>
                <option value="monthly">Recurring: Monthly</option>
                <option value="__none">One-time only</option>
              </select>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch(""); setDateFrom(""); setDateTo(""); setStatusFilter(""); setRecurringFilter(""); setCustomerFilter(""); setShowFilter("outstanding"); setPage(1);
                    if (customerFilter) router.replace("/bills");
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear filters
                </button>
              )}
            </div>
            {selectedBills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-sm font-medium text-slate-700">{selectedBills.length} selected</span>
                {selectedBills.some((b) => ["ready", "draft"].includes((b.status || "").toLowerCase())) && (
                  <button
                    type="button"
                    onClick={handleCreateInvoice}
                    disabled={!canCreateInvoice || creatingInvoice || bulkActionLoading}
                    className="btn-primary text-sm py-1.5"
                    title={!canCreateInvoice ? "Select bills from one customer to send" : undefined}
                  >
                    {(creatingInvoice || bulkActionLoading) ? "Sending…" : "SEND BILL"}
                  </button>
                )}
                <button type="button" onClick={() => selectedBills.length === 1 && router.push(`/bills/${selectedBills[0].id}`)} disabled={selectedBills.length !== 1} className="btn-secondary text-sm py-1.5" title={selectedBills.length === 1 ? "Edit" : "Select one to edit"}>
                  EDIT
                </button>
                <button type="button" onClick={handleDeleteSelected} disabled={deleting} className="btn-secondary text-sm py-1.5 text-rose-700">
                  {deleting ? "Deleting…" : "DELETE"}
                </button>
                <button type="button" onClick={() => setSelectedIds(new Set())} className="text-sm text-slate-500 hover:text-slate-700">
                  Clear
                </button>
              </div>
            )}
            <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="w-10 p-3 text-center">
                    {selectableOnPage.length > 0 ? (
                      <input type="checkbox" checked={allSelectedOnPage} onChange={toggleSelectAll} className="h-4 w-4 rounded border-slate-300 text-emerald-600" title="Select all" />
                    ) : (
                      <span className="sr-only">Select</span>
                    )}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Customer</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Description</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Amount</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Due</th>
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">Status</th>
                  <th className="p-3 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500">No bills match your search.</td></tr>
                ) : (
                paginatedBills.map((b) => (
                  <tr
                    key={b.id}
                    className={`border-b border-slate-100 transition-colors ${selectedIds.has(b.id) ? "bg-emerald-50/50" : "hover:bg-slate-50/50"} cursor-pointer`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button, input, a")) return;
                      router.push(`/bills/${b.id}`);
                    }}
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    </td>
                    <td className="p-3 font-medium text-slate-900">{(b.customers as { name?: string })?.name ?? "—"}</td>
                    <td className="p-3 text-slate-600">{b.description || "Bill"}</td>
                    <td className="p-3 font-medium text-slate-900">{format(b.amount_cents)}</td>
                    <td className="p-3 text-slate-600">{b.due_date}</td>
                    <td className="p-3"><StatusBadge bill={b} /></td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap justify-end gap-1">
                        <button type="button" onClick={() => router.push(`/bills/${b.id}`)} className="text-sm font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100">View</button>
                        {["draft", "ready"].includes((b.status || "").toLowerCase()) && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setActioningId(b.id);
                              setMessage(null);
                              try {
                                const res = await fetch("/api/invoices", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ customerId: b.customer_id, billIds: [b.id] }),
                                  credentials: "include",
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || "Failed to send");
                                setMessage({ type: "success", text: "Bill sent." });
                                fetchBills();
                                router.push("/invoices");
                              } catch (err) {
                                setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to send" });
                              } finally {
                                setActioningId(null);
                              }
                            }}
                            disabled={actioningId === b.id}
                            className="text-sm font-medium text-emerald-600 hover:text-emerald-800 px-2 py-1 rounded hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {actioningId === b.id ? "…" : "Send"}
                          </button>
                        )}
                        {b.invoicePdfToken && (
                          <a
                            href={`/api/public/invoices/${b.invoicePdfToken}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                          >
                            PDF
                          </a>
                        )}
                        {["billed", "past_due", "overdue", "finalized", "sent"].includes((b.status || "").toLowerCase()) && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleResendOne(b); }}
                              disabled={actioningId === b.id}
                              className="text-sm font-medium text-slate-600 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50"
                            >
                              {actioningId === b.id ? "…" : "Resend"}
                            </button>
                          </>
                        )}
                        <button type="button" onClick={() => handleDeleteOne(b)} disabled={actioningId === b.id} className="text-sm font-medium text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 disabled:opacity-50">{actioningId === b.id ? "…" : "Delete"}</button>
                      </div>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPageSize(v === "all" ? "all" : (parseInt(v, 10) as 20 | 50));
                    setPage(1);
                  }}
                  className="input text-sm py-1.5 px-2 w-20"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value="all">All</option>
                </select>
                <span className="text-sm text-slate-600">per page</span>
                <span className="text-sm text-slate-500 ml-2">
                  {pageSize === "all"
                    ? `Showing all ${filteredBills.length}`
                    : `Showing ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, filteredBills.length)} of ${filteredBills.length}`}
                </span>
              </div>
              {pageSize !== "all" && totalPages > 1 && (
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
              )}
            </div>
          </>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Use the <strong>Actions</strong> column on each row, or select multiple and use the bulk buttons above.
        </p>
      </div>
    </main>
  );
}

export default function BillsPage() {
  return (
    <Suspense fallback={
      <main className="page-container">
        <div className="content-max">
          <div className="skeleton h-8 w-24 mb-6" />
          <div className="card p-8">
            <div className="skeleton h-12 w-full mb-3" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </main>
    }>
      <BillsPageContent />
    </Suspense>
  );
}
