"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          address_line1: addressLine1.trim() || null,
          address_line2: addressLine2.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          postal_code: postalCode.trim() || null,
          sms_consent: smsConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");
      router.push("/customers");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container">
      <div className="content-max max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Customer</h1>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="label">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Acme Inc" required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="contact@acme.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="(555) 123-4567" />
          </div>
          <div>
            <label className="label">Mailing address</label>
            <input type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="input mb-2" placeholder="Street address" />
            <input type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className="input mb-2" placeholder="Apt, suite, etc. (optional)" />
            <div className="flex gap-2">
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input flex-1" placeholder="City" />
              <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="input w-24" placeholder="State" />
              <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="input w-28" placeholder="ZIP" />
            </div>
          </div>
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">
                Customer consents to receive payment reminder text messages. Message and data rates may apply. See <a href="/terms" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">Terms</a> and <a href="/privacy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
              </span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? "Saving…" : "Add Customer"}</button>
            <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </main>
  );
}
