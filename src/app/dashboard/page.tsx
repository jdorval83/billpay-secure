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
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border rounded p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Customers</p>
            <p className="text-2xl font-bold">{stats.customers}</p>
            <Link href="/customers" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              View
            </Link>
          </div>
          <div className="bg-white border rounded p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Bills</p>
            <p className="text-2xl font-bold">{stats.bills}</p>
            <Link href="/bills" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              View
            </Link>
          </div>
          <div className="bg-white border rounded p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Total AR (Unpaid)</p>
            <p className="text-2xl font-bold">${(stats.totalAR / 100).toFixed(2)}</p>
            <Link href="/bills" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              View Bills
            </Link>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/customers/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Add Customer
          </Link>
          <Link href="/bills/new" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            New Bill
          </Link>
        </div>
      </div>
    </main>
  );
}
