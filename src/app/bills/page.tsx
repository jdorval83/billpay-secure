"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Bill } from "@/lib/supabase";

const PER_PAGE = 15;

function getBucket(daysOverdue: number): string {
  if (daysOverdue < 0) return "current";
  if (daysOverdue <= 30) return "0-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

const BUCKET_OPTIONS = [
  { value: "", label: "All unpaid" },
  { value: "current", label: "Current" },
  { value: "0-30", label: "1–30 days" },
  { value: "31-60", label: "31–60 days" },
  { value: "61-90", label: "61–90 days" },
  { value: "90+", label: "90+ days" },
];

function BillsPageContent() {
  const searchParams = useSearchParams();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLink, setLoadingLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [bucketFilter, setBucketFilter] = useState(searchParams.get("bucket") || "");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const bucket = searchParams.get("bucket");
    if (bucket) setBucketFilter(bucket);
    const p = searchParams.get("page");
    if (p) setPage(Math.max(1, parseInt(p, 10)));
  }, [searchParams]);

  const refresh = () => {
    fetch("/api/bills")
      .then((r) => r.json())
      .then((data) => setBills(data.bills || []));
  };

  useEffect(() => {
    fetch("/api/bills")
      .then((r) => r.json())
      .then((data) => {
        setBills(data.bills || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGetLink = async (bill: Bill) => {
    if (bill.status === "paid") return;
    setLoadingLink(bill.id);
    try {
      const res = await fetch(`/api/bills/${bill.id}/payment-link`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const url = data.url as string;
      await navigator.clipboard.writeText(url);
      setCopied(bill.id);
      setTimeout(() => setCopied(null), 2000);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to get payment link");
    } finally {
      setLoadingLink(null);
    }
  };

  const formatAmount = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const unpaidBills = bills.filter((b) => b.balance_cents > 0);
  const paidBills = bills.filter((b) => b.balance_cents === 0 || b.status === "paid");
  const filtered = bucketFilter === "paid"
    ? paidBills
    : bucketFilter
      ? unpaidBills.filter((b) => {
          const d = daysOverdue(b.due_date);
          return getBucket(d) === bucketFilter;
        })
      : unpaidBills;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PER_PAGE;
  const paginated = filtered.slice(start, start + PER_PAGE);

  const updateUrl = (newBucket: string, newPage: number) => {
    const params = new URLSearchParams();
    if (newBucket) params.set("bucket", newBucket);
    if (newPage > 1) params.set("page", String(newPage));
    const q = params.toString();
    window.history.replaceState(null, "", q ? `/bills?${q}` : "/bills");
  };

  const handleBucketChange = (val: string) => {
    setBucketFilter(val);
    setPage(1);
    updateUrl(val, 1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    updateUrl(bucketFilter, p);
  };

  return (
    <main className="bills-page">
      <div className="bills-container">
        <div className="bills-header">
          <h1 className="bills-title">{bucketFilter === "paid" ? "Paid Bills" : "Bills"}</h1>
          <Link href="/bills/new" className="btn-primary-sm">
            New Bill
          </Link>
        </div>

        <div className="bills-tabs">
          <Link
            href="/bills"
            className={`bills-tab ${bucketFilter !== "paid" ? "bills-tab-active" : ""}`}
          >
            Unpaid
          </Link>
          <Link
            href="/bills?bucket=paid"
            className={`bills-tab ${bucketFilter === "paid" ? "bills-tab-active" : ""}`}
          >
            Paid ({paidBills.length})
          </Link>
        </div>

        {loading ? (
          <p className="bills-loading">Loading...</p>
        ) : bills.length === 0 ? (
          <div className="bills-empty">
            <p>No bills yet. Create one to get started.</p>
            <Link href="/bills/new" className="dash-link">Create your first bill →</Link>
          </div>
        ) : (
          <>
            <div className="bills-toolbar">
              {bucketFilter !== "paid" && (
                <label className="bills-filter">
                  <span>Aging:</span>
                  <select
                    value={bucketFilter}
                    onChange={(e) => handleBucketChange(e.target.value)}
                    className="bills-select"
                  >
                    {BUCKET_OPTIONS.filter((o) => o.value !== "paid").map((opt) => (
                      <option key={opt.value || "all"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <span className="bills-count">
                {filtered.length} bill{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="bills-table-wrap">
              <table className="bills-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((b) => {
                    const isPaid = b.balance_cents === 0 || b.status === "paid";
                    return (
                    <tr key={b.id} className={isPaid ? "bills-row-paid" : ""}>
                      <td className="bills-cell-customer">{b.customers?.name ?? "—"}</td>
                      <td>{b.description || "Invoice"}</td>
                      <td className={`bills-cell-amount ${isPaid ? "bills-cell-amount-paid" : ""}`}>{formatAmount(b.amount_cents)}</td>
                      <td>{b.due_date}</td>
                      <td>
                        <span className={`bills-status bills-status-${b.status}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        {b.status === "paid" ? (
                          <span className="bills-muted">—</span>
                        ) : (
                          <button
                            onClick={() => handleGetLink(b)}
                            disabled={loadingLink === b.id}
                            className="bills-btn-link"
                          >
                            {loadingLink === b.id ? "…" : copied === b.id ? "Copied!" : b.payment_link ? "Copy link" : "Get link"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="bills-pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="bills-page-btn"
                >
                  ← Previous
                </button>
                <span className="bills-page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="bills-page-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function BillsPage() {
  return (
    <Suspense fallback={<main className="bills-page"><div className="bills-container"><p className="bills-loading">Loading...</p></div></main>}>
      <BillsPageContent />
    </Suspense>
  );
}
