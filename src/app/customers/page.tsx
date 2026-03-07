"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/supabase";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const paginatedCustomers = useMemo(() => {
    if (showAll) return filteredCustomers;
    const start = (page - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, page, showAll]);

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const hasFilters = search.trim() !== "";

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
    <main className="page-container">
      <div className="content-max">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <Link href="/customers/new" className="btn-primary">Add Customer</Link>
        </div>
        {loading ? (
          <div className="card p-8">
            <div className="skeleton h-4 w-32 mb-4" />
            <div className="skeleton h-12 w-full mb-3" />
            <div className="skeleton h-12 w-full mb-3" />
            <div className="skeleton h-12 w-3/4" />
          </div>
        ) : customers.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-600 mb-4">No customers yet.</p>
            <Link href="/customers/new" className="btn-primary inline-block">Add your first customer</Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, email, or phone…"
                className="input flex-1 min-w-[200px] max-w-xs"
              />
              <button
                type="button"
                onClick={() => { setShowAll(!showAll); setPage(1); }}
                className="btn-secondary text-sm"
              >
                {showAll ? "Paginate" : "Show all"}
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setPage(1); }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Email</th>
                  <th className="text-left p-4 text-sm font-semibold text-slate-700">Phone</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr><td colSpan={3} className="p-6 text-center text-slate-500">No customers match your search.</td></tr>
                ) : (
                paginatedCustomers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{c.name}</td>
                    <td className="p-4 text-slate-600">{c.email || "—"}</td>
                    <td className="p-4 text-slate-600">{c.phone || "—"}</td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
            </div>
            {!showAll && totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-500">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
