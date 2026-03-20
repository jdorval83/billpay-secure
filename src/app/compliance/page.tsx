"use client";

import { useState, useEffect } from "react";

export default function CompliancePage() {
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => setBaseUrl(window.location.origin), []);

  const consentDescription = baseUrl
    ? `BRAND: BillPay Secure (https://billpaysecure.com). HOW END USERS OPT IN: End users (customers) consent to receive SMS when their business (our client) records that consent. The business collects consent from the customer through in-person agreement, signed form, verbal confirmation, or the business's own process. The business then records this in BillPay Secure by checking "Customer consents to receive payment reminder text messages" when adding/editing the customer. The end user never interacts with BillPay Secure; opt-in is business-mediated. Verification (screenshot of consent form): ${baseUrl}/sms-opt-in. MESSAGE FREQUENCY: Billing and payment reminders only, typically 1-4 per month. REQUIRED DISCLOSURES: Message and data rates may apply. OPT-OUT: Reply STOP to any message. Terms: ${baseUrl}/terms. Privacy: ${baseUrl}/privacy.`
    : `BRAND: BillPay Secure (https://billpaysecure.com). HOW END USERS OPT IN: End users (customers) consent to receive SMS when their business (our client) records that consent. The business collects consent from the customer through in-person agreement, signed form, verbal confirmation, or the business's own process. The business then records this in BillPay Secure by checking "Customer consents to receive payment reminder text messages" when adding/editing the customer. The end user never interacts with BillPay Secure; opt-in is business-mediated. Verification (screenshot of consent form): https://billpaysecure.com/sms-opt-in. MESSAGE FREQUENCY: Billing and payment reminders only, typically 1-4 per month. REQUIRED DISCLOSURES: Message and data rates may apply. OPT-OUT: Reply STOP to any message. Terms and Privacy links provided below.`;
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayUrl = baseUrl || "https://billpaysecure.com";

  return (
    <main className="page-container">
      <div className="content-max max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Twilio Messaging Compliance</h1>
        <p className="text-slate-600 mb-8">Copy the content below into Twilio&apos;s registration form. Replace the URLs with your live domain if needed.</p>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Campaign Description</h2>
            <p className="text-xs text-slate-500 mb-2">Use for Twilio&apos;s &quot;Campaign Description&quot; or &quot;Use Case&quot; field.</p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 font-mono whitespace-pre-wrap mb-3">
              BillPay Secure is a B2B billing and accounts receivable platform for service businesses (contractors, plumbers, landscapers, etc.). Businesses use our web and mobile app to create bills, manage customers, and send invoices. We send transactional SMS messages to end users (the business&apos;s customers) only when: (1) the business has obtained the customer&apos;s consent to receive payment reminder texts, and (2) the business has recorded that consent in our system. Message types include: payment reminder notifications when a bill is sent, balance due reminders, and invoice/payment links. Messages are sent on behalf of the business, not marketing; frequency is typically 1-4 per billing cycle. End users opt in when the business records their consent during customer onboarding (consent is collected by the business in person, on paper, or via their own process). Opt-out via STOP. Terms and privacy policy are linked in each message flow.
            </div>
            <button type="button" onClick={() => copyToClipboard(`BillPay Secure is a B2B billing and accounts receivable platform for service businesses (contractors, plumbers, landscapers, etc.). Businesses use our web and mobile app to create bills, manage customers, and send invoices. We send transactional SMS messages to end users (the business's customers) only when: (1) the business has obtained the customer's consent to receive payment reminder texts, and (2) the business has recorded that consent in our system. Message types include: payment reminder notifications when a bill is sent, balance due reminders, and invoice/payment links. Messages are sent on behalf of the business, not marketing; frequency is typically 1-4 per billing cycle. End users opt in when the business records their consent during customer onboarding (consent is collected by the business in person, on paper, or via their own process). Opt-out via STOP. Terms and privacy policy are linked in each message flow.`, "campaign")} className="btn-secondary text-sm">
              {copied ? "Copied!" : "Copy campaign description"}
            </button>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">How do end-users consent to receive messages?</h2>
            <p className="text-xs text-slate-500 mb-2">40–2048 characters. Paste this into Twilio.</p>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 font-mono whitespace-pre-wrap mb-3">
              {consentDescription}
            </div>
            <button type="button" onClick={() => copyToClipboard(consentDescription, "consent")} className="btn-secondary text-sm">
              {copied ? "Copied!" : "Copy consent description"}
            </button>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Privacy Policy URL</h2>
            <input
              readOnly
              value={`${displayUrl}/privacy`}
              className="input text-sm font-mono mb-2"
            />
            <button type="button" onClick={() => copyToClipboard(`${displayUrl}/privacy`, "privacy")} className="btn-secondary text-sm">
              {copied ? "Copied!" : "Copy URL"}
            </button>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Terms and Conditions URL</h2>
            <input
              readOnly
              value={`${displayUrl}/terms`}
              className="input text-sm font-mono mb-2"
            />
            <button type="button" onClick={() => copyToClipboard(`${displayUrl}/terms`, "terms")} className="btn-secondary text-sm">
              {copied ? "Copied!" : "Copy URL"}
            </button>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Opt-in Keywords</h2>
            <p className="text-xs text-slate-500 mb-2">Leave blank if you do not support text-to-opt-in.</p>
            <input readOnly value="" className="input text-sm" placeholder="Leave blank" />
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Opt-in Message</h2>
            <p className="text-xs text-slate-500 mb-2">Leave blank if you do not support text-to-opt-in.</p>
            <input readOnly value="" className="input text-sm" placeholder="Leave blank" />
          </div>
        </div>
      </div>
    </main>
  );
}
