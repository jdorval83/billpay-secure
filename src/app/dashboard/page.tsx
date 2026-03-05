"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";

type Customer = { id: string };
type Bill = {
  id: string;
  customer_id: string;
  amount_cents: number;
  balance_cents: number;
  due_date: string;
  description: string;
  status: string;
  customers?: { name?: string | null } | null;
};
type BucketKey = "Current" | "1-30" | "31-60" | "61-90" | "90+" | "Paid";
type SortKey = "age" | "due_date" | "amount" | "name";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<BucketKey>("Current");
  const [sortKey, setSortKey] = useState<SortKey>("age");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/bills").then((r) => r.json()).catch(() => ({ bills: [] })),
    ]).then(([cRes, bRes]) => {
      setCustomers(cRes.customers || []);
      setBills(bRes.bills || []);
      setLoading(false);
    });
  }, []);

  const formatMoney = (cents: number) =>
    "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  const { unpaid, paid, totalAR, bucketSummaries, bucketBillsSorted } = useMemo(() => {
    const today = new Date();
    const parseDate = (value: string) => new Date(value + "T00:00:00");
    const getDaysPastDue = (due: string) => {
      const diffMs = today.getTime() - parseDate(due).getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };
    const getBucket = (bill: Bill): BucketKey => {
      const days = getDaysPastDue(bill.due_date);
      if (days <= 0) return "Current";
      if (days <= 30) return "1-30";
      if (days <= 60) return "31-60";
      if (days <= 90) return "61-90";
      return "90+";
    };
    const unpaidBills = bills.filter((b) => b.balance_cents > 0);
    const paidBills = bills.filter((b) => b.balance_cents <= 0 || b.status === "paid");
    const total = unpaidBills.reduce((sum, b) => sum + b.balance_cents, 0);
    const bucketOrder: BucketKey[] = ["Current", "1-30", "31-60", "61-90", "90+"];
    const billsWithMeta = unpaidBills.map((b) => ({
      ...b,
      daysPastDue: getDaysPastDue(b.due_date),
      bucket: getBucket(b),
    }));
    const summaries = bucketOrder.map((bucket) => {
      const bucketBills = billsWithMeta.filter((b) => b.bucket === bucket);
      return {
        bucket,
        count: bucketBills.length,
        totalCents: bucketBills.reduce((s, b) => s + b.balance_cents, 0),
      };
    });
    const bucketBillsByKey: Record<BucketKey, typeof billsWithMeta> = {
      Current: [],
      "1-30": [],
      "31-60": [],
      "61-90": [],
      "90+": [],
    };
    billsWithMeta.forEach((b) => bucketBillsByKey[b.bucket].push(b));
    return {
      unpaid: unpaidBills,
      paid: paidBills,
      totalAR: total,
      bucketSummaries: summaries,
      bucketBillsSorted: bucketBillsByKey,
    };
  }, [bills]);

  const visibleBucketBillsRaw = bucketBillsSorted[selectedBucket] || [];
  const sortedBucketBills = useMemo(() => {
    const copy = [...visibleBucketBillsRaw];
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "age") return (a.daysPastDue - b.daysPastDue) * dir;
      if (sortKey === "due_date") return a.due_date.localeCompare(b.due_date) * dir;
      if (sortKey === "amount") return (a.amount_cents - b.amount_cents) * dir;
      const aName = (a.customers as { name?: string })?.name ?? "";
      const bName = (b.customers as { name?: string })?.name ?? "";
      return aName.localeCompare(bName) * dir;
    });
    return copy;
  }, [visibleBucketBillsRaw, sortKey, sortDir]);

  const bucketOrder: BucketKey[] = ["Current", "1-30", "31-60", "61-90", "90+"];
  const handleSort = (key: SortKey) => {
    setSortDir((prev) => (sortKey === key ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(key);
  };

  const canSelectForInvoice = (b: Bill & { daysPastDue?: number; bucket?: BucketKey }) => {
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
      Promise.all([
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/bills").then((r) => r.json()).catch(() => ({ bills: [] })),
      ]).then(([cRes, bRes]) => {
        setCustomers(cRes.customers || []);
        setBills(bRes.bills || []);
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to create invoice" });
    } finally {
      setCreatingInvoice(false);
    }
  };

  const scrollToSection = () => sectionRef.current?.scrollIntoView({ behavior: "smooth" });

  if (loading) {
    return (
      <main className="page-container">
        <div className="content-max">
          <div className="skeleton h-8 w-40 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-hover p-6">
                <div className="skeleton h-4 w-20 mb-3" />
                <div className="skeleton h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="content-max">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button type="button" onClick={scrollToSection} className="card-hover p-6 text-left w-full">
            <p className="text-sm font-medium text-slate-600">Total AR</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatMoney(totalAR)}</p>
            <p className="text-xs text-slate-500 mt-2">Click to view aging</p>
          </button>
          <button type="button" onClick={() => { const first = bucketOrder.find((b) => (bucketSummaries.find((s) => s.bucket === b)?.count ?? 0) > 0); setSelectedBucket(first || "Current"); scrollToSection(); }} className="card-hover p-6 text-left w-full">
            <p className="text-sm font-medium text-slate-600">Unpaid bills</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{unpaid.length}</p>
            <p className="text-xs text-slate-500 mt-2">Click to drill in</p>
          </button>
          <Link href="/customers" className="card-hover p-6 block">
            <p className="text-sm font-medium text-slate-600">Customers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
            <p className="text-xs text-slate-500 mt-2">View all customers</p>
          </Link>
          <button
            type="button"
            onClick={() => { setSelectedBucket("Paid"); scrollToSection(); }}
            className="card-hover p-6 text-left w-full"
          >
            <p className="text-sm font-medium text-slate-600">Paid bills</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{paid.length}</p>
            <p className="text-xs text-slate-500 mt-2">Click to drill in</p>
          </button>
        </div>
        {message && (
          <div className={`mb-4 rounded-lg border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {message.text}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          {canCreateInvoice && (
            <button
              type="button"
              onClick={handleCreateInvoice}
              disabled={creatingInvoice}
              className="btn-primary"
            >
              {creatingInvoice ? "Creating…" : `Create invoice (${selectedIds.size} bill${selectedIds.size === 1 ? "" : "s"})`}
            </button>
          )}
          <Link href="/customers/new" className="btn-primary">Add Customer</Link>
          <Link href="/bills/new" className="btn-secondary">New Bill</Link>
        </div>
        <section ref={sectionRef} className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">Aging buckets</h2>
            <p className="text-xs text-slate-500">Click a bucket to see accounts; click column headers to sort.</p>
          </div>
          <div className="flex flex-wrap gap-3 mb-6">
            {bucketOrder.map((bucket) => {
              const summary = bucketSummaries.find((s) => s.bucket === bucket)!;
              const isActive = selectedBucket === bucket;
              return (
                <button
                  key={bucket}
                  type="button"
                  onClick={() => setSelectedBucket(bucket)}
                  className={`flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors ${
                    isActive ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide">{bucket} days</span>
                  <span className="text-sm font-medium">{summary.count} {summary.count === 1 ? "bill" : "bills"}</span>
                  <span className="text-xs text-slate-500">{summary.totalCents ? formatMoney(summary.totalCents) : "$0.00"}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedBucket("Paid")}
              className={`flex flex-col items-start px-4 py-3 rounded-lg border text-left transition-colors ${
                selectedBucket === "Paid" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide">Paid</span>
              <span className="text-sm font-medium">{paid.length} {paid.length === 1 ? "bill" : "bills"}</span>
              <span className="text-xs text-slate-500">—</span>
            </button>
          </div>
          <div className="card overflow-hidden">
            {selectedBucket === "Paid" ? (
              paid.length === 0 ? (
                <div className="p-6 text-sm text-slate-600">No paid bills yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-left">
                      <th className="p-3 font-semibold text-slate-700">Customer</th>
                      <th className="p-3 font-semibold text-slate-700">Description</th>
                      <th className="p-3 font-semibold text-slate-700">Amount</th>
                      <th className="p-3 font-semibold text-slate-700">Due date</th>
                      <th className="p-3 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paid.slice().sort((a, b) => b.due_date.localeCompare(a.due_date)).map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-medium text-slate-900">{(b.customers as { name?: string })?.name ?? "—"}</td>
                        <td className="p-3 text-slate-600">{b.description || "Invoice"}</td>
                        <td className="p-3 font-medium text-slate-900">{formatMoney(b.amount_cents)}</td>
                        <td className="p-3 text-slate-600">{b.due_date}</td>
                        <td className="p-3"><span className="text-emerald-600 font-medium">paid</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : sortedBucketBills.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">No unpaid bills in the <span className="font-semibold">{selectedBucket}</span> bucket.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-left">
                    <th className="w-10 p-3 text-center"><span className="sr-only">Select</span></th>
                    <th className="p-3 font-semibold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("name")}>Customer</th>
                    <th className="p-3 font-semibold text-slate-700">Description</th>
                    <th className="p-3 font-semibold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("due_date")}>Due date</th>
                    <th className="p-3 font-semibold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("age")}>Age (days)</th>
                    <th className="p-3 font-semibold text-slate-700 cursor-pointer select-none" onClick={() => handleSort("amount")}>Amount</th>
                    <th className="p-3 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBucketBills.map((b) => (
                    <tr key={b.id} className={`border-b border-slate-100 transition-colors ${selectedIds.has(b.id) ? "bg-emerald-50/50" : "hover:bg-slate-50/60"}`}>
                      <td className="p-3 text-center">
                        {canSelectForInvoice(b) ? (
                          <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-900">{(b.customers as { name?: string })?.name ?? "—"}</td>
                      <td className="p-3 text-slate-600">{b.description || "Invoice"}</td>
                      <td className="p-3 text-slate-600">{b.due_date}</td>
                      <td className="p-3 text-slate-600">{b.daysPastDue}</td>
                      <td className="p-3 font-medium text-slate-900">{formatMoney(b.amount_cents)}</td>
                      <td className="p-3"><span className={b.status === "paid" ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
