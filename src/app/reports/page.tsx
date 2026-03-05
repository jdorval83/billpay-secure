"use client";

export default function ReportsPage() {
  return (
    <main className="page-container">
      <div className="content-max">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Reports</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="/api/reports/bills"
            className="card-hover p-6 block text-left"
          >
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Bills CSV</h2>
            <p className="text-sm text-slate-600">
              Download a CSV of bills with status, totals, due dates, and send timestamps.
            </p>
          </a>
          <a
            href="/api/reports/send-history"
            className="card-hover p-6 block text-left"
          >
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Send history CSV</h2>
            <p className="text-sm text-slate-600">
              Download a CSV of bill send attempts by channel, recipient, and status.
            </p>
          </a>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          For date range or customer-specific exports, add <code className="font-mono">?from=YYYY-MM-DD&to=YYYY-MM-DD</code> or <code className="font-mono">&customerId=&lt;id&gt;</code> to the URLs.
        </p>
      </div>
    </main>
  );
}
