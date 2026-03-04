"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Customer = { id: string };

type Bill = {
  id: string;
  amount_cents: number;
  balance_cents: number;
  due_date: string;
  description: string;
  status: string;
  customers?: { name?: string | null } | null;
};

type BucketKey = "Current" | "1-30" | "31-60" | "61-90" | "90+";
type SortKey = "age" | "due_date" | "amount" | "name";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<BucketKey>("Current");
  const [sortKey, setSortKey] = useState<SortKey>("age");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
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

  const {
    unpaid,
    paid,
    totalAR,
    bucketSummaries,
    bucketBillsSorted,
  } = useMemo(() => {
    const today = new Date();

    const parseDate = (value: string) => {
      // Ensure consistent parsing for YYYY-MM-DD strings
      return new Date(value + "T00:00:00");
    };

    const getDaysPastDue = (due: string) => {
      const dueDate = parseDate(due);
      const diffMs = today.getTime() - dueDate.getTime();
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

    const billsWithMeta = unpaidBills.map((b) => {
      const daysPastDue = getDaysPastDue(b.due_date);
      const bucket = getBucket(b);
      return { ...b, daysPastDue, bucket };
    });

    const summaries = bucketOrder.map((bucket) => {
      const bucketBills = billsWithMeta.filter((b) => b.bucket === bucket);
      const bucketTotal = bucketBills.reduce((sum, b) => sum + b.balance_cents, 0);
      return { bucket, count: bucketBills.length, totalCents: bucketTotal };
    });

    const bucketBillsByKey: Record<BucketKey, typeof billsWithMeta> = {
      Current: [],
      "1-30": [],
      "31-60": [],
      "61-90": [],
      "90+": [],
    };

    for (const b of billsWithMeta) {
      bucketBillsByKey[b.bucket].push(b);
    }

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
      if (sortKey === "age") {
        return (a.daysPastDue - b.daysPastDue) * dir;
      }
      if (sortKey === "due_date") {
        return (a.due_date.localeCompare(b.due_date)) * dir;
      }
      if (sortKey === "amount") {
        return (a.amount_cents - b.amount_cents) * dir;
      }
      // name
      const aName = (a.customers as { name?: string } | undefined)?.name ?? "";
      const bName = (b.customers as { name?: string } | undefined)?.name ?? "";
      return aName.localeCompare(bName) * dir;
    });
    return copy;
  }, [visibleBucketBillsRaw, sortKey, sortDir]);

  const bucketOrder: BucketKey[] = ["Current", "1-30", "31-60", "61-90", "90+"];

  const handleSort = (key: SortKey) => {
    setSortDir((prevDir) => (sortKey === key ? (prevDir === "asc" ? "desc" : "asc") : "asc"));
    setSortKey(key);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse rounded bg-slate-200 h-8 w-40 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="animate-pulse rounded bg-slate-200 h-4 w-20 mb-3" />
              <div className="animate-pulse rounded bg-slate-200 h-8 w-24" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="animate-pulse rounded bg-slate-200 h-4 w-24 mb-3" />
              <div className="animate-pulse rounded bg-slate-200 h-8 w-12" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="animate-pulse rounded bg-slate-200 h-4 w-20 mb-3" />
              <div className="animate-pulse rounded bg-slate-200 h-8 w-12" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="animate-pulse rounded bg-slate-200 h-4 w-20 mb-3" />
              <div className="animate-pulse rounded bg-slate-200 h-8 w-12" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <p className="text-sm font-medium text-slate-600">Total AR</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatMoney(totalAR)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <p className="text-sm font-medium text-slate-600">Unpaid bills</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{unpaid.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <p className="text-sm font-medium text-slate-600">Customers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <p className="text-sm font-medium text-slate-600">Paid bills</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{paid.length}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-10">
          <Link
            href="/customers/new"
            className="px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Add Customer
          </Link>
          <Link
            href="/bills/new"
            className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-slate-700 transition-colors"
          >
            New Bill
          </Link>
        </div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">Aging buckets</h2>
            <p className="text-xs text-slate-500">
              Click a bucket to see accounts, click headers to sort by age, date, amount, or name.
            </p>
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
                    isActive
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide">{bucket} days</span>
                  <span className="text-sm font-medium">
                    {summary.count} {summary.count === 1 ? "bill" : "bills"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {summary.totalCents ? formatMoney(summary.totalCents) : "$0.00"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {sortedBucketBills.length === 0 ? (
              <div className="p-6 text-sm text-slate-600">
                No unpaid bills in the <span className="font-semibold">{selectedBucket}</span> bucket.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-left">
                    <th
                      className="p-3 font-semibold text-slate-700 cursor-pointer select-none"
                      onClick={() => handleSort("name")}
                    >
                      Customer
                    </th>
                    <th className="p-3 font-semibold text-slate-700">Description</th>
                    <th
                      className="p-3 font-semibold text-slate-700 cursor-pointer select-none"
                      onClick={() => handleSort("due_date")}
                    >
                      Due date
                    </th>
                    <th
                      className="p-3 font-semibold text-slate-700 cursor-pointer select-none"
                      onClick={() => handleSort("age")}
                    >
                      Age (days)
                    </th>
                    <th
                      className="p-3 font-semibold text-slate-700 cursor-pointer select-none"
                      onClick={() => handleSort("amount")}
                    >
                      Amount
                    </th>
                    <th className="p-3 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBucketBills.map((b) => (
                    <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-medium text-slate-900">
                        {(b.customers as { name?: string } | undefined)?.name ?? "—"}
                      </td>
                      <td className="p-3 text-slate-600">{b.description || "Invoice"}</td>
                      <td className="p-3 text-slate-600">{b.due_date}</td>
                      <td className="p-3 text-slate-600">{b.daysPastDue}</td>
                      <td className="p-3 font-medium text-slate-900">{formatMoney(b.amount_cents)}</td>
                      <td className="p-3">
                        <span
                          className={
                            b.status === "paid"
                              ? "text-emerald-600 font-medium"
                              : "text-amber-600 font-medium"
                          }
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {paid.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide uppercase mb-3">
              Recent paid bills
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-left">
                    <th className="p-3 font-semibold text-slate-700">Customer</th>
                    <th className="p-3 font-semibold text-slate-700">Description</th>
                    <th className="p-3 font-semibold text-slate-700">Amount</th>
                    <th className="p-3 font-semibold text-slate-700">Due date</th>
                  </tr>
                </thead>
                <tbody>
                  {paid
                    .slice()
                    .sort((a, b) => b.due_date.localeCompare(a.due_date))
                    .slice(0, 5)
                    .map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="p-3 font-medium text-slate-900">
                          {(b.customers as { name?: string } | undefined)?.name ?? "—"}
                        </td>
                        <td className="p-3 text-slate-600">{b.description || "Invoice"}</td>
                        <td className="p-3 font-medium text-slate-900">{formatMoney(b.amount_cents)}</td>
                        <td className="p-3 text-slate-600">{b.due_date}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
