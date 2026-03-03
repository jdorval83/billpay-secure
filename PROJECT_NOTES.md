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
- **Home page** (`/`) — Nav to Dashboard, Customers, Bills, New Bill
- **Customers list** (`/customers`) — Lists all customers from Supabase
- **Add customer** (`/customers/new`) — Form: name (required), email, phone → saves to Supabase
- **API** — `GET/POST /api/customers` — Reads/writes to `customers` table
- **Supabase client** — `src/lib/supabase.ts` — Types: `Customer`, `Bill`
- **Stripe client** — `src/lib/stripe.ts` — Initialized, ready for billing

### ⚠️ Links That 404 (Not Built Yet)
- `/dashboard`
- `/bills`
- `/bills/new`
- `/customers/import`

---

## File Structure

```
ar-billing/
├── .env.local          # Supabase + Stripe keys (DO NOT COMMIT)
├── package.json
├── tsconfig.json
├── next-env.d.ts
├── src/
│   ├── app/
│   │   ├── api/customers/route.ts   # GET/POST customers
│   │   ├── customers/
│   │   │   ├── page.tsx             # Customer list
│   │   │   └── new/page.tsx         # Add customer form
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx                 # Home with nav
│   └── lib/
│       ├── supabase.ts              # Supabase client + Customer, Bill types
│       └── stripe.ts                # Stripe client
└── supabase/           # (empty)
```

---

## Environment Variables (.env.local)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server-only) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. http://localhost:3000) |

---

## Supabase Schema (Assumed)

**Table: `customers`**
- `id` (uuid, primary key)
- `business_id` (uuid) — hardcoded in API: `00000000-0000-0000-0000-000000000001`
- `name` (text)
- `email` (text, nullable)
- `phone` (text, nullable)
- `created_at` (timestamp)

**Table: `bills`** (for future)
- `id`, `business_id`, `customer_id`, `amount_cents`, `balance_cents`, `description`, `due_date`, `status`, `stripe_checkout_session_id`, `payment_link`, `sent_at`, `paid_at`, `created_at`

---

## Suggested Next Steps

1. **Dashboard** — `/dashboard` — Summary (e.g. total AR, recent bills)
2. **Bills list** — `/bills` — List bills with customer, amount, status
3. **New bill** — `/bills/new` — Create bill, link to customer, send Stripe payment link
4. **Customer import** — `/customers/import` — CSV import
5. **Edit/delete customer** — Edit form, delete action
6. **Stripe webhooks** — Handle payment success

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
