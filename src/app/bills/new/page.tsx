"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Customer } from "@/lib/supabase";

export default function NewBillPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => setCustomers(d.customers || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError("Select a customer");
      return;
    }
    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (amountCents <= 0) {
      setError("Amount must be > 0");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          amount_cents: amountCents,
          description: description.trim() || "Invoice",
          due_date: dueDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.push("/bills");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (customers.length === 0) {
    return (
      <main className="page-container">
        <div className="content-max max-w-md">
          <div className="card p-8">
            <p className="text-slate-600 mb-4">Add at least one customer first.</p>
            <Link href="/customers/new" className="btn-primary inline-block">Add customer</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="content-max max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">New charge</h1>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="label">Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input" required>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount ($) *</label>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="0.00" required />
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input" placeholder="Invoice" />
          </div>
          <div>
            <label className="label">Due Date *</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? "Creating…" : "Create charge"}</button>
            <Link href="/bills" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
