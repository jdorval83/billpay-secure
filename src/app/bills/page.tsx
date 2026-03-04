"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Bill = { id: string; amount_cents: number; balance_cents: number; due_date: string; description: string; status: string; customers?: { name: string } | null };

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bills").then((r) => r.json()).then((d) => { setBills(d.bills || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const format = (c: number) => "$" + (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse rounded bg-slate-200 h-8 w-24 mb-6" />
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="animate-pulse rounded bg-slate-200 h-12 w-full mb-3" />
            <div className="animate-pulse rounded bg-slate-200 h-12 w-full mb-3" />
            <div className="animate-pulse rounded bg-slate-200 h-12 w-full" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Bills</h1>
          <Link href="/bills/new" className="px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">New Bill</Link>
        </div>
        {bills.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-4">No bills yet.</p>
            <Link href="/bills/new" className="inline-block px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">Create your first bill</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50/80 border-b border-slate-200"><th className="text-left p-4 text-sm font-semibold text-slate-700">Customer</th><th className="text-left p-4 text-sm font-semibold text-slate-700">Description</th><th className="text-left p-4 text-sm font-semibold text-slate-700">Amount</th><th className="text-left p-4 text-sm font-semibold text-slate-700">Due</th><th className="text-left p-4 text-sm font-semibold text-slate-700">Status</th></tr></thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{(b.customers as { name?: string })?.name ?? "—"}</td>
                    <td className="p-4 text-slate-600">{b.description || "Invoice"}</td>
                    <td className="p-4 font-medium text-slate-900">{format(b.amount_cents)}</td>
                    <td className="p-4 text-slate-600">{b.due_date}</td>
                    <td className="p-4"><span className={b.status === "paid" ? "text-emerald-600 font-medium" : "text-slate-600"}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
