"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const PAGE_SIZE = 20;

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
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  finalized: "Finished",
  billed: "Billed",
  sent: "Sent",
  paid: "Paid",
  written_off: "Written off",
  void: "Void",
};
function StatusBadge({ bill }: { bill: Bill }) {
  const s = (bill.status || "draft").toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (s === "sent" || s === "billed" || s === "finalized") && bill.balance_cents > 0 && bill.due_date < today;
  const displayStatus = isOverdue ? "overdue" : s;
  const styles: Record<string, string> = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    finalized: "bg-sky-50 text-sky-700 border-sky-200",
    finished: "bg-sky-50 text-sky-700 border-sky-200",
    billed: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-indigo-50 text-indigo-700 border-indigo-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    overdue: "bg-rose-50 text-rose-700 border-rose-200",
    written_off: "bg-rose-50 text-rose-600 border-rose-200",
    void: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const style = styles[displayStatus] || styles.draft;
  const label = displayStatus === "overdue" ? "Overdue" : (STATUS_LABELS[s] || s);
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>;
}

function BillsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [recurringFilter, setRecurringFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [blastReminderLoading, setBlastReminderLoading] = useState(false);
  const [blastReminderModal, setBlastReminderModal] = useState<"confirm" | null>(null);
  const [blastReminderData, setBlastReminderData] = useState<{ count: number; recipients: { phone: string; customerName: string; amountCents: number; dueDate: string }[] } | null>(null);
  const [blastSending, setBlastSending] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const outstandingCount = useMemo(() =>
    bills.filter((b) => (b.balance_cents ?? 0) > 0 && ["finalized", "billed", "sent"].includes((b.status || "").toLowerCase())).length,
  [bills]);

  const filteredBills = useMemo(() => {
    let out = bills;
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
      const today = new Date().toISOString().slice(0, 10);
      if (statusFilter === "overdue") {
        out = out.filter((b) => {
          const s = (b.status || "").toLowerCase();
          return (s === "sent" || s === "billed" || s === "finalized") && b.balance_cents > 0 && b.due_date < today;
        });
      } else {
        out = out.filter((b) => (b.status || "").toLowerCase() === statusFilter);
      }
    }
    if (recurringFilter === "__none") out = out.filter((b) => !b.recurring_schedule);
    else if (recurringFilter) out = out.filter((b) => (b.recurring_schedule || "").toLowerCase() === recurringFilter);
    return out;
  }, [bills, search, dateFrom, dateTo, statusFilter, recurringFilter]);

  const paginatedBills = useMemo(() => {
    if (showAll) return filteredBills;
    const start = (page - 1) * PAGE_SIZE;
    return filteredBills.slice(start, start + PAGE_SIZE);
  }, [filteredBills, page, showAll]);

  const totalPages = Math.ceil(filteredBills.length / PAGE_SIZE);
  const hasFilters = search.trim() || dateFrom || dateTo || statusFilter || recurringFilter;

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
    const q = searchParams?.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

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

  const selectableOnPage = paginatedBills.filter((b) => canSelectForInvoice(b) || canFinalize(b) || (b.status || "").toLowerCase() === "finalized" || ["sent", "billed"].includes((b.status || "").toLowerCase()));
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

  const handleBulkStatus = async (status: string, writeoffReason?: string | null) => {
    const ids = selectedBills.map((b) => b.id);
    const eligible = selectedBills.filter((b) => {
      const s = (b.status || "").toLowerCase();
      const allowed = status === "finalized" ? ["draft"] : status === "sent" ? ["finalized"] : ["sent", "billed"];
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: eligible.map((b) => b.id), status, writeoffReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage({ type: "success", text: `${data.updated ?? eligible.length} bill(s) updated.` });
      setSelectedIds(new Set());
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
          <div className="flex flex-wrap items-center gap-3">
            {outstandingCount > 0 && (
              <button
                type="button"
                onClick={async () => {
                  setBlastReminderLoading(true);
                  try {
                    const r = await fetch("/api/reminders/blast");
                    const d = await r.json();
                    const recipients = (d.outstanding || []).map((x: { phone: string; customerName: string; amountCents: number; dueDate: string }) => ({
                      phone: x.phone,
                      customerName: x.customerName,
                      amountCents: x.amountCents,
                      dueDate: x.dueDate,
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
            {canCreateInvoice ? (
              <button type="button" onClick={handleCreateInvoice} disabled={creatingInvoice} className="btn-primary">
                {creatingInvoice ? "Creating…" : `Create invoice (${selectedIds.size})`}
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" onClick={handleDeleteSelected} disabled={deleting} className="btn-secondary">
                {deleting ? "Deleting…" : `Delete (${selectedIds.size})`}
              </button>
            ) : null}
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
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input w-32">
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="finalized">Finished</option>
                <option value="billed">Billed</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="written_off">Written off</option>
                <option value="void">Void</option>
              </select>
              <select value={recurringFilter} onChange={(e) => { setRecurringFilter(e.target.value); setPage(1); }} className="input w-32">
                <option value="">All types</option>
                <option value="weekly">Recurring: Weekly</option>
                <option value="biweekly">Recurring: Biweekly</option>
                <option value="monthly">Recurring: Monthly</option>
                <option value="__none">One-time only</option>
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
                  onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setStatusFilter(""); setRecurringFilter(""); setPage(1); }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear filters
                </button>
              )}
            </div>
            {selectedBills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-sm font-medium text-slate-700">{selectedBills.length} selected</span>
                {selectedBills.every((b) => (b.status || "").toLowerCase() === "draft") && (
                  <button type="button" onClick={() => handleBulkStatus("finalized")} disabled={bulkActionLoading} className="btn-secondary text-sm py-1.5">
                    {bulkActionLoading ? "Updating…" : "Finalize all"}
                  </button>
                )}
                {selectedBills.every((b) => (b.status || "").toLowerCase() === "finalized") && (
                  <button type="button" onClick={() => handleBulkStatus("sent")} disabled={bulkActionLoading} className="btn-secondary text-sm py-1.5">
                    {bulkActionLoading ? "Updating…" : "Mark sent all"}
                  </button>
                )}
                {selectedBills.every((b) => ["sent", "billed"].includes((b.status || "").toLowerCase())) && (
                  <>
                    <button type="button" onClick={() => handleBulkStatus("paid")} disabled={bulkActionLoading} className="btn-secondary text-sm py-1.5">
                      {bulkActionLoading ? "Updating…" : "Mark paid all"}
                    </button>
                    <button type="button" onClick={() => handleBulkStatus("written_off", window.prompt("Reason (optional):") ?? undefined)} disabled={bulkActionLoading} className="btn-secondary text-sm py-1.5 text-rose-700">
                      {bulkActionLoading ? "Updating…" : "Write off all"}
                    </button>
                  </>
                )}
                {canCreateInvoice && (
                  <button type="button" onClick={handleCreateInvoice} disabled={creatingInvoice} className="btn-primary text-sm py-1.5">
                    {creatingInvoice ? "Creating…" : "Create invoice"}
                  </button>
                )}
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
                  <th className="w-28 p-3 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500">No charges match your search.</td></tr>
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
                      {(canSelectForInvoice(b) || canFinalize(b) || (b.status || "").toLowerCase() === "finalized" || ["sent", "billed"].includes((b.status || "").toLowerCase())) ? (
                        <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-slate-900">{(b.customers as { name?: string })?.name ?? "—"}</td>
                    <td className="p-3 text-slate-600">{b.description || "Invoice"}</td>
                    <td className="p-3 font-medium text-slate-900">{format(b.amount_cents)}</td>
                    <td className="p-3 text-slate-600">{b.due_date}</td>
                    <td className="p-3"><StatusBadge bill={b} /></td>
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
                        if (s === "sent" || s === "billed") {
                          return (
                            <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                              {s === "billed" && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkSent(b)}
                                  disabled={isBusy}
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                                >
                                  {statusChangingId === b.id ? "Updating…" : "Mark sent"}
                                </button>
                              )}
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
                ))
                )}
              </tbody>
            </table>
            </div>
            {!showAll && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-500">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredBills.length)} of {filteredBills.length}
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
        <p className="mt-4 text-xs text-slate-500">
          Draft bills must be <strong>Finalized</strong> before sending. Select bills (same customer) and use <strong>Create invoice</strong> to send.
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
