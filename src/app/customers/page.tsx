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
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Customers</h1>
          <div className="flex gap-2">
            <Link href="/customers/import" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Import CSV
            </Link>
            <Link href="/customers/new" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Add Customer
            </Link>
          </div>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : customers.length === 0 ? (
          <p className="text-gray-500">No customers yet. Add one or import from CSV.</p>
        ) : (
          <div className="bg-white border rounded shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3">{c.email || "—"}</td>
                    <td className="p-3">{c.phone || "—"}</td>
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
