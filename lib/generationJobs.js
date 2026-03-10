const { v4: uuid } = require("uuid");
const { adminClient } = require("./supabaseClient");

function requireAdminClient() {
  const supabase = adminClient();
  if (!supabase) {
    throw new Error(
      "Supabase admin client not available. Проверь NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY и SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return supabase;
}

async function createGenerationJob(payload) {
  const supabase = requireAdminClient();
  const id = uuid();

  const row = {
    id,
    status: "queued",
    payload_json: payload,
    concept_json: null,
    draft_json: null,
    error_text: null,
    started_at: null,
    completed_at: null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("generation_jobs")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("createGenerationJob error", error);
    throw new Error(error.message || "Не удалось создать задачу генерации");
  }

  return data;
}

async function getGenerationJob(jobId) {
  const supabase = requireAdminClient();

  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("getGenerationJob error", error);
    throw new Error(error.message || "Не удалось прочитать задачу генерации");
  }

  return data || null;
}

async function updateGenerationJob(jobId, patch) {
  const supabase = requireAdminClient();

  const nextPatch = {
    ...patch,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("generation_jobs")
    .update(nextPatch)
    .eq("id", jobId)
    .select()
    .single();

  if (error) {
    console.error("updateGenerationJob error", error);
    throw new Error(error.message || "Не удалось обновить задачу генерации");
  }

  return data;
}

module.exports = {
  createGenerationJob,
  getGenerationJob,
  updateGenerationJob
};