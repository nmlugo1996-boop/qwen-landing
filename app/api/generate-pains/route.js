import { NextResponse } from "next/server";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";

const INPUT_SCHEMA = z.object({
  category: z.string().min(1),
  audience: z.array(z.string()).default([]),
  name: z.string().optional(),
  comment: z.string().optional(),
  painDraft: z.string().optional()
});

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

async function callLLMForPains(payload, references) {
  const apiUrl =
    process.env.QWEN_API_URL || "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = process.env.QWEN_API_KEY;
  const model =
    process.env.TEXT_MODEL_NAME || "qwen/qwen3-next-80b-a3b-instruct";

  if (!apiKey) {
    throw new Error("QWEN_API_KEY is not configured");
  }

  const systemPrompt = [
    "Ты — стратег по продуктам и маркетолог.",
    "Твоя задача — на основе описания продукта и аудитории сформулировать список возможных Потребительских болей.",
    "",
    "ВСЕГДА отвечай строго на русском языке.",
    "",
    "Формат ответа — только JSON:",
    "{ \"pains\": [\"...\", \"...\"] }",
    "",
    "Требования:",
    "- до 10 болей;",
    "- без повторов;",
    "- без слова «боль» внутри;",
    "- формулировки 1–2 предложения;",
    "",
    references || ""
  ].join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(payload, null, 2) }
  ];

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages
    })
  });

  if (!response.ok) {
    throw new Error(`API ERROR: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response");

  const parsed = JSON.parse(content);
  return parsed.pains;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = INPUT_SCHEMA.parse(body);
    const references = await loadReferenceDocs();
    const pains = await callLLMForPains(payload, references);

    return NextResponse.json({ pains });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
