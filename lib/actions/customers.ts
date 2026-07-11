"use server";
import { getServerClient } from "@/lib/supabase/server";
import { customers as seedCustomers } from "@/lib/data";

export type Customer = (typeof seedCustomers)[number];

export async function getCustomers(): Promise<Customer[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return seedCustomers;
  return data as Customer[];
}

export async function createCustomer(customer: Omit<Customer, "id">): Promise<Customer> {
  const db = getServerClient();
  const { data, error } = await db
    .from("customers")
    .insert(customer)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Customer;
}

export async function updateCustomer(id: number, patch: Partial<Customer>): Promise<Customer> {
  const db = getServerClient();
  const { data, error } = await db
    .from("customers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Customer;
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
