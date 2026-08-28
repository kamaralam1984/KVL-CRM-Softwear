"use server";
// Phase 27 — Commerce Suite I. CRUD for `products`, following
// lib/actions/tasks.ts's exact shape.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";

export type ProductRow = {
  id: string;
  site_id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  reorder_level: number;
  category: string;
  description: string;
};

export async function getProducts(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<ProductRow[]> {
  if (!(await assertCan(accessToken, "commerce", "read"))) return [];
  try {
    const db = getServerClient();
    const { data, error } = await db.from("products").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
    if (error) { console.error("[commerce] getProducts failed:", error.message); return []; }
    return (data ?? []) as ProductRow[];
  } catch (err) {
    console.error("[commerce] getProducts error:", err);
    return [];
  }
}

export async function createProduct(
  input: Omit<ProductRow, "id" | "site_id"> & { siteId?: string },
  accessToken?: string,
): Promise<ProductRow | null> {
  if (!(await assertCan(accessToken, "commerce", "create"))) return null;
  try {
    const db = getServerClient();
    const { data, error } = await db.from("products").insert({
      site_id: input.siteId ?? DEFAULT_SITE_ID,
      name: input.name, sku: input.sku, price: input.price, stock: input.stock,
      reorder_level: input.reorder_level, category: input.category, description: input.description,
    }).select().single();
    if (error) { console.error("[commerce] createProduct failed:", error.message); return null; }
    return data as ProductRow;
  } catch (err) {
    console.error("[commerce] createProduct error:", err);
    return null;
  }
}

export async function updateProduct(id: string, patch: Partial<ProductRow>, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "commerce", "update"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("products").update(patch).eq("id", id);
    if (error) { console.error("[commerce] updateProduct failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[commerce] updateProduct error:", err);
    return { ok: false };
  }
}

export async function deleteProduct(id: string, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "commerce", "delete"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) { console.error("[commerce] deleteProduct failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[commerce] deleteProduct error:", err);
    return { ok: false };
  }
}
