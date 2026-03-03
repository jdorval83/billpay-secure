"use client";

import Link from "next/link";

export default function Nav() {
  return (
    <nav className="border-b bg-white mb-8">
      <div className="max-w-4xl mx-auto px-8 py-4 flex gap-4">
        <Link href="/" className="font-bold text-lg text-gray-900 hover:text-gray-600">
          BillPay Secure
        </Link>
        <Link href="/dashboard" className="px-3 py-2 rounded hover:bg-gray-100">
          Dashboard
        </Link>
        <Link href="/customers" className="px-3 py-2 rounded hover:bg-gray-100">
          Customers
        </Link>
        <Link href="/bills" className="px-3 py-2 rounded hover:bg-gray-100">
          Bills
        </Link>
        <Link href="/bills/new" className="px-3 py-2 rounded hover:bg-gray-100">
          New Bill
        </Link>
      </div>
    </nav>
  );
}
