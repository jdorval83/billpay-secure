"use client";

import { useState, useEffect } from "react";

export default function CompliancePage() {
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => setBaseUrl(window.location.origin), []);

  const consentDescription = baseUrl
    ? `End users opt-in by being added as a customer in BillPay Secure. When a business adds a customer and enters their phone number, they check a box agreeing to receive payment reminder text messages from the business. Opt-in occurs at the point of customer creation or when the customer's profile is updated with SMS consent. See the customer form at the Add Customer page and the Edit Customer page for the consent checkbox. Privacy Policy: ${baseUrl}/privacy. Terms and Conditions: ${baseUrl}/terms.`
    : `End users opt-in by being added as a customer in BillPay Secure. When a business adds a customer and enters their phone number, they check a box agreeing to receive payment reminder text messages from the business. Opt-in occurs at the point of customer creation or when the customer's profile is updated with SMS consent. See the customer form at the Add Customer page and the Edit Customer page for the consent checkbox. Privacy Policy and Terms links are provided below.`;
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
