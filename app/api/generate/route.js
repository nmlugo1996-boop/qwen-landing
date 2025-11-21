import { NextResponse } from "next/server";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";
import { supaServer, hasSupabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

// ===== ВАЛИДАЦИЯ ВХОДА =====
const INPUT_SCHEMA = z.object({
  category: z.string().min(1),
  audience: z.array(z.string()).default([]),
  pain: z.string().optional(),
  innovation: z.string().optional(),
  comment: z.string().optional(),
  name: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.7),
  projectId: z.string().uuid().optional(),
  diagnostics: z
    .record(z.union([z.literal("yes"), z.literal("no"), z.null()]))
    .optional()
});

// ===== ЗАГРУЗКА ВСЕХ reference-фАЙЛОВ =====
async function loadReferenceDocs() {
  const baseDir = path.join(process.cwd(), "reference");

  const files = [
    "photon_example.md",
    "cosmo_sausage_example.md",
    "smart_drink_example.md",
    "kids_breakfast_example.md",
    "novaboost_energy.md",
    "smart_kitchen_helper.md",
    "car_future_example.md",
    "smartphone_future_example.md",
    "lifeloop_ai_assistant.md"
  ];

  const contents = await Promise.all(
    files.map(async (file) => {
      const fullPath = path.join(baseDir, file);
      const content = await fs.readFile(fullPath, "utf-8").catch(() => "");
      return content ? `# ${file}\n${content}` : "";
    })
  );

  return contents.filter(Boolean).join("\n\n");
}

// ===== ВЫЗОВ QWEN =====
async function callLLM(payload, references) {
  const apiUrl =
    process.env.QWEN_API_URL || "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = process.env.QWEN_API_KEY;
  const model =
    process.env.TEXT_MODEL_NAME || "qwen/qwen3-next-80b-a3b-instruct";

  if (!apiKey) {
    throw new Error("QWEN_API_KEY is not configured");
  }

  const systemPrompt = [
    "Ты — профессиональный продуктолог, бренд-стратег, когнитивный аналитик и маркетолог.",
    "Ты работаешь по методике «Полярная Звезда» и создаёшь когнитивно-сенсорные маркетинговые паспорта продуктов.",
    "",
    "Главные принципы:",
    "1) Продукт = переобучение потребителя: новая модель потребления, новая сенсорика, новый ритуал.",
    "2) Ценность = ответ на боль + новая модель потребления.",
    "3) Новая привычка = новый формат действия (ритуал, эмоциональный сценарий).",
    "4) Сенсорика усиливает привычку.",
    "5) Бренд усиливает самоидентификацию.",
    "6) Маркетинг разворачивает стратегию 3–5–10 лет.",
    "7) Все блоки связаны между собой.",
    "",
    "Работай строго на русском языке.",
    "Обязательно верни один валидный JSON.",
    "",
    "Используй эталонные примеры только как стиль, НЕ копируй названия и сюжеты.",
    "Запрещено использовать паттерны «мяу», «котики», животные, если пользователь сам их не вводит.",
    "",
    "ЭТАЛОННЫЕ ПРИМЕРЫ:",
    references || ""
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: JSON.stringify(
        {
          category: payload.category,
          name: payload.name ?? null,
          audience: payload.audience,
          pain: payload.pain ?? null,
          innovation: payload.innovation ?? null,
          comment: payload.comment ?? null,
          temperature: payload.temperature,
          diagnostics: payload.diagnostics ?? null
        },
        null,
        2
      )
    }
  ];

  const body = {
    model,
    temperature: payload.temperature ?? 0.7,
    response_format: { type: "json_object" },
    messages
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM вернул пустой ответ");
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Ошибка парсинга JSON.");
  }
}

// ===== ОСНОВНОЙ POST =====
export async function POST(request) {
  try {
    const body = await request.json();
    const payload = INPUT_SCHEMA.parse(body);
    const references = await loadReferenceDocs();

    const draft = await callLLM(payload, references);

    if (hasSupabase) {
      await persistDraft(draft);
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Generate API error", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 400 }
    );
  }
}

// ===== СОХРАНЕНИЕ В БАЗУ =====
async function persistDraft(result) {
  try {
    if (!hasSupabase) return;

    const supa = supaServer();
    if (!supa) return;

    const email =
      process.env.NEXT_PUBLIC_FALLBACK_EMAIL || "demo@example.com";

    await supa.from("users").upsert({ email }).select().single();

    const title = result?.header?.name || "Без названия";
    const category = result?.header?.category || null;

    let { data: proj } = await supa
      .from("projects")
      .select("id")
      .eq("title", title)
      .limit(1)
      .single();

    if (!proj) {
      const ins = await supa
        .from("projects")
        .insert({ title, category })
        .select()
        .single();
      proj = ins.data;
    }

    if (!proj?.id) return;

    await supa.from("drafts").insert({
      project_id: proj.id,
      data_json: result,
      model:
        process.env.TEXT_MODEL_NAME ||
        process.env.MODEL_NAME ||
        "unknown"
    });
  } catch (e) {
    console.warn("persistDraft error:", e.message);
  }
}

