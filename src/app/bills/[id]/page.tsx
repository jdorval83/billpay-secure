"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Bill = {
  id: string;
  customer_id: string;
  amount_cents: number;
  balance_cents: number;
  due_date: string;
  description: string;
  status: string;
  sent_at: string | null;
  paid_at: string | null;
  first_sent_at: string | null;
  last_sent_at: string | null;
  written_off_at: string | null;
  writeoff_reason: string | null;
  created_at: string;
  attachment_url?: string | null;
  customers?: { name?: string; email?: string; phone?: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  ready: "Ready",
  draft: "Ready",
  billed: "Billed",
  finalized: "Billed",
  sent: "Billed",
  past_due: "Past due",
  overdue: "Past due",
  paid: "Paid",
};

function StatusBadge({ status }: { status: string }) {
  const s = (status || "ready").toLowerCase();
  const displayStatus = s === "draft" ? "ready" : s === "finalized" || s === "sent" ? "billed" : s === "overdue" ? "past_due" : s;
  const styles: Record<string, string> = {
    ready: "bg-sky-50 text-sky-700 border-sky-200",
    billed: "bg-slate-100 text-slate-700 border-slate-200",
    past_due: "bg-rose-50 text-rose-700 border-rose-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const style = styles[displayStatus] || styles.ready;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {STATUS_LABELS[displayStatus] || displayStatus}
    </span>
  );
}

