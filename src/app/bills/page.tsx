"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Bill } from "@/lib/supabase";

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLink, setLoadingLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <main className="min-h-screen bg-slate-50/50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Bills</h1>
          <Link href="/bills/new" className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium transition-colors">
            New Bill
          </Link>
        </div>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : bills.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-slate-500 mb-4">No bills yet. Create one to get started.</p>
            <Link href="/bills/new" className="text-emerald-600 font-medium hover:text-emerald-700">
              Create your first bill →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left p-4 text-slate-600 font-medium">Customer</th>
                  <th className="text-left p-4 text-slate-600 font-medium">Description</th>
                  <th className="text-left p-4 text-slate-600 font-medium">Amount</th>
                  <th className="text-left p-4 text-slate-600 font-medium">Due Date</th>
                  <th className="text-left p-4 text-slate-600 font-medium">Status</th>
                  <th className="text-left p-4 text-slate-600 font-medium">Payment</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{b.customers?.name ?? "—"}</td>
                    <td className="p-4 text-slate-600">{b.description}</td>
                    <td className="p-4 font-medium text-slate-900">{formatAmount(b.amount_cents)}</td>
                    <td className="p-4 text-slate-600">{b.due_date}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          b.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {b.status === "paid" ? (
                        <span className="text-slate-400 text-sm">—</span>
                      ) : (
                        <button
                          onClick={() => handleGetLink(b)}
                          disabled={loadingLink === b.id}
                          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium disabled:opacity-50 transition-colors"
                        >
                          {loadingLink === b.id
                            ? "…"
                            : copied === b.id
                            ? "Copied!"
                            : b.payment_link
                            ? "Copy link"
                            : "Get link"}
                        </button>
                      )}
                    </td>
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
