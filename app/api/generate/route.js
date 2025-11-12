import { NextResponse } from "next/server";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";
import { supaServer, hasSupabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

const INPUT_SCHEMA = z.object({
  category: z.string().min(1),
  audience: z.array(z.string()).default([]),
  pain: z.string().optional(),
  innovation: z.string().optional(),
  name: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.7),
  projectId: z.string().uuid().optional()
});

async function loadReferenceDocs() {
  const baseDir = path.join(process.cwd(), "reference");
  const files = ["form_template.md", "book_v2_excerpt.md", "miau_example.md"];
  const contents = await Promise.all(
    files.map(async (file) => {
      const content = await fs.readFile(path.join(baseDir, file), "utf-8").catch(() => "");
      return `# ${file}\n${content}`;
    })
  );
  return contents.join("\n\n");
}

async function callLLM(payload, references) {
  const provider = process.env.MODEL_PROVIDER || "openai";
  const model = process.env.MODEL_NAME || "gpt-4o-mini";

  const systemPrompt = [
    "Ты — эксперт по когнитивно-сенсорному маркетингу \"Полярная звезда\".",
    "Сформируй JSON паспорта продукта по шаблону.",
    references
  ].join("\n\n");

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
          temperature: payload.temperature
        },
        null,
        2
      )
    }
  ];

  let endpoint = "";
  let headers = {};
  const body = {
    model,
    temperature: payload.temperature ?? 0.7,
    response_format: { type: "json_object" },
    messages
  };

  if (provider === "openrouter") {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
    endpoint = "https://openrouter.ai/api/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://polar-star.vercel.app",
      "X-Title": "Polar Star Passport Generator",
      "Content-Type": "application/json"
    };
    body.model = process.env.OPENROUTER_MODEL || body.model;
  } else {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not configured");
    endpoint = "https://api.openai.com/v1/chat/completions";
    headers = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM вернул пустой ответ");
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse LLM JSON:", content);
    throw new Error("Не удалось распарсить ответ модели.");
  }
}

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
    const message = error instanceof z.ZodError ? error.flatten() : { error: error.message || "Internal error" };
    return NextResponse.json(message, { status: 400 });
  }
}

async function persistDraft(result) {
  try {
    if (!hasSupabase) return;
    const supa = supaServer();
    if (!supa) return;
    const email = process.env.NEXT_PUBLIC_FALLBACK_EMAIL || "demo@example.com";
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
      model: process.env.MODEL_NAME || "unknown"
    });
  } catch (error) {
    console.warn("persistDraft error:", error.message);
  }
}

