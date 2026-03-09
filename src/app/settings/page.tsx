"use client";

import { useEffect, useState, type ChangeEvent } from "react";

type Business = {
  id: string;
  name: string;
  logo_url: string | null;
  support_email: string | null;
  invoice_footer: string | null;
  past_due_days?: number;
  reminder_interval_days?: number;
};

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [footer, setFooter] = useState("");
  const [pastDueDays, setPastDueDays] = useState<number>(0);
  const [reminderIntervalDays, setReminderIntervalDays] = useState<number>(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/business", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        if (data.business) {
          setBusiness(data.business);
          setFooter(data.business.invoice_footer || "");
          setPastDueDays(typeof data.business.past_due_days === "number" ? data.business.past_due_days : 0);
          setReminderIntervalDays(typeof data.business.reminder_interval_days === "number" ? data.business.reminder_interval_days : 0);
        } else {
          throw new Error(data.error || "No business data");
        }
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !business) return;

    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/business/logo", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to upload logo");

      setBusiness(json.business);
      setMessage("Logo updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to upload logo");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBilling = async () => {
    if (!business) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ past_due_days: pastDueDays, reminder_interval_days: reminderIntervalDays }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setBusiness(json.business);
      setPastDueDays(typeof json.business?.past_due_days === "number" ? json.business.past_due_days : pastDueDays);
      setReminderIntervalDays(typeof json.business?.reminder_interval_days === "number" ? json.business.reminder_interval_days : reminderIntervalDays);
      setMessage("Updated successfully.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFooter = async () => {
    if (!business) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_footer: footer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setBusiness(json.business);
      setMessage("Updated successfully.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-container">
        <div className="content-max">
          <div className="skeleton h-8 w-40 mb-6" />
          <div className="card p-8">
            <div className="skeleton h-4 w-32 mb-4" />
            <div className="skeleton h-10 w-full mb-3" />
            <div className="skeleton h-10 w-3/4" />
          </div>
        </div>
      </main>
    );
  }

  if (!business) {
    return (
      <main className="page-container">
        <div className="content-max">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Settings</h1>
          <p className="text-sm text-red-600">{message || "Unable to load business settings."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="content-max space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">{business.name}</p>
        </div>
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </div>
        )}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Branding</h2>
          <div className="flex items-center gap-4">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt="Logo"
                className="h-10 w-10 rounded-md border border-slate-200 object-contain bg-white"
              />
            ) : (
              <div className="h-10 w-10 rounded-md border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                No logo
              </div>
            )}
            <div>
              <label className="label">Upload logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={saving}
                className="text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                JPG or PNG, square works best. Used in the app header and on sent bill PDFs.
              </p>
            </div>
          </div>
        </div>
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Billing</h2>
          <div>
            <label className="label">Days until past due</label>
            <input
              type="number"
              min={0}
              max={365}
              value={pastDueDays}
              onChange={(e) => setPastDueDays(Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)))}
              className="input w-24"
            />
            <p className="mt-1 text-xs text-slate-500">Number of days after the due date before a bill is considered past due. 0 = due date is the cutoff.</p>
          </div>
          <div>
            <label className="label">Recurring reminder interval (days)</label>
            <input
              type="number"
              min={0}
              max={365}
              value={reminderIntervalDays}
              onChange={(e) => setReminderIntervalDays(Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)))}
              className="input w-24"
            />
            <p className="mt-1 text-xs text-slate-500">Send automatic text reminders with payment links every N days for past-due bills. 0 = disabled.</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleSaveBilling} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <div className="card p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800">Sent bill footer</h2>
          <textarea
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            rows={3}
            className="input min-h-[80px]"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveFooter}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