export default function BillDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ amount: "", description: "", due_date: "" });
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/bills/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.bill) {
          setBill(d.bill);
          setEditForm({
            amount: ((d.bill.amount_cents || 0) / 100).toFixed(2),
            description: d.bill.description || "",
            due_date: d.bill.due_date || "",
          });
        }
      })
      .catch(() => setBill(null))
      .finally(() => setLoading(false));
  }, [id]);

  const format = (c: number) =>
    "$" + (c / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const formatDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString() : "—";

  const updateStatus = async (status: string, extra?: Record<string, unknown>) => {
    if (!bill) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setBill(data.bill);
      setMessage({ type: "success", text: "Bill updated." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to update",
      });
    } finally {
      setBusy(false);
    }
  };

  const canEdit = bill && ["draft", "ready", "past_due", "overdue"].includes((bill.status || "").toLowerCase());
  const canMarkSent = bill && ["draft", "ready"].includes((bill.status || "").toLowerCase());
  const canMarkPaid = bill && ["billed", "past_due", "overdue", "finalized", "sent"].includes((bill.status || "").toLowerCase());
  const canResend = bill && ["billed", "past_due", "overdue", "finalized", "sent"].includes((bill.status || "").toLowerCase());

  const handleResend = async () => {
    if (!bill) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bills/${bill.id}/resend`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      setMessage({ type: "success", text: data.message || "Payment link sent via text." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to resend" });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!bill) return;
    const amountCents = Math.round(parseFloat(editForm.amount || "0") * 100);
    if (amountCents <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than 0" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_cents: amountCents, description: editForm.description.trim() || "Invoice", due_date: editForm.due_date }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setBill(data.bill);
      setEditing(false);
      setMessage({ type: "success", text: "Bill updated." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setBusy(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bill) return;
    setUploadingAttachment(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`/api/bills/${bill.id}/attachment`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setBill(data.bill);
      setMessage({ type: "success", text: "Job photo updated." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploadingAttachment(false);
      e.target.value = "";
    }
  };

  if (loading || !id) {
    return (
      <main className="page-container">
        <div className="content-max">
          <div className="skeleton h-8 w-48 mb-6" />
          <div className="skeleton h-64 w-full" />
        </div>
      </main>
    );
  }

  if (!bill) {
    return (
      <main className="page-container">
        <div className="content-max">
          <p className="text-slate-600 mb-4">Bill not found.</p>
          <Link href="/bills" className="btn-secondary">
            Back to bills
          </Link>
        </div>
      </main>
    );
  }

  const customer = bill.customers as { name?: string; email?: string; phone?: string } | undefined;

  return (
    <main className="page-container">
      <div className="content-max">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/bills"
              className="text-slate-500 hover:text-slate-700 text-sm font-medium"
            >
              ← Back to bills
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              Bill details
            </h1>
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg border p-3 text-sm ${
              message.type === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Summary</h2>
                {canEdit && (
                  editing ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSaveEdit} disabled={busy} className="btn-primary text-sm py-1.5">Save</button>
                      <button type="button" onClick={() => { setEditing(false); setEditForm({ amount: ((bill.amount_cents || 0) / 100).toFixed(2), description: bill.description || "", due_date: bill.due_date || "" }); }} className="btn-secondary text-sm py-1.5">Cancel</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-emerald-600 hover:text-emerald-800">Edit</button>
                  )
                )}
              </div>
              {editing && canEdit ? (
                <div className="space-y-4">
                  <div>
                    <label className="label">Amount ($)</label>
                    <input type="number" step="0.01" min="0" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <input type="text" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="label">Due date</label>
                    <input type="date" value={editForm.due_date} onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))} className="input" />
                  </div>
                </div>
              ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <dt className="text-slate-500">Description</dt>
                <dd className="font-medium text-slate-900">
                  {bill.description || "—"}
                </dd>
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-medium text-slate-900">{format(bill.amount_cents)}</dd>
                <dt className="text-slate-500">Balance due</dt>
                <dd className="font-medium text-slate-900">{format(bill.balance_cents)}</dd>
                <dt className="text-slate-500">Due date</dt>
                <dd className="font-medium text-slate-900">{bill.due_date}</dd>
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <StatusBadge status={bill.status} />
                </dd>
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium text-slate-900">{formatDate(bill.created_at)}</dd>
                {bill.sent_at && (
                  <>
                    <dt className="text-slate-500">First sent</dt>
                    <dd className="font-medium text-slate-900">{formatDate(bill.first_sent_at)}</dd>
                    <dt className="text-slate-500">Last sent</dt>
                    <dd className="font-medium text-slate-900">{formatDate(bill.last_sent_at)}</dd>
                  </>
                )}
                {bill.paid_at && (
                  <>
                    <dt className="text-slate-500">Paid at</dt>
                    <dd className="font-medium text-slate-900">{formatDate(bill.paid_at)}</dd>
                  </>
                )}
                {bill.written_off_at && (
                  <>
                    <dt className="text-slate-500">Written off</dt>
                    <dd className="font-medium text-slate-900">{formatDate(bill.written_off_at)}</dd>
                    {bill.writeoff_reason && (
                      <>
                        <dt className="text-slate-500">Reason</dt>
                        <dd className="text-slate-600">{bill.writeoff_reason}</dd>
                      </>
                    )}
                  </>
                )}
              </dl>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                Customer
              </h2>
              <p className="font-medium text-slate-900">{customer?.name ?? "—"}</p>
              {customer?.email && (
                <p className="text-sm text-slate-600 mt-1">{customer.email}</p>
              )}
              {customer?.phone && (
                <p className="text-sm text-slate-600">{customer.phone}</p>
              )}
              <Link
                href={`/customers?highlight=${bill.customer_id}`}
                className="text-sm text-emerald-600 font-medium mt-2 inline-block hover:underline"
              >
                View customer →
              </Link>
            </div>

            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                Job / item photo
              </h2>
              {bill.attachment_url ? (
                <div className="space-y-2">
                  <a href={bill.attachment_url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={bill.attachment_url} alt="Job" className="w-full max-h-40 object-contain rounded-lg border border-slate-200" />
                  </a>
                  <p className="text-xs text-slate-500">Max 500KB. JPG, PNG, or WebP.</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" ref={attachmentInputRef} className="hidden" onChange={handleAttachmentUpload} />
                  <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={uploadingAttachment} className="btn-secondary text-sm py-1.5 w-full">
                    {uploadingAttachment ? "Uploading…" : "Replace photo"}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Attach a photo of the job or item (optional, max 500KB).</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" ref={attachmentInputRef} className="hidden" onChange={handleAttachmentUpload} />
                  <button type="button" onClick={() => attachmentInputRef.current?.click()} disabled={uploadingAttachment} className="btn-secondary text-sm py-2 w-full">
                    {uploadingAttachment ? "Uploading…" : "Upload photo"}
                  </button>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                Actions
              </h2>
              <div className="flex flex-col gap-2">
                {canMarkSent && (
                  <button
                    type="button"
                    onClick={() => updateStatus("billed")}
                    disabled={busy}
                    className="btn-primary w-full"
                  >
                    {busy ? "Sending…" : "Send"}
                  </button>
                )}
                {canMarkPaid && (
                  <button
                    type="button"
                    onClick={() => updateStatus("paid")}
                    disabled={busy}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                      ["past_due", "overdue"].includes((bill.status || "").toLowerCase())
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "btn-primary"
                    }`}
                  >
                    {busy ? "Updating…" : "Mark as Paid"}
                  </button>
                )}
                {canResend && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={busy}
                    className="btn-secondary w-full"
                  >
                    {busy ? "Sending…" : "Resend payment link"}
                  </button>
                )}
                {!canMarkSent && !canMarkPaid && !canResend && (
                  <p className="text-sm text-slate-500">No actions available for this status.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
