export const metadata = {
  title: "SMS Opt-in Flow Verification | BillPay Secure",
  description: "Verification page for Twilio A2P: how businesses record customer SMS consent",
};

/**
 * Public page for Twilio A2P campaign verification.
 * Use URL: https://billpaysecure.com/sms-opt-in
 */
export default function SmsOptInPage() {
  return (
    <main className="page-container">
      <div className="content-max max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">SMS Opt-in Flow Verification</h1>
        <p className="text-slate-600 mb-6">
          This page documents how businesses record customer consent for SMS. Twilio reviewers: this is the form referenced in our campaign CTA.
        </p>

        <div className="card p-6 border-2 border-slate-200">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Add Customer form (business view)</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <div className="h-10 bg-slate-100 rounded border border-slate-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <div className="h-10 bg-slate-100 rounded border border-slate-200" />
            </div>
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span className="text-sm text-slate-700">
                  Customer consents to receive payment reminder text messages. Message and data rates may apply. See{" "}
                  <a href="/terms" className="text-emerald-600 hover:underline">Terms</a> and{" "}
                  <a href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</a>.
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-700 space-y-2">
          <p><strong>Flow:</strong> The business adds a customer and checks the box above to attest that the customer has consented. The customer may have consented in person, on paper, verbally, or via the business&apos;s own process. The business records that consent here.</p>
          <p><strong>End user:</strong> Does not interact with BillPay Secure. Opt-in is business-mediated.</p>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          <a href="/compliance" className="text-emerald-600 hover:underline">← Back to Compliance</a>
        </p>
      </div>
    </main>
  );
}
