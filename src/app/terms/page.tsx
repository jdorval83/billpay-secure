export const metadata = {
  title: "Terms and Conditions | BillPay Secure",
  description: "Terms and Conditions for BillPay Secure",
};

export default function TermsPage() {
  return (
    <main className="page-container">
      <div className="content-max max-w-3xl prose prose-slate">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Terms and Conditions</h1>
        <div className="card p-8 space-y-6 text-sm text-slate-700">
          <p className="text-slate-500">Last updated: {new Date().toLocaleDateString("en-US")}</p>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">SMS / Text Message Program</h2>
            <p>
              <strong>Program name:</strong> BillPay Secure Payment Reminders
            </p>
            <p>
              <strong>Program description:</strong> BillPay Secure allows businesses to send payment reminders and billing-related messages to their customers via SMS text message. Messages may include balance reminders, invoice links, and payment confirmations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Message and Data Rates</h2>
            <p>
              Message and data rates may apply. Your carrier&apos;s standard messaging rates apply to messages you send and receive. Check with your wireless provider for details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Message Frequency</h2>
            <p>
              Message frequency varies. You may receive payment reminders when you have an outstanding balance, typically no more than a few times per billing cycle unless additional follow-up is needed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Opt-Out / Help</h2>
            <p>
              To opt out of text messages at any time, reply <strong>STOP</strong> to any message. You will receive a confirmation that you have been unenrolled. To get help, reply <strong>HELP</strong> to any message or contact the support email shown in your invoice or the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Consent</h2>
            <p>
              By providing your phone number and opting in (e.g., checking the consent box when added as a customer, or texting a keyword to subscribe), you consent to receive automated billing-related text messages from the business using BillPay Secure. Consent is not a condition of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Support Contact</h2>
            <p>
              For support, use the contact information provided by the business that sent you the message, or visit the support email configured in the business settings (e.g., support@billpaysecure.com).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">General Terms</h2>
            <p>
              Use of BillPay Secure is subject to these terms. We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
