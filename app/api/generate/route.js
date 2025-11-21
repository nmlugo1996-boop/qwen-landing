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

// Берём те же reference, что и основной маршрут
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
    "Формат ответа — только один JSON-объект вида:",
    "{",
    '  "pains": [',
    '    "Боль 1...",',
    '    "Боль 2...",',
    '    "... до 10 болей максимум"',
    "  ]",
    "}",
    "",
    "Требования к болям:",
    "- не дублировать друг друга;",
    "- каждая формулировка должна быть конкретной, живой, понятной человеку;",
    "- длина одной боли — 1–2 предложения, не больше;",
    "- боли должны опираться на категорию продукта, аудиторию и комментарии пользователя;",
    '- не использовать слово «боль» внутри формулировки; говори обычным языком («люди сталкиваются с тем, что…», «человек боится, что…» и т.п.).',
    "",
    "Используй эталонные примеры только как стиль формулировок, но НЕ копируй их дословно.",
    references || ""
  ]
    .filter(Boolean)
    .join("\n");

  const userPayload = {
    category: payload.category,
    audience: payload.audience,
    name: payload.name ?? null,
    comment: payload.comment ?? null,
    painDraft: payload.painDraft ?? null
  };

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: JSON.stringify(userPayload, null, 2)
    }
  ];

  const body = {
    model,
    temperature: 0.7,
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
    throw new Error("Модель вернула пустой ответ");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse JSON from LLM:", content);
    throw new Error("Не удалось распарсить JSON с болями");
  }

  if (!parsed || !Array.isArray(parsed.pains)) {
    throw new Error("Ответ модели не содержит корректный массив pains");
  }

  const pains = parsed.pains
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);

  if (!pains.length) {
    throw new Error("Модель вернула пустой список болей");
  }

  return pains;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = INPUT_SCHEMA.parse(body);
    const references = await loadReferenceDocs();
    const pains = await callLLMForPains(payload, references);
    return NextResponse.json({ pains });
  } catch (error) {
    console.error("Generate pains API error", error);
    const message =
      error instanceof z.ZodError
        ? error.flatten()
        : { error: error.message || "Internal error" };
    return NextResponse.json(message, { status: 400 });
  }
}


