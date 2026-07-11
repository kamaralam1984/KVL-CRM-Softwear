"use server";
import { getServerClient } from "@/lib/supabase/server";
import { tasks as seedTasks } from "@/lib/data";

export type Task = (typeof seedTasks)[number];

export async function getTasks(): Promise<Task[]> {
  const db = getServerClient();
  const { data, error } = await db
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return seedTasks;
  return data as Task[];
}

export async function createTask(task: Omit<Task, "id">): Promise<Task> {
  const db = getServerClient();
  const { data, error } = await db
    .from("tasks")
    .insert(task)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function updateTask(id: number, patch: Partial<Task>): Promise<Task> {
  const db = getServerClient();
  const { data, error } = await db
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Task;
}

export async function deleteTask(id: number): Promise<void> {
  const db = getServerClient();
  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
