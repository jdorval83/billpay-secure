# AR Billing

Billing and AR follow-up for service businesses. Add customers, create bills, send payment links via Stripe, and export to Excel.

**Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Supabase, Stripe

## Setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in your Supabase + Stripe keys
3. Create the `customers` table in Supabase (see PROJECT_NOTES.md for schema)
4. `npm run dev`

## Project Path

```
C:\Users\josep\ar-billing
```

**Important:** Open this folder in Cursor (`File → Open Folder`) so you always work in the right place.

## Documentation

See **PROJECT_NOTES.md** for full project state, file structure, next steps, and recovery after a restart.
