"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/supabase";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.customers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <Link href="/customers/new" className="px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">Add Customer</Link>
        </div>
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="animate-pulse rounded bg-slate-200 h-4 w-32 mb-4" />
            <div className="animate-pulse rounded bg-slate-200 h-12 w-full mb-3" />
            <div className="animate-pulse rounded bg-slate-200 h-12 w-full mb-3" />
            <div className="animate-pulse rounded bg-slate-200 h-12 w-3/4" />
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-4">No customers yet.</p>
            <Link href="/customers/new" className="inline-block px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors">Add your first customer</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead><tr className="bg-slate-50/80 border-b border-slate-200"><th className="text-left p-4 text-sm font-semibold text-slate-700">Name</th><th className="text-left p-4 text-sm font-semibold text-slate-700">Email</th><th className="text-left p-4 text-sm font-semibold text-slate-700">Phone</th></tr></thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{c.name}</td>
                    <td className="p-4 text-slate-600">{c.email || "—"}</td>
                    <td className="p-4 text-slate-600">{c.phone || "—"}</td>
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
