export const metadata = {
  title: "Company | BillPay Secure",
  description: "Billing and accounts receivable management for service businesses",
};

export default function CompanyPage() {
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || "BillPay Secure";

  return (
    <main className="min-h-screen bg-slate-50/50">
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">{businessName}</h1>
        <p className="text-lg text-slate-600 mb-8">
          Secure billing and payment management for service businesses.
        </p>
        <p className="text-slate-500 mb-8">
          We help businesses track customers, create invoices, send payment links via Stripe, and follow up on outstanding balances.
        </p>
        <p className="text-slate-400 text-sm">
          {businessName} • Billing & AR Services
        </p>
      </div>
    </main>
  );
}
