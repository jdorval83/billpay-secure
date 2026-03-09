"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Customer = { id: string; name: string; email: string | null; phone: string | null; sms_consent_at: string | null };

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
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, sms_consent: smsConsent }),
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
              <button type="button" onClick={() => { setEditMode(false); setName(customer.name); setEmail(customer.email || ""); setPhone(customer.phone || ""); setSmsConsent(!!customer.sms_consent_at); }} className="btn-secondary">Cancel</button>
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
