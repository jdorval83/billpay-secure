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
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  website?: string | null;
};

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: "", support_email: "", address_line1: "", address_line2: "", city: "", state: "", postal_code: "", phone: "", website: "" });
  const [footer, setFooter] = useState("");
  const [pastDueDays, setPastDueDays] = useState<number>(0);
  const [reminderIntervalDays, setReminderIntervalDays] = useState<number>(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/business", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        if (data.business) {
          const b = data.business;
          setBusiness(b);
          setProfile({
            name: b.name || "",
            support_email: b.support_email || "",
            address_line1: b.address_line1 || "",
            address_line2: b.address_line2 || "",
            city: b.city || "",
            state: b.state || "",
            postal_code: b.postal_code || "",
            phone: b.phone || "",
            website: b.website || "",
          });
          setFooter(b.invoice_footer || "");
          setPastDueDays(typeof b.past_due_days === "number" ? b.past_due_days : 0);
          setReminderIntervalDays(typeof b.reminder_interval_days === "number" ? b.reminder_interval_days : 0);
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
      const res = await fetch("/api/business/logo", { method: "POST", body: formData });
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

  const handleSaveProfile = async () => {
    if (!business) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name.trim() || undefined,
          support_email: profile.support_email.trim() || null,
          address_line1: profile.address_line1.trim() || null,
          address_line2: profile.address_line2.trim() || null,
          city: profile.city.trim() || null,
          state: profile.state.trim() || null,
          postal_code: profile.postal_code.trim() || null,
          phone: profile.phone.trim() || null,
          website: profile.website.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setBusiness(json.business);
      setMessage("Profile updated. Your logo, name, address, and contact info appear on bill PDFs.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save");
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
      setMessage("Billing settings updated.");
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
      setMessage("Footer updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setMessage("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }
    setPasswordSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to change password");
      setMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
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
          <p className="text-sm text-red-600">{message || "Unable to load settings."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container">
      <div className="content-max space-y-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        {message && (
          <div className={`rounded-lg border px-3 py-2 text-sm ${message.includes("Failed") || message.includes("incorrect") ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {message}
          </div>
        )}

        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Business profile</h2>
          <p className="text-xs text-slate-500">This information and your logo appear on bill PDFs and in the app.</p>
          <div className="flex items-start gap-4">
            {business.logo_url ? (
              <img src={business.logo_url} alt="Logo" className="h-16 w-16 rounded-lg border border-slate-200 object-contain bg-white shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 shrink-0">Logo</div>
            )}
            <div className="flex-1">
              <label className="label">Logo</label>
              <input type="file" accept="image/*" onChange={handleLogoChange} disabled={saving} className="text-sm" />
            </div>
          </div>
          <div>
            <label className="label">Business name</label>
            <input type="text" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className="input" placeholder="Your business name" />
          </div>
          <div>
            <label className="label">Email (support / billing)</label>
            <input type="email" value={profile.support_email} onChange={(e) => setProfile((p) => ({ ...p, support_email: e.target.value }))} className="input" placeholder="contact@example.com" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className="input" placeholder="(555) 123-4567" />
          </div>
          <div>
            <label className="label">Website</label>
            <input type="url" value={profile.website} onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))} className="input" placeholder="https://example.com" />
          </div>
          <div>
            <label className="label">Address</label>
            <input type="text" value={profile.address_line1} onChange={(e) => setProfile((p) => ({ ...p, address_line1: e.target.value }))} className="input mb-2" placeholder="Street address" />
            <input type="text" value={profile.address_line2} onChange={(e) => setProfile((p) => ({ ...p, address_line2: e.target.value }))} className="input mb-2" placeholder="Suite, unit, etc." />
            <div className="flex gap-2">
              <input type="text" value={profile.city} onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))} className="input flex-1" placeholder="City" />
              <input type="text" value={profile.state} onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value }))} className="input w-24" placeholder="State" />
              <input type="text" value={profile.postal_code} onChange={(e) => setProfile((p) => ({ ...p, postal_code: e.target.value }))} className="input w-28" placeholder="ZIP" />
            </div>
          </div>
          <button type="button" onClick={handleSaveProfile} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save profile"}
          </button>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Billing rules</h2>
          <div>
            <label className="label">Days until past due</label>
            <input type="number" min={0} max={365} value={pastDueDays} onChange={(e) => setPastDueDays(Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)))} className="input w-24" />
            <p className="mt-1 text-xs text-slate-500">Days after due date before a bill is past due. 0 = due date.</p>
          </div>
          <div>
            <label className="label">Recurring reminder interval (days)</label>
            <input type="number" min={0} max={365} value={reminderIntervalDays} onChange={(e) => setReminderIntervalDays(Math.max(0, Math.min(365, parseInt(e.target.value, 10) || 0)))} className="input w-24" />
            <p className="mt-1 text-xs text-slate-500">Text reminders for past-due bills every N days. 0 = disabled.</p>
          </div>
          <button type="button" onClick={handleSaveBilling} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </section>

        <section className="card p-6 space-y-3">
          <h2 className="text-base font-semibold text-slate-800">Bill footer</h2>
          <textarea value={footer} onChange={(e) => setFooter(e.target.value)} rows={3} className="input min-h-[80px]" placeholder="Thank you for your business…" />
          <button type="button" onClick={handleSaveFooter} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save footer"}
          </button>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Password</h2>
          <p className="text-xs text-slate-500">Change your account password. Use it on all devices and subdomains.</p>
          <div>
            <label className="label">Current password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input max-w-xs" autoComplete="current-password" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div>
              <label className="label">New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" autoComplete="new-password" />
            </div>
          </div>
          <button type="button" onClick={handleChangePassword} disabled={passwordSaving} className="btn-primary">
            {passwordSaving ? "Updating…" : "Update password"}
          </button>
        </section>
      </div>
    </main>
  );
}
