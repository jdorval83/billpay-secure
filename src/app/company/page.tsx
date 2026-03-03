export const metadata = {
  title: "Company | AR Billing",
  description: "Billing and accounts receivable management for service businesses",
};

export default function CompanyPage() {
  const businessName = process.env.NEXT_PUBLIC_BUSINESS_NAME || "AR Billing";

  return (
    <main className="min-h-screen p-12 bg-gray-50">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{businessName}</h1>
        <p className="text-lg text-gray-600 mb-8">
          Billing and accounts receivable management for service businesses.
        </p>
        <p className="text-gray-500 text-sm">
          We help businesses track invoices, send payment links, and follow up on outstanding balances.
        </p>
        <p className="text-gray-400 text-sm mt-8">
          {businessName} • Billing & AR Services
        </p>
      </div>
    </main>
  );
}
