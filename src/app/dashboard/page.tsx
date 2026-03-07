"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
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
  customers?: { name?: string | null } | null;
};
type DashboardStats = {
  totalCharges: number;
  totalPayments: number;
  totalOutstanding: number;
  byMonth: { month: string; charges: number; payments: number }[];
  aging: { bucket: string; amountCents: number }[];
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentSubmitting, setRecordPaymentSubmitting] = useState(false);
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
    setLoading(true);
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/bills").then((r) => r.json()).catch(() => ({ bills: [] })),
      fetch("/api/dashboard/stats").then((r) => r.json()).catch(() => null),
    ]).then(([cRes, bRes, statsRes]) => {
      setCustomers(cRes.customers || []);
      setBills(bRes.bills || []);
      setStats(statsRes && !statsRes.error ? statsRes : null);
      setLoading(false);
    });
  }, []);

  const formatMoney = (cents: number) =>
    "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  const { unpaid, paid, totalAR } = useMemo(() => {
    const unpaidBills = bills.filter((b) => b.balance_cents > 0);
    const paidBills = bills.filter((b) => b.balance_cents <= 0 || b.status === "paid");
    const total = unpaidBills.reduce((sum, b) => sum + b.balance_cents, 0);
    return {
      unpaid: unpaidBills,
      paid: paidBills,
      totalAR: total,
    };
  }, [bills]);

  const refreshData = () => {
    Promise.all([
      fetch("/api/bills").then((r) => r.json()).catch(() => ({ bills: [] })),
      fetch("/api/dashboard/stats").then((r) => r.json()).catch(() => null),
    ]).then(([bRes, statsRes]) => {
      setBills(bRes.bills || []);
      setStats(statsRes && !statsRes.error ? statsRes : null);
    });
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
      const res = await fetch("/api/payment-records", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");
      setMessage({
        type: "success",
        text: data.billsMarkedPaid
          ? `Payment recorded. ${data.billsMarkedPaid} charge(s) marked paid.`
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Link href="/bills" className="card-hover p-6 block">
            <p className="text-sm font-medium text-slate-600">Total AR (outstanding)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatMoney(totalAR)}</p>
            <p className="text-xs text-slate-500 mt-2">View charges</p>
          </Link>
          <Link href="/bills" className="card-hover p-6 block">
            <p className="text-sm font-medium text-slate-600">Unpaid charges</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{unpaid.length}</p>
            <p className="text-xs text-slate-500 mt-2">View charges</p>
          </Link>
          <Link href="/customers" className="card-hover p-6 block">
            <p className="text-sm font-medium text-slate-600">Customers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
            <p className="text-xs text-slate-500 mt-2">View all customers</p>
          </Link>
          <Link href="/bills" className="card-hover p-6 block">
            <p className="text-sm font-medium text-slate-600">Paid charges</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{paid.length}</p>
            <p className="text-xs text-slate-500 mt-2">View charges</p>
          </Link>
        </div>
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="card p-6">
              <p className="text-sm font-medium text-slate-600">Total charges (all time)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{formatMoney(stats.totalCharges)}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-slate-600">Total payments received</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{formatMoney(stats.totalPayments)}</p>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-slate-600">Total outstanding</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{formatMoney(stats.totalOutstanding)}</p>
            </div>
          </div>
        )}
        {stats && (stats.aging.some((a) => a.amountCents > 0) || stats.byMonth.some((m) => m.charges > 0 || m.payments > 0)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Aging of receivables</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.aging.map((a) => ({ name: a.bucket, amount: a.amountCents / 100, full: a.amountCents }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => "$" + v} />
                  <Tooltip formatter={(v: number) => ["$" + v.toFixed(2), "Outstanding"]} />
                  <Bar dataKey="amount" fill="#10b981" name="Outstanding" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Charges vs payments (last 6 months)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={stats.byMonth.map((m) => ({ month: m.month, charges: m.charges / 100, payments: m.payments / 100 }))}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => "$" + v} />
                  <Tooltip formatter={(v: number) => ["$" + v.toFixed(2), ""]} />
                  <Legend />
                  <Bar dataKey="charges" fill="#64748b" name="Charges" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payments" fill="#10b981" name="Payments" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-slate-700 tracking-wide uppercase">Record payment (check / cash / other)</h2>
            {!recordPaymentOpen ? (
              <button type="button" onClick={() => setRecordPaymentOpen(true)} className="btn-secondary text-sm py-2">
                Add payment received outside system
              </button>
            ) : null}
          </div>
          {recordPaymentOpen && (
            <div className="card p-6">
              <form ref={recordPaymentRef} onSubmit={handleRecordPayment} className="space-y-4">
                <p className="text-sm text-slate-600">Record a payment you received by check, cash, or other method. Optionally link to charges to mark them paid and attach a photo of the check (max 500KB).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recordPaymentForm.amount}
                      onChange={(e) => setRecordPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                      className="input"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Payment date</label>
                    <input
                      type="date"
                      value={recordPaymentForm.paid_at}
                      onChange={(e) => setRecordPaymentForm((f) => ({ ...f, paid_at: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Check number (optional)</label>
                    <input
                      type="text"
                      value={recordPaymentForm.check_number}
                      onChange={(e) => setRecordPaymentForm((f) => ({ ...f, check_number: e.target.value }))}
                      className="input"
                      placeholder="e.g. 1234"
                    />
                  </div>
                  <div>
                    <label className="label">Payer name (optional)</label>
                    <input
                      type="text"
                      value={recordPaymentForm.payer_name}
                      onChange={(e) => setRecordPaymentForm((f) => ({ ...f, payer_name: e.target.value }))}
                      className="input"
                      placeholder="Customer or company name"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <textarea
                    value={recordPaymentForm.notes}
                    onChange={(e) => setRecordPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                    className="input min-h-[80px]"
                    placeholder="e.g. Check received in mail, memo note"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="label">Photo of check (optional, max 500KB)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setRecordPaymentForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Mark these charges as paid (optional)</label>
                  <p className="text-xs text-slate-500 mb-2">Select unpaid charges that this payment covers.</p>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                    {unpaid.length === 0 ? (
                      <p className="text-sm text-slate-500">No unpaid charges.</p>
                    ) : (
                      unpaid.map((b) => (
                        <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recordPaymentForm.bill_ids.includes(b.id)}
                            onChange={() => toggleRecordPaymentBill(b.id)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                          />
                          <span className="text-sm">{(b.customers as { name?: string })?.name ?? "—"} — {formatMoney(b.balance_cents)} — {b.due_date}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={recordPaymentSubmitting} className="btn-primary">
                    {recordPaymentSubmitting ? "Saving…" : "Record payment"}
                  </button>
                  <button type="button" onClick={() => setRecordPaymentOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
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
        <div className="flex flex-wrap items-center gap-3 mb-10">
          <Link href="/customers/new" className="btn-primary">Add Customer</Link>
          <Link href="/bills/new" className="btn-secondary">New charge</Link>
        </div>
      </div>
    </main>
  );
}
