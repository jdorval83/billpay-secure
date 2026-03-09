"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

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

type WeekData = { week: string; label: string; charges: number; payments: number };

const AGING_WEEKS = [
  { label: "Current", minDays: -Infinity, maxDays: 0 },
  { label: "Week 1", minDays: 1, maxDays: 7 },
  { label: "Week 2", minDays: 8, maxDays: 14 },
  { label: "Week 3", minDays: 15, maxDays: 21 },
  { label: "Week 4", minDays: 22, maxDays: 28 },
  { label: "Week 5+", minDays: 29, maxDays: Infinity },
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentSubmitting, setRecordPaymentSubmitting] = useState(false);
  const [chartFrom, setChartFrom] = useState(() => {
    const s = new Date();
    s.setDate(s.getDate() - 28);
    return s.toISOString().slice(0, 10);
  });
  const [chartTo, setChartTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedAgingBills, setSelectedAgingBills] = useState<{ label: string; bills: Bill[] } | null>(null);
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

  useEffect(() => {
    Promise.all([
      fetch("/api/customers", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/bills", { credentials: "include" }).then((r) => r.json()).catch(() => ({ bills: [] })),
    ]).then(([cRes, bRes]) => {
      setCustomers(cRes.customers || []);
      setBills(bRes.bills || []);
      setLoading(false);
    });
  }, []);

  const weeklyDataComputed = useMemo(() => {
    if (!chartFrom || !chartTo) return [];
    const startMs = new Date(chartFrom + "T00:00:00").getTime();
    const endMs = new Date(chartTo + "T23:59:59").getTime();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekBuckets: Record<string, { charges: number; payments: number }> = {};
    for (let t = startMs; t <= endMs; t += msPerWeek) {
      const key = new Date(t).toISOString().slice(0, 10);
      weekBuckets[key] = { charges: 0, payments: 0 };
    }
    bills.forEach((b) => {
      const created = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (created >= startMs && created <= endMs) {
        const weekIdx = Math.floor((created - startMs) / msPerWeek);
        const weekStart = new Date(startMs + weekIdx * msPerWeek);
        const key = weekStart.toISOString().slice(0, 10);
        if (weekBuckets[key]) weekBuckets[key].charges += b.amount_cents || 0;
      }
      if ((b.status || "").toLowerCase() === "paid" && b.paid_at) {
        const paid = new Date(b.paid_at).getTime();
        if (paid >= startMs && paid <= endMs) {
          const weekIdx = Math.floor((paid - startMs) / msPerWeek);
          const weekStart = new Date(startMs + weekIdx * msPerWeek);
          const key = weekStart.toISOString().slice(0, 10);
          if (weekBuckets[key]) weekBuckets[key].payments += b.amount_cents || 0;
        }
      }
    });
    return Object.entries(weekBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, { charges, payments }]) => {
        const wEnd = new Date(week);
        wEnd.setDate(wEnd.getDate() + 6);
        return { week, label: `${week} – ${wEnd.toISOString().slice(0, 10)}`, charges, payments };
      });
  }, [chartFrom, chartTo, bills]);

  const formatMoney = (cents: number) =>
    "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  const { unpaid, paid, totalOutstanding, agingByWeek } = useMemo(() => {
    const unpaidBills = bills.filter((b) => (b.balance_cents ?? 0) > 0 && (b.status || "").toLowerCase() !== "void");
    const paidBills = bills.filter((b) => (b.status || "").toLowerCase() === "paid");
    const total = unpaidBills.reduce((sum, b) => sum + (b.balance_cents ?? 0), 0);
    const today = new Date();
    const aging = AGING_WEEKS.map(({ label, minDays, maxDays }) => {
      const bucketBills = unpaidBills.filter((b) => {
        const due = new Date(b.due_date + "T00:00:00");
        const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        return daysOverdue >= minDays && daysOverdue <= maxDays;
      });
      const amount = bucketBills.reduce((s, b) => s + (b.balance_cents ?? 0), 0);
      return { label, amountCents: amount, amount: amount / 100, bills: bucketBills };
    });
    return {
      unpaid: unpaidBills,
      paid: paidBills,
      totalOutstanding: total,
      agingByWeek: aging,
    };
  }, [bills]);

  const refreshData = () => {
    fetch("/api/bills", { credentials: "include" })
      .then((r) => r.json())
      .catch(() => ({ bills: [] }))
      .then((bRes) => setBills(bRes.bills || []));
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(recordPaymentForm.amount || "0") * 100);
    if (amountCents <= 0) {
      setMessage({ type: "error", text: "Enter a valid amount." });
      return;
    }
    setRecordPaymentSubmitting(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("amount_cents", String(amountCents));
      formData.set("check_number", recordPaymentForm.check_number);
      formData.set("payer_name", recordPaymentForm.payer_name);
      formData.set("paid_at", recordPaymentForm.paid_at);
      formData.set("notes", recordPaymentForm.notes);
      formData.set("bill_ids", JSON.stringify(recordPaymentForm.bill_ids));
      if (recordPaymentForm.file) formData.set("file", recordPaymentForm.file);
      const res = await fetch("/api/payment-records", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");
      setMessage({
        type: "success",
        text: data.billsMarkedPaid ? `Payment recorded. ${data.billsMarkedPaid} bill(s) marked paid.` : "Payment recorded.",
      });
      setRecordPaymentOpen(false);
      setRecordPaymentForm({ amount: "", check_number: "", payer_name: "", paid_at: new Date().toISOString().slice(0, 10), notes: "", bill_ids: [], file: null });
      refreshData();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to record payment" });
    } finally {
      setRecordPaymentSubmitting(false);
    }
  };

  const toggleRecordPaymentBill = (id: string) => {
    setRecordPaymentForm((f) => ({
      ...f,
      bill_ids: f.bill_ids.includes(id) ? f.bill_ids.filter((x) => x !== id) : [...f.bill_ids, id],
    }));
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className="content-max">
          <div className="skeleton h-8 w-40 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6">
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
          <Link href="/bills" className="card p-6 block border-2 border-amber-200 bg-amber-50/50 hover:border-amber-300">
            <p className="text-sm font-medium text-slate-600">Total outstanding</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{formatMoney(totalOutstanding)}</p>
            <p className="text-xs text-slate-500 mt-2">View bills →</p>
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
            <p className="text-2xl font-bold text-slate-900 mt-1">{paid.length}</p>
            <p className="text-xs text-slate-500 mt-2">View bills →</p>
          </Link>
        </div>

        <div className="card p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Weekly bills vs payments</h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">From</span>
                <input type="date" value={chartFrom} onChange={(e) => setChartFrom(e.target.value)} className="input py-1.5 text-sm w-36" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">To</span>
                <input type="date" value={chartTo} onChange={(e) => setChartTo(e.target.value)} className="input py-1.5 text-sm w-36" />
              </label>
              <button
                type="button"
                onClick={() => {
                  const s = new Date();
                  s.setDate(s.getDate() - 28);
                  setChartFrom(s.toISOString().slice(0, 10));
                  setChartTo(new Date().toISOString().slice(0, 10));
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Last 4 weeks
              </button>
            </div>
          </div>
          {weeklyDataComputed.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyDataComputed.map((w) => ({ ...w, chargesD: w.charges / 100, paymentsD: w.payments / 100 }))} margin={{ top: 16, right: 16, left: 16, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} tickFormatter={(v) => (v ? `${v.slice(5, 7)}/${v.slice(8, 10)}` : "")} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000) + "k" : String(v))} allowDecimals={false} domain={["auto", "auto"]} width={52} />
                <Tooltip formatter={(v: number, n: string) => [typeof v === "number" ? "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2 }) : v, n === "chargesD" ? "Bills" : "Payments"]} contentStyle={{ fontSize: 13 }} labelFormatter={(_, items) => (items?.[0]?.payload?.label as string) || ""} />
                <Line type="monotone" dataKey="chargesD" name="Bills" stroke="#475569" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="paymentsD" name="Payments" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">No data for this range. Try a different date range.</p>
          )}
        </div>

        <div className="card p-6 mb-8">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Aging by week (outstanding)</h2>
          <p className="text-xs text-slate-500 mb-4">Click a bar for details. Current = not yet past due. Week 1 = 1–7 days past due, etc.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={agingByWeek} margin={{ top: 12, right: 12, left: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000) + "k" : v)} allowDecimals={false} />
              <Tooltip formatter={(v: number) => ["$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 }), "Outstanding"]} />
              <Bar dataKey="amount" fill="#b45309" radius={[4, 4, 0, 0]} name="Outstanding" onClick={(data: { label: string; bills: Bill[] }) => data?.bills && setSelectedAgingBills({ label: data.label, bills: data.bills })} cursor="pointer">
                {agingByWeek.map((entry, i) => (
                  <Cell key={i} fill={entry.amountCents > 0 ? "#b45309" : "#e2e8f0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            {agingByWeek.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => setSelectedAgingBills({ label: a.label, bills: a.bills })}
                className="rounded-lg bg-slate-50 p-3 text-center hover:bg-slate-100 transition-colors"
              >
                <p className="text-xs font-medium text-slate-600">{a.label}</p>
                <p className="text-base font-bold text-slate-900">{formatMoney(a.amountCents)}</p>
              </button>
            ))}
          </div>
          {selectedAgingBills && (
            <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-700">{selectedAgingBills.label} — {selectedAgingBills.bills.length} bill(s)</h3>
                <button type="button" onClick={() => setSelectedAgingBills(null)} className="text-sm text-slate-500 hover:text-slate-700">Close</button>
              </div>
              {selectedAgingBills.bills.length === 0 ? (
                <p className="text-sm text-slate-500">No bills in this bucket</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedAgingBills.bills.map((b) => (
                    <li key={b.id} className="flex items-center justify-between text-sm">
                      <Link href={`/bills/${b.id}`} className="text-amber-800 hover:underline font-medium">{(b.customers as { name?: string })?.name ?? "—"}</Link>
                      <span>{formatMoney(b.balance_cents)} — due {b.due_date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <Link href="/bills" className="inline-block mt-4 text-sm font-medium text-amber-700 hover:text-amber-800">View all outstanding bills →</Link>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">Record payment</h2>
            {!recordPaymentOpen ? (
              <button type="button" onClick={() => setRecordPaymentOpen(true)} className="btn-secondary text-sm py-2">Add payment (check / cash)</button>
            ) : null}
          </div>
          {recordPaymentOpen && (
            <div className="card p-6">
              <form ref={recordPaymentRef} onSubmit={handleRecordPayment} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Amount ($)</label>
                    <input type="number" step="0.01" min="0" value={recordPaymentForm.amount} onChange={(e) => setRecordPaymentForm((f) => ({ ...f, amount: e.target.value }))} className="input" required />
                  </div>
                  <div>
                    <label className="label">Payment date</label>
                    <input type="date" value={recordPaymentForm.paid_at} onChange={(e) => setRecordPaymentForm((f) => ({ ...f, paid_at: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Check number (optional)</label>
                    <input type="text" value={recordPaymentForm.check_number} onChange={(e) => setRecordPaymentForm((f) => ({ ...f, check_number: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Payer (optional)</label>
                    <input type="text" value={recordPaymentForm.payer_name} onChange={(e) => setRecordPaymentForm((f) => ({ ...f, payer_name: e.target.value }))} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <textarea value={recordPaymentForm.notes} onChange={(e) => setRecordPaymentForm((f) => ({ ...f, notes: e.target.value }))} className="input min-h-[60px]" rows={2} />
                </div>
                <div>
                  <label className="label">Photo (optional)</label>
                  <input type="file" accept="image/*" onChange={(e) => setRecordPaymentForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))} className="input" />
                </div>
                <div>
                  <label className="label">Mark these bills paid</label>
                  <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {unpaid.length === 0 ? (
                      <p className="text-sm text-slate-500">No unpaid bills</p>
                    ) : (
                      unpaid.map((b) => (
                        <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={recordPaymentForm.bill_ids.includes(b.id)} onChange={() => toggleRecordPaymentBill(b.id)} className="rounded" />
                          <span className="text-sm">{(b.customers as { name?: string })?.name ?? "—"} — {formatMoney(b.balance_cents)} — {b.due_date}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={recordPaymentSubmitting} className="btn-primary">{recordPaymentSubmitting ? "Saving…" : "Record payment"}</button>
                  <button type="button" onClick={() => setRecordPaymentOpen(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>

        {message && (
          <div className={`mb-4 rounded-lg border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {message.text}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/customers/new" className="btn-primary">Add Customer</Link>
          <Link href="/bills/new" className="btn-secondary">New bill</Link>
        </div>
      </div>
    </main>
  );
}
