import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">BillPay Secure</h1>
        <nav className="flex gap-4 mb-8">
          <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Dashboard
          </Link>
          <Link href="/customers" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            Customers
          </Link>
          <Link href="/bills" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            Bills
          </Link>
          <Link href="/bills/new" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            New Bill
          </Link>
        </nav>
        <p className="text-gray-600">
          Track billing and AR for your service business. Add customers, create bills, send payment links, and export to Excel.
        </p>
      </div>
    </main>
  );
}
