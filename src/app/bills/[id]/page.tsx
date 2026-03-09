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
  draft: "Draft",
  ready: "Ready",
  finalized: "Billed",
  billed: "Billed",
  sent: "Billed",
  paid: "Paid",
  written_off: "Written off",
  void: "Void",
};

function StatusBadge({ status }: { status: string }) {
  const s = (status || "draft").toLowerCase();
  const styles: Record<string, string> = {
    draft: "bg-amber-50 text-amber-700 border-amber-200",
    ready: "bg-sky-50 text-sky-700 border-sky-200",
    finalized: "bg-slate-100 text-slate-700 border-slate-200",
    billed: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-slate-100 text-slate-700 border-slate-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    written_off: "bg-rose-50 text-rose-700 border-rose-200",
    void: "bg-slate-100 text-slate-500 border-slate-200",
  };
  const style = styles[s] || styles.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {STATUS_LABELS[s] || s}
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
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/bills/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.bill) setBill(d.bill);
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
      setMessage({ type: "success", text: "Charge updated." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Failed to update",
      });
    } finally {
      setBusy(false);
    }
  };

  const canMarkSent = bill && ["draft", "ready", "finalized"].includes((bill.status || "").toLowerCase());
  const canMarkPaid = bill && ["sent", "billed"].includes((bill.status || "").toLowerCase());
  const canWriteOff = bill && ["sent", "billed"].includes((bill.status || "").toLowerCase());

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
          <p className="text-slate-600 mb-4">Charge not found.</p>
          <Link href="/bills" className="btn-secondary">
            Back to charges
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
              ← Back to charges
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              Charge details
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
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                Summary
              </h2>
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
                    className="btn-primary w-full"
                  >
                    {busy ? "Updating…" : "Mark as Paid"}
                  </button>
                )}
                {canWriteOff && (
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt("Reason for write-off (optional):", "Bad debt");
                      updateStatus("written_off", { writeoffReason: reason ?? null });
                    }}
                    disabled={busy}
                    className="btn-secondary w-full text-rose-700 border-rose-200 hover:bg-rose-50"
                  >
                    {busy ? "Updating…" : "Write off"}
                  </button>
                )}
                {!canMarkSent && !canMarkPaid && !canWriteOff && (
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
