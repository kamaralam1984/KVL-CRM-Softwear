"use server";
// Phase 27 — Commerce Suite I. CRUD for `orders`/`order_items`.

import { getServerClient } from "@/lib/supabase/server";
import { assertCan } from "@/lib/security/requireAction";
import { DEFAULT_SITE_ID } from "@/lib/sites/store";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { attributeOrderToAffiliate } from "@/lib/affiliates/attribution";

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Refunded";

export type OrderItemInput = { name: string; qty: number; price: number };

export type OrderRow = {
  id: string;
  site_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  payment_status: string;
  payment_method: string;
  shipping_method: string;
  amount: number;
  created_at: string;
};

export type OrderWithItems = OrderRow & { items: (OrderItemInput & { id: string })[] };

export async function getOrders(siteId = DEFAULT_SITE_ID, accessToken?: string): Promise<OrderWithItems[]> {
  if (!(await assertCan(accessToken, "commerce", "read"))) return [];
  try {
    const db = getServerClient();
    const { data: orders, error } = await db.from("orders").select("*").eq("site_id", siteId).order("created_at", { ascending: false });
    if (error || !orders?.length) return [];

    const { data: items } = await db.from("order_items").select("*").in("order_id", orders.map((o) => o.id));
    return (orders as OrderRow[]).map((o) => ({
      ...o,
      items: (items ?? []).filter((it) => it.order_id === o.id).map((it) => ({ id: it.id, name: it.name_snapshot, qty: it.qty, price: it.price })),
    }));
  } catch (err) {
    console.error("[commerce] getOrders error:", err);
    return [];
  }
}

// Creates the order + line items, and — when a customer contact is given and
// Razorpay's API keys are configured — a real Razorpay Order so payment can
// actually be collected against it (order id stored as payment_provider_ref).
export async function createOrder(
  input: { customerName: string; customerEmail: string; items: OrderItemInput[]; shippingMethod: string; paymentMethod: string; siteId?: string },
  accessToken?: string,
): Promise<OrderWithItems | null> {
  if (!(await assertCan(accessToken, "commerce", "create"))) return null;
  const amount = input.items.reduce((s, it) => s + it.qty * it.price, 0);
  const orderNumber = `VC-${Date.now().toString(36).toUpperCase()}`;

  try {
    const db = getServerClient();
    const rzp = await createRazorpayOrder(Math.round(amount * 100), orderNumber);

    const { data: order, error } = await db.from("orders").insert({
      site_id: input.siteId ?? DEFAULT_SITE_ID,
      order_number: orderNumber,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      status: "Pending",
      payment_status: "unpaid",
      payment_method: input.paymentMethod,
      payment_provider_ref: rzp.orderId ?? null,
      shipping_method: input.shippingMethod,
      amount,
    }).select().single();
    if (error || !order) { console.error("[commerce] createOrder failed:", error?.message); return null; }

    const itemRows = input.items.map((it) => ({ order_id: order.id, name_snapshot: it.name, qty: it.qty, price: it.price }));
    const { data: items } = await db.from("order_items").insert(itemRows).select();

    // Phase 30 — never blocks order creation if attribution can't be resolved.
    attributeOrderToAffiliate(order.id, input.customerEmail, amount).catch(() => {});

    return { ...(order as OrderRow), items: (items ?? []).map((it) => ({ id: it.id, name: it.name_snapshot, qty: it.qty, price: it.price })) };
  } catch (err) {
    console.error("[commerce] createOrder error:", err);
    return null;
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus, accessToken?: string): Promise<{ ok: boolean }> {
  if (!(await assertCan(accessToken, "commerce", "update"))) return { ok: false };
  try {
    const db = getServerClient();
    const { error } = await db.from("orders").update({ status }).eq("id", id);
    if (error) { console.error("[commerce] updateOrderStatus failed:", error.message); return { ok: false }; }
    return { ok: true };
  } catch (err) {
    console.error("[commerce] updateOrderStatus error:", err);
    return { ok: false };
  }
}

// Called by the Razorpay webhook (server-side only, no accessToken — the
// webhook's own signature verification is the auth for this write).
export async function markOrderPaidByProviderRef(providerRef: string): Promise<void> {
  try {
    const db = getServerClient();
    const { error } = await db.from("orders").update({ payment_status: "paid" }).eq("payment_provider_ref", providerRef);
    if (error) console.error("[commerce] markOrderPaidByProviderRef failed:", error.message);
  } catch (err) {
    console.error("[commerce] markOrderPaidByProviderRef error:", err);
  }
}
