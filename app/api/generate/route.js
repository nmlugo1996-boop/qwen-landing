import { NextResponse } from "next/server";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";
import { supaServer, hasSupabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

// Валидация входных данных: то, что шлёт GeneratorForm.tsx
const INPUT_SCHEMA = z.object({
  category: z.string().min(1),
  audience: z.array(z.string()).default([]),
  pain: z.string().optional(),
  innovation: z.string().optional(),
  comment: z.string().optional(),
  name: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.7),
  projectId: z.string().uuid().optional(),
  // галочки по вопросам (c1, c2, s1, ... d2)
  diagnostics: z
    .record(z.union([z.literal("yes"), z.literal("no"), z.null()]))
    .optional()
});

// Загружаем эталонные паспорта из папки reference/
async function loadReferenceDocs() {
  const baseDir = path.join(process.cwd(), "reference");
  const files = [
    "photon_example.md",
    "cosmo_sausage_example.md",
    "smart_drink_example.md"
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

// Вызов Qwen через OpenRouter: генерация паспорта в JSON-формате
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
    "2) Ценность = ответ на боль + новая модель потребления, а не просто функция.",
    "3) Новая привычка = новый формат действия (ритуал, микро-поведение, эмоциональный сценарий).",
    "4) Сенсорика (зрение, звук, запах, тактильность, вкус) служит устранению боли и закреплению новой привычки.",
    "5) Бренд усиливает самоидентификацию: потребитель чувствует себя лучше, более цельным, более «своим».",
    "6) Маркетинг разворачивает идею во времени: стратегия 3–5–10 лет.",
    "7) Все ответы связаны: боль → новая модель потребления → сенсорика → бренд → маркетинг → технология и вывод.",
    "",
    "Работай строго на русском языке.",
    "Верни ТОЛЬКО один валидный JSON-объект без Markdown, без комментариев и без дополнительного текста вокруг.",
    "Структура JSON такая:",
    "{",
    '  "header": {',
    '    "category": "строка — человекочитаемое описание категории продукта",',
    '    "name": "строка — рабочее название продукта",',
    '    "audience": "строка — описание целевой аудитории (возраст, группы)",',
    '    "pain": "строка — основная потребительская боль, с которой работаем",',
    '    "innovation": "строка — суть инновации/уникальности продукта"',
    "  },",
    '  "blocks": {',
    '    "cognitive": [',
    '      { "no": "1.1", "question": "Какую потребительскую боль используем для создания дизрапта?", "answer": "..." },',
    '      { "no": "1.2", "question": "Изменение модели потребления: какой новый рынок открываем?", "answer": "..." },',
    '      { "no": "1.3", "question": "Изменение технологии потребления: какие новые привычки потребления внедряем?", "answer": "..." },',
    '      { "no": "1.4", "question": "Нарративы: как объясняем, что инновация нужна, полезна, выгодна?", "answer": "..." },',
    '      { "no": "1.5", "question": "На работе с какими когнитивными функциями потребителя фокусируемся?", "answer": "..." }',
    "    ],",
    '    "sensory": [',
    '      { "no": "2.1", "question": "Сильный визуальный образ", "answer": "..." },',
    '      { "no": "2.2", "question": "Сильный аудиальный образ", "answer": "..." },',
    '      { "no": "2.3", "question": "Сильный обонятельный образ", "answer": "..." },',
    '      { "no": "2.4", "question": "Сильный осязательный образ", "answer": "..." },',
    '      { "no": "2.5", "question": "Сильный вкусовой образ", "answer": "..." }',
    "    ],",
    '    "branding": [',
    '      { "no": "3.1", "question": "Как улучшаем личную историю и самоидентификацию потребителя?", "answer": "..." },',
    '      { "no": "3.2", "question": "Какой контекст поможет развить бренд? Какой помешает?", "answer": "..." },',
    '      { "no": "3.3", "question": "Сильное ядро бренда: название, логотип, слоган, суть, доп. элементы", "answer": "..." },',
    '      { "no": "3.4", "question": "Уникальный путь клиента с продуктом и брендом (опыт бренда)", "answer": "..." },',
    '      { "no": "3.5", "question": "Стратегия развития бренда на 3–5–10 лет", "answer": "..." }',
    "    ],",
    '    "marketing": [',
    '      { "no": "4.1", "question": "Сегментация / Позиционирование", "answer": "..." },',
    '      { "no": "4.2", "question": "Описание базового продукта и его развитие во времени", "answer": "..." },',
    '      { "no": "4.3", "question": "Развитие ценообразования", "answer": "..." },',
    '      { "no": "4.4", "question": "Развитие каналов сбыта", "answer": "..." },',
    '      { "no": "4.5", "question": "Продвижение (с фокусом на безбюджетный маркетинг)", "answer": "..." }',
    "    ]",
    "  },",
    '  "tech": ["строки с предложениями по технологии и составу"],',
    '  "star": ["строки с объяснением, почему продукт может стать звездой рынка"],',
    '  "conclusion": "строка — цельный вывод и следующий шаг по продукту"',
    "}",
    "",
    "Требования к качеству:",
    "- Каждый массив blocks.cognitive / sensory / branding / marketing содержит РОВНО 5 объектов.",
    '- Поле \"answer\" в каждом объекте обязательно, не может быть пустым, нейтральным или заглушкой.',
    "- Ответы должны быть конкретными, глубокими, связанными с категорией, аудиторией, болью и инновацией.",
    "",
    "Во входных данных может быть объект diagnostics: ключ — код вопроса (например, c1, s3, b5, m2, d1), значение — \"yes\", \"no\" или null.",
    "- Если значение \"yes\" — этот пункт особенно важен для пользователя, усиливай его детализацию, примеры, сценарии.",
    "- Если \"no\" или null — можешь отвечать стандартно.",
    "- Несмотря на diagnostics, заполняй ВСЕ пункты 1.1–4.5 и блоки tech, star, conclusion.",
    "",
    "Поле tech — описывает рецептуру, технологию и состав с учётом инновации и боли.",
    "Поле star — объясняет, почему продукт может стать «звездой» категории.",
    "Поле conclusion — цельный вывод, следующий шаг (проверка гипотез, пилоты и т.п.).",
    "",
    "Используй принципы и стиль методики «Полярная Звезда», а плотность, глубину и энергию текста ориентируй на следующие эталонные примеры:",
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
    const message =
      error instanceof z.ZodError
        ? error.flatten()
        : { error: error.message || "Internal error" };
    return NextResponse.json(message, { status: 400 });
  }
}

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
  } catch (error) {
    console.warn("persistDraft error:", error.message);
  }
}
