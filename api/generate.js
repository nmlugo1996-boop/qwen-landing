// api/generate.js
// Быстрая и стабильная версия: один LLM-вызов, встроенная методика (суммарно),
// строгий JSON-ответ, базовая нормализация и защита.

const fs = require("fs");
const path = require("path");

const REF_DIR = path.join(process.cwd(), "reference");

function safeRead(file) {
  try {
    return fs.readFileSync(path.join(REF_DIR, file), "utf8");
  } catch (error) {
    return "";
  }
}

// Читаем методику — но позже будем использовать её в сокращённом виде.
const METHODOLOGY_FULL = safeRead("methodology_meatcode.md") || "";

// Ограничитель, чтобы не встраивать слишком много текста в prompt.
function summarizeMethodology(full, maxChars = 4000) {
  if (!full) return "";
  if (full.length <= maxChars) return full;
  // Берём начало и конец, чтобы сохранить структуру.
  const head = full.slice(0, Math.floor(maxChars * 0.6));
  const tail = full.slice(-Math.floor(maxChars * 0.4));
  return head + "\n\n...\n\n" + tail + "\n\n[ПРЕДПОЛОЖЕНИЕ: методика усечена для экономии токенов]";
}

const METHODOLOGY_REFERENCE = summarizeMethodology(METHODOLOGY_FULL, 3500);

// ---- Конфигурация ----
const FIXED_TEMPERATURE = 0.18;
const INCLUDE_KEYS = [
  "header.category", "header.name", "header.audience", "header.pain", "header.uniqueness",
  "1.1","1.2","1.3","1.4","1.5",
  "2.1","2.2","2.3","2.4","2.5",
  "3.1","3.2","3.3","3.4","3.5",
  "4.1","4.2","4.3","4.4","4.5",
  "tech","packaging","star","conclusion"
];

const BLOCK_SCHEMAS = {
  cognitive: [
    { no: "1.1", question: "Описание нового рынка/ценности; какие старые решения заменяем" },
    { no: "1.2", question: "Изменение привычек потребления; как внедрять" },
    { no: "1.3", question: "Объяснительный нарратив для переобучения потребителей" },
    { no: "1.4", question: "Механики обучения потребителей" },
    { no: "1.5", question: "KPI и протоколы тестирования обучения" }
  ],
  sensory: [
    { no: "2.1", question: "Визуальный образ: цель, тест, критерии" },
    { no: "2.2", question: "Аудиальный образ: цель, тест, критерии" },
    { no: "2.3", question: "Обонятельный образ: цель, тест, критерии" },
    { no: "2.4", question: "Осязательный образ: цель, тест, критерии" },
    { no: "2.5", question: "Вкусовой образ: цель, тест, критерии" }
  ],
  branding: [
    { no: "3.1", question: "Ядро бренда: название, слоган, key visual" },
    { no: "3.2", question: "Контекст и тренды: что помогает/мешает" },
    { no: "3.3", question: "Сильное ядро бренда: логика, идеи" },
    { no: "3.4", question: "Путь клиента и ключевые действия" },
    { no: "3.5", question: "Стратегия развития бренда (3–5–10 лет)" }
  ],
  marketing: [
    { no: "4.1", question: "Сегменты и позиционирование (таблица)" },
    { no: "4.2", question: "Идея базового продукта и roadmap развития" },
    { no: "4.3", question: "Ценообразование и форматы продажи" },
    { no: "4.4", question: "Каналы продаж: запуск→рост→масштаб" },
    { no: "4.5", question: "Система продвижения и KPI" }
  ]
};

// ---- Вспомогательные функции ----
function defaultInclude() {
  const inc = {};
  INCLUDE_KEYS.forEach((k) => (inc[k] = true));
  return inc;
}

function normalizeInclude(body) {
  const raw = body && typeof body.include === "object" && body.include !== null ? body.include : {};
  const inc = defaultInclude();
  Object.keys(inc).forEach((k) => {
    if (raw[k] === false) inc[k] = false;
    else if (raw[k] === true) inc[k] = true;
  });
  return inc;
}

