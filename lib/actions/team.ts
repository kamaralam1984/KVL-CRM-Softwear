"use server";
import { getServerClient } from "@/lib/supabase/server";
import { teamMembers as seedTeam } from "@/lib/data";
import { assertCan } from "@/lib/security/requireAction";

export type TeamMember = (typeof seedTeam)[number];

export async function getTeamMembers(accessToken?: string): Promise<TeamMember[]> {
  if (!(await assertCan(accessToken, "team", "read"))) return [];

  const db = getServerClient();
  const { data, error } = await db
    .from("team_members")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return seedTeam;
  return data as TeamMember[];
}

export async function createTeamMember(member: Omit<TeamMember, "id">, accessToken?: string): Promise<TeamMember> {
  if (!(await assertCan(accessToken, "team", "create"))) throw new Error("Forbidden");

  const db = getServerClient();
  const { data, error } = await db
    .from("team_members")
    .insert(member)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TeamMember;
}

export async function updateTeamMember(id: number, patch: Partial<TeamMember>, accessToken?: string): Promise<TeamMember> {
  if (!(await assertCan(accessToken, "team", "update"))) throw new Error("Forbidden");

  const db = getServerClient();
  const { data, error } = await db
    .from("team_members")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TeamMember;
}

export async function deleteTeamMember(id: number, accessToken?: string): Promise<void> {
  if (!(await assertCan(accessToken, "team", "delete"))) throw new Error("Forbidden");

  const db = getServerClient();
  const { error } = await db.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
