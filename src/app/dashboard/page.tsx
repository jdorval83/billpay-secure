"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

type Customer = { id: string };
type Bill = {
  id: string;
  customer_id: string;
  amount_cents: number;
  balance_cents: number;
  due_date: string;
  description: string;
  status: string;
  created_at?: string;
  paid_at?: string | null;
  customers?: { name?: string | null } | null;
};

type StatsData = {
  totalOutstanding: number;
  billedInPeriod: number;
  paymentsInPeriod: number;
  byWeek: { week: string; label: string; charges: number; payments: number }[];
  aging: { bucket: string; amountCents: number }[];
  rangeFrom: string;
  rangeTo: string;
};

const AGING_BUCKETS = [
  { key: "Current", label: "Current", minDays: -Infinity, maxDays: 0 },
  { key: "1-7", label: "1–7 days", minDays: 1, maxDays: 7 },
  { key: "8-14", label: "8–14 days", minDays: 8, maxDays: 14 },
  { key: "15-21", label: "15–21 days", minDays: 15, maxDays: 21 },
  { key: "22-30", label: "22–30 days", minDays: 22, maxDays: 30 },
  { key: "31+", label: "31+ days", minDays: 31, maxDays: Infinity },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [rangeFrom, setRangeFrom] = useState(() => {
    const s = new Date();
    s.setDate(s.getDate() - 27);
    return s.toISOString().slice(0, 10);
  });
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<{
    label: string;
    bills: Bill[];
  } | null>(null);

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams({ from: rangeFrom, to: rangeTo });
    Promise.all([
      fetch(`/api/dashboard/stats?${params}`, { credentials: "include" })
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/customers", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => d.customers || []),
      fetch("/api/bills", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => d.bills || [])
        .catch(() => []),
    ]).then(([statsRes, custs, bils]) => {
      if (statsRes && !statsRes.error) setStats(statsRes);
      setCustomers(custs);
      setBills(bils);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [rangeFrom, rangeTo]);

  const formatMoney = (cents: number) =>
    "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  const { unpaid, agingByBucket } = useMemo(() => {
    const unpaidBills = bills.filter(
      (b) => (b.balance_cents ?? 0) > 0 && (b.status || "").toLowerCase() !== "void"
    );
    const today = new Date();
    const aging = AGING_BUCKETS.map(({ key, label, minDays, maxDays }) => {
      const bucketBills = unpaidBills.filter((b) => {
        const due = new Date(b.due_date + "T00:00:00");
        const daysOverdue = Math.floor(
          (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysOverdue >= minDays && daysOverdue <= maxDays;
      });
      const amount = bucketBills.reduce((s, b) => s + (b.balance_cents ?? 0), 0);
      return { key, label, amountCents: amount, bills: bucketBills };
    });
    return { unpaid: unpaidBills, agingByBucket: aging };
  }, [bills]);

  const paidCount = useMemo(
    () => bills.filter((b) => (b.status || "").toLowerCase() === "paid").length,
    [bills]
  );

  const weeklyChartData = useMemo(() => {
    if (!stats?.byWeek?.length) return [];
    return stats.byWeek.map((w) => ({
      ...w,
      chargesD: w.charges / 100,
      paymentsD: w.payments / 100,
    }));
  }, [stats?.byWeek]);

  const agingChartData = useMemo(() => {
    const data = stats?.aging ?? agingByBucket.map((a) => ({ bucket: a.key, amountCents: a.amountCents }));
    return data.map((a) => ({
      ...a,
      amount: (a.amountCents ?? 0) / 100,
    }));
  }, [stats?.aging, agingByBucket]);

  const handleAgingClick = (bucketKey: string) => {
    const bucket = agingByBucket.find((a) => a.key === bucketKey);
    if (bucket) setSelectedAgingBucket({ label: bucket.label, bills: bucket.bills });
  };

  const totalOutstanding = stats?.totalOutstanding ?? unpaid.reduce((s, b) => s + (b.balance_cents ?? 0), 0);
  const hasAnyData = (stats?.totalOutstanding ?? 0) > 0 || bills.length > 0 || customers.length > 0;

  if (loading && !stats) {
    return (
      <main className="page-container">
        <div className="content-max max-w-6xl">
          <div className="skeleton h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6">
                <div className="skeleton h-4 w-24 mb-3" />
                <div className="skeleton h-10 w-32" />
              </div>
            ))}
          </div>
          <div className="card p-6 skeleton h-80" />
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="content-max max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/customers/new" className="btn-primary text-sm">
              Add Customer
            </Link>
            <Link href="/bills/new" className="btn-secondary text-sm">
              New bill
            </Link>
          </div>
        </div>

        {!hasAnyData ? (
          <div className="card p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Get started</h2>
              <p className="text-slate-600 text-sm mb-6">
                Add customers and create bills to see your receivables here.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/customers/new" className="btn-primary">
                  Add Customer
                </Link>
                <Link href="/bills/new" className="btn-secondary">
                  New bill
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Link
                href="/bills"
                className="card p-6 block border-l-4 border-l-amber-500 bg-white hover:shadow-md transition-shadow"
              >
                <p className="text-sm font-medium text-slate-600">Total outstanding</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{formatMoney(totalOutstanding)}</p>
                <p className="text-xs text-slate-500 mt-2">Unpaid receivables →</p>
              </Link>
              <Link href="/bills" className="card-hover p-6 block">
                <p className="text-sm font-medium text-slate-600">Unpaid bills</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{unpaid.length}</p>
                <p className="text-xs text-slate-500 mt-2">View bills →</p>
              </Link>
              <Link href="/customers" className="card-hover p-6 block">
                <p className="text-sm font-medium text-slate-600">Customers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
                <p className="text-xs text-slate-500 mt-2">View all →</p>
              </Link>
              <Link href="/bills" className="card-hover p-6 block">
                <p className="text-sm font-medium text-slate-600">Paid bills</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{paidCount}</p>
                <p className="text-xs text-slate-500 mt-2">View bills →</p>
              </Link>
            </div>

            {/* Period summary (from stats API) */}
            {stats && (stats.billedInPeriod > 0 || stats.paymentsInPeriod > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="card p-4 border border-slate-200/80">
                  <p className="text-sm font-medium text-slate-600">Billed this period</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {formatMoney(stats.billedInPeriod)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.rangeFrom} – {stats.rangeTo}
                  </p>
                </div>
                <div className="card p-4 border border-slate-200/80">
                  <p className="text-sm font-medium text-slate-600">Collected this period</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">
                    {formatMoney(stats.paymentsInPeriod)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats.rangeFrom} – {stats.rangeTo}
                  </p>
                </div>
              </div>
            )}

            {/* Billing activity chart */}
            <div className="card p-6 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-base font-semibold text-slate-800">Billing activity</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600">From</span>
                    <input
                      type="date"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                      className="input py-1.5 text-sm w-36"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-slate-600">To</span>
                    <input
                      type="date"
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                      className="input py-1.5 text-sm w-36"
                    />
                  </label>
                </div>
              </div>
              {weeklyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={weeklyChartData}
                    margin={{ top: 16, right: 16, left: 16, bottom: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => (v ? `${v.slice(5, 7)}/${v.slice(8, 10)}` : "")}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => "$" + (v >= 1000 ? v / 1000 + "k" : String(v))}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(v: number, n: string) => [
                        typeof v === "number"
                          ? "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2 })
                          : v,
                        n === "chargesD" ? "Bills" : "Payments",
                      ]}
                      labelFormatter={(_, items) =>
                        (items?.[0]?.payload?.label as string) || ""
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="chargesD"
                      name="Bills"
                      stroke="#475569"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="paymentsD"
                      name="Payments"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-500 py-12 text-center">
                  No bills or payments in this date range.
                </p>
              )}
            </div>

            {/* Aging */}
            <div className="card p-6 mb-8">
              <h2 className="text-base font-semibold text-slate-800 mb-2">Aging (outstanding)</h2>
              <p className="text-xs text-slate-500 mb-4">
                Current = not yet due. 1–7 days = past due 1–7 days, etc.
              </p>
              {agingChartData.some((a) => a.amount > 0) ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={agingChartData}
                      margin={{ top: 12, right: 12, left: 12, bottom: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => "$" + (v >= 1000 ? v / 1000 + "k" : v)}
                        allowDecimals={false}
                      />
                      <Tooltip
                        formatter={(v: number) => [
                          "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 }),
                          "Outstanding",
                        ]}
                      />
                      <Bar
                        dataKey="amount"
                        fill="#b45309"
                        radius={[4, 4, 0, 0]}
                        name="Outstanding"
                        onClick={(data: { bucket: string }) =>
                          data?.bucket && handleAgingClick(data.bucket)
                        }
                        cursor="pointer"
                      >
                        {agingChartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.amount > 0 ? "#b45309" : "#e2e8f0"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
                    {AGING_BUCKETS.map((b) => {
                      const d = agingChartData.find((a) => a.bucket === b.key);
                      const cents = d ? Math.round((d.amount ?? 0) * 100) : agingByBucket.find((a) => a.key === b.key)?.amountCents ?? 0;
                      const billsForBucket = agingByBucket.find((a) => a.key === b.key)?.bills ?? [];
                      return (
                        <button
                          key={b.key}
                          type="button"
                          onClick={() =>
                            setSelectedAgingBucket({
                              label: b.label,
                              bills: billsForBucket,
                            })
                          }
                          className="rounded-lg bg-slate-50 p-3 text-center hover:bg-slate-100 transition-colors"
                        >
                          <p className="text-xs font-medium text-slate-600">{b.label}</p>
                          <p className="text-base font-bold text-slate-900">
                            {formatMoney(cents)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  {selectedAgingBucket && (
                    <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-slate-700">
                          {selectedAgingBucket.label} — {selectedAgingBucket.bills.length} bill(s)
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSelectedAgingBucket(null)}
                          className="text-sm text-slate-500 hover:text-slate-700"
                        >
                          Close
                        </button>
                      </div>
                      {selectedAgingBucket.bills.length === 0 ? (
                        <p className="text-sm text-slate-500">No bills in this bucket</p>
                      ) : (
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedAgingBucket.bills.map((b) => (
                            <li
                              key={b.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <Link
                                href={`/bills/${b.id}`}
                                className="text-amber-800 hover:underline font-medium"
                              >
                                {(b.customers as { name?: string })?.name ?? "—"}
                              </Link>
                              <span>
                                {formatMoney(b.balance_cents)} — due {b.due_date}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <Link
                    href="/bills"
                    className="inline-block mt-4 text-sm font-medium text-amber-700 hover:text-amber-800"
                  >
                    View all outstanding bills →
                  </Link>
                </>
              ) : (
                <p className="text-sm text-slate-500 py-8 text-center">
                  No outstanding receivables.
                </p>
              )}
            </div>

          </>
        )}
      </div>
    </main>
  );
}
