import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

const CUSTOMER_NAMES = [
  "Acme Plumbing", "Baker & Sons HVAC", "City View Dental", "Delta Electric", "Elite Landscaping",
  "First Choice Auto", "Green Valley Restaurant", "Harbor Storage Co", "Innova Tech Solutions", "Johnson Construction",
  "Keystone Manufacturing", "Lakeview Veterinary", "Metro Cleaning Services", "Northern Logistics", "Oak Street Bakery",
  "Pacific Realty", "Quick Print Services", "River City Fitness", "Summit Consulting", "Triple A Towing",
  "Urban Coffee Roasters", "Valley Medical Group", "Westside Dental", "Excel Accounting", "Premier Catering",
  "Apex Law Firm", "Bright Star Daycare", "Coastal Insurance", "Downtown Auto Repair", "Evergreen Landscaping",
];

const DESCRIPTIONS = [
  "Invoice for services", "Monthly retainer", "Project completion", "Consulting fees", "Repair services",
  "Installation", "Maintenance agreement", "Parts and labor", "Professional services", "Work completed",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function POST() {
  try {
    const today = new Date();
    const fourMonthsAgo = new Date(today);
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

    // Get or create customers
    let { data: existingCustomers } = await supabaseAdmin
      .from("customers")
      .select("id, name")
      .eq("business_id", BUSINESS_ID)
      .limit(30);

    let custIds: string[] = (existingCustomers || []).map((c: { id: string }) => c.id);

    if (custIds.length < 30) {
      const toInsert = CUSTOMER_NAMES.slice(0, 30 - custIds.length).map((name, i) => ({
        business_id: BUSINESS_ID,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, "")}@example.com`,
        phone: `555-${String(100 + i).padStart(3, "0")}-${String(1000 + i).padStart(4, "0")}`,
      }));
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("customers")
        .insert(toInsert)
        .select("id");
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      custIds = [...custIds, ...(inserted || []).map((c: { id: string }) => c.id)];
    }
    if (custIds.length === 0) {
      return NextResponse.json({ error: "No customers to attach bills to" }, { status: 500 });
    }

    // Generate 200 bills over last 4 months
    const bills: { business_id: string; customer_id: string; amount_cents: number; balance_cents: number; description: string; due_date: string; status: string }[] = [];

    for (let i = 0; i < 200; i++) {
      const amountCents = randomInt(5000, 500000); // $50 - $5000
      const daysAgo = randomInt(0, 120);
      const dueDate = addDays(today, -daysAgo);
      const isPaid = Math.random() < 0.2;
      bills.push({
        business_id: BUSINESS_ID,
        customer_id: randomChoice(custIds),
        amount_cents: amountCents,
        balance_cents: isPaid ? 0 : amountCents,
        description: randomChoice(DESCRIPTIONS),
        due_date: dueDate,
        status: isPaid ? "paid" : ["draft", "sent", "overdue"][Math.floor(Math.random() * 3)],
      });
    }

    const { data: insertedBills, error: billsError } = await supabaseAdmin
      .from("bills")
      .insert(bills);

    if (billsError) {
      console.error("Bills seed error:", billsError);
      return NextResponse.json({ error: billsError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Seed complete",
      customers: custIds.length,
      bills: bills.length,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed" },
      { status: 500 }
    );
  }
}
