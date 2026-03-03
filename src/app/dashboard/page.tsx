"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState({ customers: 0, bills: 0, totalAR: 0 });

  useEffect(() => {
    Promise.all([fetch("/api/customers").then((r) => r.json()), fetch("/api/bills").then((r) => r.json())]).then(
      ([customersRes, billsRes]) => {
        const customers = customersRes.customers || [];
        const bills = billsRes.bills || [];
        const totalAR = bills
          .filter((b: { status: string }) => b.status !== "paid")
          .reduce((sum: number, b: { balance_cents: number }) => sum + b.balance_cents, 0);
        setStats({ customers: customers.length, bills: bills.length, totalAR });
      }
    );
  }, []);

  return (
    <main className="min-h-screen bg-slate-50/50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Customers</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.customers}</p>
            <Link href="/customers" className="text-emerald-600 text-sm font-medium hover:text-emerald-700 mt-3 inline-block">
              View →
            </Link>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Bills</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.bills}</p>
            <Link href="/bills" className="text-emerald-600 text-sm font-medium hover:text-emerald-700 mt-3 inline-block">
              View →
            </Link>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <p className="text-slate-500 text-sm font-medium">Total AR (Unpaid)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${(stats.totalAR / 100).toFixed(2)}</p>
            <Link href="/bills" className="text-emerald-600 text-sm font-medium hover:text-emerald-700 mt-3 inline-block">
              View Bills →
            </Link>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/customers/new" className="px-5 py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors">
            Add Customer
          </Link>
          <Link href="/bills/new" className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-white font-medium transition-colors">
            New Bill
          </Link>
        </div>
      </div>
    </main>
  );
}
