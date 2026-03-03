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
    <main className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Bills</h1>
          <Link href="/bills/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            New Bill
          </Link>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : bills.length === 0 ? (
          <p className="text-gray-500">No bills yet. Create one to get started.</p>
        ) : (
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Due Date</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{b.customers?.name ?? "—"}</td>
                    <td className="p-3">{b.description}</td>
                    <td className="p-3">{formatAmount(b.amount_cents)}</td>
                    <td className="p-3">{b.due_date}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-sm ${
                          b.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : b.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {b.status === "paid" ? (
                        <span className="text-gray-400 text-sm">—</span>
                      ) : (
                        <button
                          onClick={() => handleGetLink(b)}
                          disabled={loadingLink === b.id}
                          className="text-sm px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50"
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
