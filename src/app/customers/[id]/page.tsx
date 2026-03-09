"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Customer = { id: string; name: string; email: string | null; phone: string | null; sms_consent_at: string | null; address_line1?: string | null; address_line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null };

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.customer) {
          setCustomer(d.customer);
          setName(d.customer.name);
          setEmail(d.customer.email || "");
          setPhone(d.customer.phone || "");
          setAddressLine1(d.customer.address_line1 || "");
          setAddressLine2(d.customer.address_line2 || "");
          setCity(d.customer.city || "");
          setState(d.customer.state || "");
          setPostalCode(d.customer.postal_code || "");
          setSmsConsent(!!d.customer.sms_consent_at);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
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
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setCustomer(data.customer);
      setEditMode(false);
      setMessage({ type: "success", text: "Customer updated." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to update" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className="content-max max-w-2xl">
          <div className="skeleton h-8 w-48 mb-6" />
          <div className="card p-8">
            <div className="skeleton h-10 w-full mb-4" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="page-container">
        <div className="content-max">
          <p className="text-slate-600">Customer not found.</p>
          <Link href="/customers" className="btn-secondary mt-4 inline-block">Back to Customers</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="content-max max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href="/customers" className="text-sm text-slate-500 hover:text-slate-700">← Customers</Link>
          {!editMode ? (
            <button type="button" onClick={() => setEditMode(true)} className="btn-secondary">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
              <button type="button" onClick={() => { setEditMode(false); setName(customer.name); setEmail(customer.email || ""); setPhone(customer.phone || ""); setAddressLine1(customer.address_line1 || ""); setAddressLine2(customer.address_line2 || ""); setCity(customer.city || ""); setState(customer.state || ""); setPostalCode(customer.postal_code || ""); setSmsConsent(!!customer.sms_consent_at); }} className="btn-secondary">Cancel</button>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{customer.name}</h1>
        {message && (
          <div className={`mb-4 rounded-lg border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {message.text}
          </div>
        )}
        <div className="card p-6 space-y-4">
          {editMode ? (
            <>
              <div>
                <label className="label">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
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
                    Customer consents to receive payment reminder text messages.
                  </span>
                </label>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-sm font-medium text-slate-500">Email</span>
                <p className="text-slate-900">{customer.email || "—"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-slate-500">Phone</span>
                <p className="text-slate-900">{customer.phone || "—"}</p>
              </div>
              {(customer.address_line1 || customer.city) && (
                <div>
                  <span className="text-sm font-medium text-slate-500">Mailing address</span>
                  <p className="text-slate-900 whitespace-pre-line">
                    {[customer.address_line1, customer.address_line2, [customer.city, customer.state, customer.postal_code].filter(Boolean).join(", ")].filter(Boolean).join("\n")}
                  </p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-slate-500">SMS consent</span>
                <p className="text-slate-900">{customer.sms_consent_at ? "Yes" : "No"}</p>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium text-slate-600">Bills</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/bills?customer=${id}&show=outstanding`} className="btn-primary">
              Outstanding bills
            </Link>
            <Link href={`/bills?customer=${id}&show=paid`} className="btn-secondary">
              Paid bills
            </Link>
            <Link href={`/bills?customer=${id}&show=written_off`} className="btn-secondary text-rose-700">
              Written off
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
