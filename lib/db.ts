import { adminClient, createServerClient } from "./supabaseClient";
import { cookies } from "next/headers";
import { v4 as uuid } from "uuid";

/**
 * Supabase table schema (execute in your migrations):
 *
 * -- users(id uuid pk, email text, tg_id text, created_at timestamptz default now())
 * -- projects(id uuid pk, user_id uuid, title text, category text, created_at timestamptz default now())
 * -- drafts(id uuid pk, project_id uuid, data_json jsonb, model text, created_at timestamptz default now())
 * -- files(id uuid pk, project_id uuid, type text, url text, created_at timestamptz default now())
 */

export async function getServerSession() {
  const cookieStore = cookies();
  const supabase = createServerClient(cookieStore);
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { user } = data;
  return {
    id: user.id,
    email: user.email ?? null,
    user
  };
}

export async function ensureUser(email: string) {
  if (!email) return null;
  const supabase = adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("ensureUser select error", error);
    return null;
  }

  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({
      id: uuid(),
      email
    })
    .select()
    .single();

  if (insertError) {
    console.error("ensureUser insert error", insertError);
    return null;
  }

  return inserted;
}

export async function listProjects(userId: string) {
  if (!userId) return [];
  const supabase = adminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("*, drafts(id, created_at), files(id, type, url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listProjects error", error);
    return [];
  }
  return data ?? [];
}

export async function createProject(userId: string, payload: { title: string; category?: string }) {
  const supabase = adminClient();
  if (!supabase) throw new Error("Supabase admin client not available");
  const { data, error } = await supabase
    .from("projects")
    .insert({
      id: uuid(),
      user_id: userId,
      title: payload.title,
      category: payload.category ?? null
    })
    .select()
    .single();

  if (error) {
    console.error("createProject error", error);
    throw error;
  }
  return data;
}

export async function getProjectById(projectId: string) {
  const supabase = adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .select("*, drafts(id, data_json, created_at, model)")
    .eq("id", projectId)
    .maybeSingle();
  if (error) {
    console.error("getProjectById error", error);
    return null;
  }
  return data;
}

export async function insertDraft({
  projectId,
  data,
  model
}: {
  projectId: string;
  data: unknown;
  model?: string | null;
}) {
  const supabase = adminClient();
  if (!supabase) return null;
  const draftId = uuid();
  const { error } = await supabase.from("drafts").insert({
    id: draftId,
    project_id: projectId,
    data_json: data,
    model: model ?? null
  });
  if (error) {
    console.error("insertDraft error", error);
  }
  return draftId;
}

export async function upsertUserTelegram(userId: string, tgId: string) {
  const supabase = adminClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("users")
    .update({ tg_id: tgId })
    .eq("id", userId);
  if (error) {
    console.error("upsertUserTelegram error", error);
  }
}

export async function getUserById(userId: string) {
  const supabase = adminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error("getUserById error", error);
    return null;
  }
  return data;
}

