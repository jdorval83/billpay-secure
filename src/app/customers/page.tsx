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
    <main className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <div className="flex gap-2">
            <Link href="/customers/import" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white font-medium text-slate-700 transition-colors">
              Import CSV
            </Link>
            <Link href="/customers/new" className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium transition-colors">
              Add Customer
            </Link>
          </div>
        </div>
        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : customers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-slate-500 mb-4">No customers yet. Add one or import from CSV.</p>
            <Link href="/customers/new" className="text-emerald-600 font-medium hover:text-emerald-700">
              Add your first customer →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left p-4 text-slate-600 font-medium">Name</th>
                  <th className="text-left p-4 text-slate-600 font-medium">Email</th>
                  <th className="text-left p-4 text-slate-600 font-medium">Phone</th>
                </tr>
              </thead>
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