function getEnabledSchemas(include) {
  const enabled = {};
  Object.entries(BLOCK_SCHEMAS).forEach(([blockKey, schema]) => {
    const filtered = schema.filter((item) => include[item.no] !== false);
    if (filtered.length) enabled[blockKey] = filtered;
  });
  return enabled;
}

function buildSystemPrompt(enabledSchemas, include) {
  // Собираем компактную инструкцию
  const blockList = [];
  Object.entries(enabledSchemas).forEach(([key, items]) => {
    items.forEach((item) => {
      blockList.push(`${key}.${item.no}: ${item.question}`);
    });
  });

  const sections = [];
  if (blockList.length) sections.push("Обязательные секции и вопросы:\n" + blockList.join("\n"));
  if (include.tech !== false) sections.push("tech");
  if (include.packaging !== false) sections.push("packaging");
  if (include.star !== false) sections.push("star");
  if (include.conclusion !== false) sections.push("conclusion");

  return [
    "Ты — стратег по когнитивно-сенсорному маркетингу. Работай строго по-русски.",
    "Возвращай ТОЛЬКО валидный JSON в структуре, указанной ниже. Ни текста вне JSON.",
    'Структура ответа: {"header":{...},"blocks":{"cognitive":[], "sensory":[], "branding":[], "marketing":[]}, "tech"?:..., "packaging"?:..., "star"?:..., "conclusion"?:...}',
    "Отвечай плотными, прикладными абзацами (2–5 предложений), указывай KPI и протоколы там, где уместно.",
    "Если данных недостаточно — добавляй аккуратные пометки [ПРЕДПОЛОЖЕНИЕ].",
    "Эталон плотности и структуры (сокращённая методика):",
    METHODOLOGY_REFERENCE,
    sections.length ? "Включи секции: " + sections.join(", ") : ""
  ].filter(Boolean).join("\n\n");
}

function buildUserMessage(input, include) {
  const parts = [];
  parts.push("Входные данные:");
  if (input.category) parts.push("Категория: " + input.category);
  if (input.name) parts.push("Название: " + input.name);
  if (input.audience) parts.push("Аудитория: " + (Array.isArray(input.audience) ? input.audience.join(", ") : input.audience));
  if (input.pain) parts.push("Боль: " + input.pain);
  if (input.uniqueness) parts.push("Уникальность: " + input.uniqueness);
  if (input.comment) parts.push("Комментарий: " + input.comment);
  parts.push("");
  parts.push("Требования:");
  parts.push("- Верни строго JSON по структуре.");
  parts.push("- Названия продуктов только на кириллице.");
  parts.push("- Помечай [ПРЕДПОЛОЖЕНИЕ] где данные не подтверждены.");
  parts.push("");
  parts.push("Параметр include: " + JSON.stringify(include));
  return parts.join("\n");
}

function extractFirstJson(text) {
  if (!text || typeof text !== "string") return null;
  const first = text.indexOf("{");
  if (first === -1) return null;
  // Пробуем найти парный закрывающий } методом балансировки
  let depth = 0;
  for (let i = first; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(first, i + 1);
        try {
          return JSON.parse(candidate);
        } catch (e) {
          // continue
        }
      }
    }
  }
  // Фолбек: регекс-матч
  const m = text.match(/(\{[\s\S]*\})/m);
  if (m) {
    try { return JSON.parse(m[1]); } catch(e) {}
  }
  return null;
}

async function callTextModel(messages, temperature) {
  const apiUrl = process.env.QWEN_API_URL || "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = process.env.QWEN_API_KEY;
  const model = (process.env.TEXT_MODEL_NAME || "").trim();
  if (!apiUrl || !apiKey || !model) {
    throw new Error("QWEN_API_URL / QWEN_API_KEY / TEXT_MODEL_NAME must be set");
  }

  const body = {
    model,
    messages,
    temperature: typeof temperature === "number" ? Math.max(0, Math.min(1, temperature)) : FIXED_TEMPERATURE,
    top_p: 0.95
  };

  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`LLM returned ${resp.status}: ${t.slice(0,400)}`);
  }

  const data = await resp.json();
  const raw = (data?.choices?.[0]?.message?.content) || JSON.stringify(data);
  const parsed = extractFirstJson(raw);
  if (!parsed) {
    const preview = (raw && String(raw).slice(0,2000)) || "";
    throw new Error("Cannot parse JSON from LLM response. Preview: " + preview);
  }
  return parsed;
}

