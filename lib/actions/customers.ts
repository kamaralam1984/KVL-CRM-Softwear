"use server";
import { getDb } from "@/lib/db";
import { customers as seedCustomers } from "@/lib/data";
import { triggerChurnAlert } from "@/lib/automation/engine";
import { crossedHealthThreshold } from "@/lib/automation/health";
import { runCustomGraphs } from "@/lib/automation/graph/dispatch";

export type Customer = (typeof seedCustomers)[number];

export async function getCustomers(): Promise<Customer[]> {
  const db = getDb();
  const { data, error } = await db
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return seedCustomers;
  return (data ?? []) as Customer[];
}

export async function createCustomer(customer: Omit<Customer, "id">): Promise<Customer> {
  const db = getDb();
  const { data, error } = await db
    .from("customers")
    .insert(customer)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Customer;
}

export async function updateCustomer(id: number, patch: Partial<Customer>): Promise<Customer> {
  const db = getDb();
  // Only look up the previous score when the health is actually being changed.
  let previousHealth: number | null = null;
  if (typeof patch.health === "number") {
    const { data: before } = await db.from("customers").select("health").eq("id", id).maybeSingle();
    previousHealth = (before?.health as number | undefined) ?? null;
  }
  const { data, error } = await db
    .from("customers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Customer Health Drop event: health fell from >= 60 to < 60. A canvas saved for Churn Alert
  // replaces the built-in steps; a switched-off workflow runs nothing. Never blocks the update.
  const row = data as Customer;
  if (crossedHealthThreshold(previousHealth, row.health)) {
    const ctx = { customerId: id, name: row.name, health: row.health, previous: previousHealth as number };
    runCustomGraphs(
      "customer_health_drop",
      { ...ctx, company: row.name, email: row.email ?? "", phone: row.phone ?? "", score: row.health },
      "churn-alert",
    )
      .then((skipBuiltin) => { if (!skipBuiltin) triggerChurnAlert(ctx); })
      .catch(() => triggerChurnAlert(ctx));
  }
  return row;
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = getDb();
  const { error } = await db.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
