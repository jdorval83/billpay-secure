"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Bill = {
  id: string;
  customer_id: string;
  due_date: string;
  balance_cents: number;
  amount_cents: number;
  description: string;
  status: string;
  payment_link: string | null;
  customers?: { name: string; email: string | null };
};

type Bucket = {
  label: string;
  key: string;
  total: number;
  count: number;
  bills: Bill[];
  byCustomer: Record<string, { name: string; total: number; count: number; bills: Bill[] }>;
};

function getBucket(daysOverdue: number): string {
  if (daysOverdue < 0) return "current";
  if (daysOverdue <= 30) return "0-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<{ id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({}); // Start collapsed
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [bucketOrder] = useState(["current", "0-30", "31-60", "61-90", "90+"]);
  const bucketColors: Record<string, string> = {
    current: "green",
    "0-30": "green",
    "31-60": "yellow",
    "61-90": "yellow",
    "90+": "red",
  };

  const load = () => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/bills").then((r) => r.json()),
    ]).then(([custRes, billsRes]) => {
      setCustomers(custRes.customers || []);
      setBills(billsRes.bills || []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Seed failed");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const unpaid = bills.filter((b) => b.balance_cents > 0);
  const paid = bills.filter((b) => b.balance_cents === 0 || b.status === "paid");
  const totalAR = unpaid.reduce((s, b) => s + b.balance_cents, 0);

  const buckets: Record<string, Bucket> = {
    current: { label: "Current (not yet due)", key: "current", total: 0, count: 0, bills: [], byCustomer: {} },
    "0-30": { label: "1–30 days past due", key: "0-30", total: 0, count: 0, bills: [], byCustomer: {} },
    "31-60": { label: "31–60 days past due", key: "31-60", total: 0, count: 0, bills: [], byCustomer: {} },
    "61-90": { label: "61–90 days past due", key: "61-90", total: 0, count: 0, bills: [], byCustomer: {} },
    "90+": { label: "Over 90 days past due", key: "90+", total: 0, count: 0, bills: [], byCustomer: {} },
  };

  unpaid.forEach((b) => {
    const d = daysOverdue(b.due_date);
    const k = getBucket(d);
    buckets[k].total += b.balance_cents;
    buckets[k].count += 1;
    buckets[k].bills.push(b);
    const cid = b.customer_id || "unknown";
    const cname = b.customers?.name ?? "Unknown";
    if (!buckets[k].byCustomer[cid]) {
      buckets[k].byCustomer[cid] = { name: cname, total: 0, count: 0, bills: [] };
    }
    buckets[k].byCustomer[cid].total += b.balance_cents;
    buckets[k].byCustomer[cid].count += 1;
    buckets[k].byCustomer[cid].bills.push(b);
  });

  const toggleBucket = (key: string) => {
    setExpandedBuckets((e) => ({ ...e, [key]: !e[key] }));
  };

  const toggleCustomer = (bucketKey: string, customerId: string) => {
    const k = `${bucketKey}:${customerId}`;
    setExpandedCustomers((e) => ({ ...e, [k]: !e[k] }));
  };

  const format = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <main className="dash">
        <div className="dash-container">
          <p className="dash-loading">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dash">
      <div className="dash-container">
        <div className="dash-header">
          <h1 className="dash-title">AR Dashboard</h1>
          <div className="dash-actions">
            <button onClick={handleSeed} disabled={seeding} className="btn-secondary-outline">
              {seeding ? "Seeding…" : "Load test data"}
            </button>
            <Link href="/customers/new" className="btn-primary-sm">
              Add Customer
            </Link>
            <Link href="/bills/new" className="btn-primary-sm">
              New Bill
            </Link>
          </div>
        </div>

        <div className="dash-summary">
          <div className="dash-summary-card">
            <span className="dash-summary-label">Total AR</span>
            <span className="dash-summary-value">{format(totalAR)}</span>
          </div>
          <div className="dash-summary-card">
            <span className="dash-summary-label">Unpaid bills</span>
            <span className="dash-summary-value">{unpaid.length}</span>
          </div>
          <Link href="/bills?bucket=paid" className="dash-summary-card dash-summary-card-link">
            <span className="dash-summary-label">Paid bills</span>
            <span className="dash-summary-value">{paid.length}</span>
          </Link>
          <div className="dash-summary-card">
            <span className="dash-summary-label">Customers</span>
            <span className="dash-summary-value">{customers.length}</span>
          </div>
        </div>

        <h2 className="dash-subtitle">Aging buckets</h2>

        {totalAR === 0 ? (
          <div className="dash-empty">
            <p>No outstanding AR. Create bills or load test data to see aging.</p>
            <button onClick={handleSeed} disabled={seeding} className="btn-primary">
              {seeding ? "Seeding…" : "Load test data (30 customers, 200 bills)"}
            </button>
          </div>
        ) : (
          <div className="dash-trello">
            {bucketOrder.map((key) => {
              const b = buckets[key];
              const color = bucketColors[key];
              const isBucketExpanded = expandedBuckets[key];
              const customerIds = Object.keys(b.byCustomer).sort(
                (aid, bid) => (b.byCustomer[bid]?.total ?? 0) - (b.byCustomer[aid]?.total ?? 0)
              );
              return (
                <div key={key} className={`dash-column dash-column-${color}`}>
                  <button
                    type="button"
                    className="dash-column-header"
                    onClick={() => toggleBucket(key)}
                  >
                    <span className="dash-column-label">{b.label}</span>
                    <span className="dash-column-total">{format(b.total)}</span>
                    <span className="dash-column-count">
                      {b.count} bill{b.count !== 1 ? "s" : ""} · {customerIds.length} customer{customerIds.length !== 1 ? "s" : ""}
                    </span>
                    <span className="dash-column-chevron">{isBucketExpanded ? "▼" : "▶"}</span>
                  </button>
                  {isBucketExpanded && (
                    <div className="dash-column-body">
                      {customerIds.length === 0 ? (
                        <div className="dash-card-empty">No bills</div>
                      ) : (
                        customerIds.map((cid) => {
                          const cust = b.byCustomer[cid];
                          const custKey = `${key}:${cid}`;
                          const isCustExpanded = expandedCustomers[custKey];
                          return (
                            <div key={cid} className="dash-drill-customer">
                              <button
                                type="button"
                                className="dash-drill-customer-header"
                                onClick={() => toggleCustomer(key, cid)}
                              >
                                <span className="dash-drill-customer-name">{cust.name}</span>
                                <span className="dash-drill-customer-meta">
                                  {cust.count} bill{cust.count !== 1 ? "s" : ""} · {format(cust.total)}
                                </span>
                                <span className="dash-drill-chevron">{isCustExpanded ? "▼" : "▶"}</span>
                              </button>
                              {isCustExpanded && (
                                <div className="dash-drill-bills">
                                  {cust.bills.map((bill) => (
                                    <Link
                                      key={bill.id}
                                      href={`/bills?bucket=${key}`}
                                      className="dash-drill-bill"
                                    >
                                      <span className="dash-drill-bill-desc">{bill.description || "Invoice"}</span>
                                      <span className="dash-drill-bill-amount">{format(bill.balance_cents)}</span>
                                      <span className="dash-drill-bill-due">Due {bill.due_date}</span>
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                      <Link href={`/bills?bucket=${key}`} className="dash-view-all">
                        View all in Bills →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
