"use server";
import { getServerClient } from "@/lib/supabase/server";
import { invoices as seedInvoices } from "@/lib/data";
import { assertCan } from "@/lib/security/requireAction";

export type Invoice = (typeof seedInvoices)[number];

export async function getInvoices(accessToken?: string): Promise<Invoice[]> {
  if (!(await assertCan(accessToken, "finance", "read"))) return [];

  const db = getServerClient();
  const { data, error } = await db
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return seedInvoices;
  return (data ?? []) as Invoice[];
}

export async function createInvoice(invoice: Invoice, accessToken?: string): Promise<Invoice> {
  if (!(await assertCan(accessToken, "finance", "create"))) throw new Error("Forbidden");

  const db = getServerClient();
  const { data, error } = await db
    .from("invoices")
    .insert(invoice)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Invoice;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>, accessToken?: string): Promise<Invoice> {
  if (!(await assertCan(accessToken, "finance", "update"))) throw new Error("Forbidden");

  const db = getServerClient();
  const { data, error } = await db
    .from("invoices")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Invoice;
}

export async function deleteInvoice(id: string, accessToken?: string): Promise<void> {
  if (!(await assertCan(accessToken, "finance", "delete"))) throw new Error("Forbidden");

  const db = getServerClient();
  const { error } = await db.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
