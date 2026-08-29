"use server";
// The login screen promises frictionless "any email + password (min 4
// chars)" access, but this Supabase project has "Confirm email" turned on
// (a dashboard setting, not something the app config controls) — so every
// email/password signup lands unconfirmed until the user clicks a link that
// may never arrive (no custom SMTP configured), and signInWithPassword then
// fails with a generic "Invalid login credentials" for those accounts.
// This uses the service-role key to auto-confirm the account server-side
// right after signup, and again as a login-time fallback for any account
// that got stuck unconfirmed before this existed — so email/password auth
// actually behaves the way the UI already says it does.

import { getServerClient } from "@/lib/supabase/server";

export async function confirmEmailIfPending(email: string): Promise<void> {
  const db = getServerClient();
  const normalized = email.toLowerCase();
  const { data, error } = await db.auth.admin.listUsers();
  if (error) return;
  const user = data.users.find((u) => u.email?.toLowerCase() === normalized);
  if (user && !user.email_confirmed_at) {
    await db.auth.admin.updateUserById(user.id, { email_confirm: true });
  }
}
