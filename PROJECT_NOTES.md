# AR Billing — Project Notes & Recovery Guide

**Project path:** `C:\Users\josep\ar-billing`  
**Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase, Stripe  
**Last updated:** March 3, 2025

---

## Quick Start (After Restart)

```bash
cd C:\Users\josep\ar-billing
npm install
npm run dev
```

Open http://localhost:3000

---

## What’s Built (Current State)

### ✅ Done
- **Shared nav** — All pages: Dashboard, Customers, Bills, New Bill
- **Home page** (`/`) — Landing with nav
- **Dashboard** (`/dashboard`) — Customer count, bill count, total AR (unpaid)
- **Customers list** (`/customers`) — Lists all customers from Supabase
- **Add customer** (`/customers/new`) — Form: name (required), email, phone
- **Bills list** (`/bills`) — List bills with customer, amount, due date, status
- **New bill** (`/bills/new`) — Create bill: select customer, amount, description, due date
- **API** — `GET/POST /api/customers`, `GET/POST /api/bills`
- **Supabase** — `customers` and `bills` tables
- **Stripe payment links** — "Get link" / "Copy link" on bills → creates Stripe Payment Link, copies to clipboard
- **Stripe webhook** — Marks bill paid when customer completes payment
- **Company page** (`/company`) — Public business page for Stripe verification (no auth)

### ⚠️ Not Built Yet
- `/customers/import` — CSV import
- Edit/delete customer
- Twilio — calling for AR follow-up

---

## File Structure

```
ar-billing/
├── .env.local
├── package.json
├── tsconfig.json
├── supabase/migrations/001_create_bills.sql   # Run in Supabase SQL Editor
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── customers/route.ts
│   │   │   ├── bills/route.ts
│   │   │   └── bills/[id]/payment-link/route.ts
│   │   ├── webhooks/stripe/route.ts
│   │   ├── bills/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx
│   ├── components/Nav.tsx
│   └── lib/
│       ├── stripe.ts
│       └── supabase.ts
```

---

## Environment Variables (.env.local)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-only) |
| `STRIPE_SECRET_KEY` | Stripe secret key (from dashboard.stripe.com) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret (see Stripe setup below) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. http://localhost:3000) |

### Stripe Setup

1. **Keys:** Dashboard → Developers → API keys. Copy secret key to `STRIPE_SECRET_KEY`.
2. **Webhook (local):** Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` — it prints a `whsec_...` secret. Add to `STRIPE_WEBHOOK_SECRET`.
3. **Webhook (production):** Dashboard → Developers → Webhooks → Add endpoint `https://yourdomain.com/api/webhooks/stripe`, event `checkout.session.completed`. Copy signing secret to `STRIPE_WEBHOOK_SECRET`.
4. **Business verification:** Stripe may require a public website. Deploy the app, then use `https://yourdomain.com/company` as the website URL. Set `NEXT_PUBLIC_BUSINESS_NAME` in `.env` to exactly match the business name in your Stripe account.

---

## Supabase Schema (Assumed)

**Table: `customers`**
- `id` (uuid, primary key)
- `business_id` (uuid) — hardcoded in API: `00000000-0000-0000-0000-000000000001`
- `name` (text)
- `email` (text, nullable)
- `phone` (text, nullable)
- `created_at` (timestamp)

**Table: `bills`** — Run `supabase/migrations/001_create_bills.sql` in Supabase SQL Editor if not created yet.
- `id`, `business_id`, `customer_id`, `amount_cents`, `balance_cents`, `description`, `due_date`, `status` (draft/sent/paid/overdue), etc.

---

## Suggested Next Steps

1. **Twilio** — Calling for AR follow-up (click-to-call, outbound)
2. **Customer import** — `/customers/import` — CSV import
3. **Edit/delete customer** — Edit form, delete action

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |

---

## Notes

- **Business ID:** Single-tenant for now; `BUSINESS_ID` in `src/app/api/customers/route.ts`
- **Supabase project:** `rezylelcofnundzdnfen` (from .env URL)
- Open project in Cursor: `File → Open Folder → C:\Users\josep\ar-billing`
