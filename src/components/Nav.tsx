"use client";

import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">BillPay Secure</Link>
        <div className="nav-links">
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
          <Link href="/customers" className="nav-link">Customers</Link>
          <Link href="/bills" className="nav-link">Bills</Link>
          <Link href="/bills/new" className="nav-cta">New Bill</Link>
        </div>
      </div>
    </nav>
  );
}
