export const metadata = {
  title: "Privacy Policy | BillPay Secure",
  description: "Privacy Policy for BillPay Secure",
};

export default function PrivacyPage() {
  return (
    <main className="page-container">
      <div className="content-max max-w-3xl prose prose-slate">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
        <div className="card p-8 space-y-6 text-sm text-slate-700">
          <p className="text-slate-500">Last updated: {new Date().toLocaleDateString("en-US")}</p>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Information We Collect</h2>
            <p>
              We collect information you provide when using BillPay Secure, including:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Account information (email, password)</li>
              <li>Business information (name, logo, support contact)</li>
              <li>Customer information (name, email, phone) that you enter for billing purposes</li>
              <li>Invoice and payment data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Provide, operate, and maintain our billing and accounts receivable services</li>
              <li>Send payment reminders and invoices to your customers (via SMS or other channels you enable)</li>
              <li>Process payments and maintain billing records</li>
              <li>Respond to support requests</li>
              <li>Improve our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Data Sharing</h2>
            <p>
              We do <strong>not</strong> sell, rent, or share your data with third parties for marketing purposes. We may share data only:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>With service providers (e.g., hosting, payment processors, SMS providers) who assist in operating our service under contractual obligations</li>
              <li>When required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Data Security</h2>
            <p>
              We use industry-standard measures to protect your data, including encryption in transit and at rest, and secure access controls.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal data. Contact us using the support information in the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Contact</h2>
            <p>
              For privacy-related questions, contact your account administrator or the support email configured for your business in Settings.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
