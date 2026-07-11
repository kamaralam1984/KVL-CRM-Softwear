"use server";
import { getServerClient } from "@/lib/supabase/server";
import { invoices as seedInvoices } from "@/lib/data";

export type Invoice = (typeof seedInvoices)[number];

export async function getInvoices(): Promise<Invoice[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return seedInvoices;
  return data as Invoice[];
}

export async function createInvoice(invoice: Invoice): Promise<Invoice> {
  const db = getServerClient();
  const { data, error } = await db
    .from("invoices")
    .insert(invoice)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Invoice;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice> {
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

export async function deleteInvoice(id: string): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