function sanitizeText(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\r\n/g, "\n").trim();
}

function normalizeInput(body) {
  return {
    category: sanitizeText(body.category || body.header?.category),
    name: sanitizeText(body.name || body.header?.name),
    audience: Array.isArray(body.audience) ? body.audience : sanitizeText(body.audience || body.header?.audience),
    pain: sanitizeText(body.pain || body.header?.pain),
    uniqueness: sanitizeText(body.uniqueness || body.header?.uniqueness || body.header?.innovation),
    comment: sanitizeText(body.comment),
    temperature: typeof body.temperature === "number" ? body.temperature : FIXED_TEMPERATURE
  };
}

function normalizeDraft(rawDraft, input, include) {
  const inc = include || defaultInclude();
  const header = {
    category: inc["header.category"] !== false ? (rawDraft?.header?.category || rawDraft?.category || input.category || "") : "",
    name: inc["header.name"] !== false ? (rawDraft?.header?.name || rawDraft?.name || input.name || "") : "",
    audience: inc["header.audience"] !== false ? (rawDraft?.header?.audience || rawDraft?.audience || input.audience || "") : "",
    pain: inc["header.pain"] !== false ? (rawDraft?.header?.pain || rawDraft?.pain || input.pain || "") : "",
    uniqueness: inc["header.uniqueness"] !== false ? (rawDraft?.header?.uniqueness || rawDraft?.uniqueness || rawDraft?.innovation || input.uniqueness || "") : ""
  };

  const blocks = {};
  const enabled = getEnabledSchemas(inc);
  Object.entries(enabled).forEach(([key, schema]) => {
    const rawBlock = (rawDraft?.blocks && rawDraft.blocks[key]) || rawDraft[key] || [];
    blocks[key] = schema.map((item, idx) => {
      const ans = (rawBlock && rawBlock[idx] && rawBlock[idx].answer) || (rawBlock && rawBlock.find && rawBlock.find(r => String(r.no) === String(item.no))?.answer) || "";
      return { no: item.no, question: item.question, answer: sanitizeText(ans) };
    });
  });

  const out = { header, blocks };
  if (inc.tech !== false) out.tech = Array.isArray(rawDraft?.tech) ? rawDraft.tech.join("\n") : (rawDraft?.tech || "");
  if (inc.packaging !== false) out.packaging = rawDraft?.packaging || "";
  if (inc.star !== false) out.star = Array.isArray(rawDraft?.star) ? rawDraft.star.join("\n") : (rawDraft?.star || "");
  if (inc.conclusion !== false) out.conclusion = rawDraft?.conclusion || "";

  return out;
}

async function runGenerate(body) {
  const include = normalizeInclude(body);
  const input = normalizeInput(body);
  const enabledSchemas = getEnabledSchemas(include);

  if (process.env.NODE_ENV !== "production") {
    console.log("[generate] include:", include);
    console.log("[generate] input:", input);
  }

  const systemPrompt = buildSystemPrompt(enabledSchemas, include);
  const userMessage = buildUserMessage(input, include);

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ];

  const parsed = await callTextModel(messages, input.temperature);
  const normalized = normalizeDraft(parsed, input, include);
  return normalized;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
      req.on("error", reject);
    });
  } catch (e) {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  try {
    const draft = await runGenerate(body);
    res.status(200).json(draft);
  } catch (err) {
    console.error("[generate] ERROR:", err && err.message ? err.message : err);
    res.status(500).json({ error: err && err.message ? err.message : "Generation failed" });
  }
};