// lib/generatePassport.js
const fs = require("fs");
const path = require("path");
const fetch = global.fetch || require("cross-fetch");

// ======================================================
// CONFIG
// ======================================================
const REF_DIR = path.join(process.cwd(), "reference");
const STYLE_DIR = path.join(REF_DIR, "style_examples");

const MAX_REFERENCE_CHARS = 14000;
const PRODUCT_TEMPERATURE = 0.72;
const NAMING_TEMPERATURE = 0.78;
const PASSPORT_TEMPERATURE = 0.34;
const REWRITE_TEMPERATURE = 0.26;
const REQUEST_TIMEOUT_MS = 120000;

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
    { no: "1.1", question: "Какую потребительскую боль используем для создания дизрапта?" },
    { no: "1.2", question: "Изменение модели потребления: какой новый рынок открываем? Какую новую дополнительную монетизируемую ценность предлагаем?" },
    { no: "1.3", question: "Изменение технологии потребления: какие новые привычки и ритуалы потребления внедряем?" },
    { no: "1.4", question: "Нарративы: как объясняем, что инновация нужна, полезна, выгодна?" },
    { no: "1.5", question: "Какие способы, каналы и приёмы обучения потребителей используем?" }
  ],
  sensory: [
    { no: "2.1", question: "Сильный визуальный образ" },
    { no: "2.2", question: "Сильный аудиальный образ" },
    { no: "2.3", question: "Сильный обонятельный образ" },
    { no: "2.4", question: "Сильный осязательный образ" },
    { no: "2.5", question: "Сильный вкусовой образ" }
  ],
  branding: [
    { no: "3.1", question: "Сильная история и обещание бренда: как улучшаем личную историю и самоидентификацию потребителя?" },
    { no: "3.2", question: "Какой контекст поможет развить бренд? Какой помешает?" },
    { no: "3.3", question: "Сильное ядро бренда: название, логотип, слоган, уникальные дополнительные атрибуты" },
    { no: "3.4", question: "Уникальный путь клиента с продуктом и брендом" },
    { no: "3.5", question: "Стратегия развития бренда на 3–5–10 лет" }
  ],
  marketing: [
    { no: "4.1", question: "Сегментация / Позиционирование" },
    { no: "4.2", question: "Описание базового продукта и его развитие во времени" },
    { no: "4.3", question: "Развитие ценообразования" },
    { no: "4.4", question: "Развитие каналов сбыта" },
    { no: "4.5", question: "Продвижение (с фокусом на безбюджетный маркетинг)" }
  ]
};

const BAD_NAME_PATTERNS = [
  /^мега/i, /^супер/i, /^ультра/i, /^макси/i, /^мини/i, /^про/i, /^эко/i, /^био/i, /^фреш/i, /^фит/i,
  /го$/i, /про$/i, /плюс$/i, /макс$/i
];

const BANNED_GENERIC_PHRASES = [
  "решает реальную боль",
  "новый ритуал потребления",
  "современный дизайн",
  "инновационная упаковка",
  "умная упаковка",
  "контролируемая порция",
  "понятный ритуал",
  "удобный формат",
  "новый и удобный",
  "премиум сегмент",
  "федеральные сети",
  "занятые потребители",
  "можно сделать",
  "нужно сделать",
  "важно продумать",
  "данные отсутствуют",
  "tbd",
  "n/a",
  "quick_fix",
  "auto:"
];

const CONCRETE_BRAND_HINTS = [
  "Nike", "Apple", "Red Bull", "Quest Nutrition", "RXBAR", "Kind Bar",
  "KitKat", "Pringles", "Lush", "ВкусВилл", "IKEA", "Tinkoff",
  "Пятёрочка", "Перекрёсток", "Азбука Вкуса", "Магнит", "World Class"
];

// ======================================================
// FILE HELPERS
// ======================================================
function safeReadAny(...relativePaths) {
  for (const rel of relativePaths) {
    const full = path.join(REF_DIR, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return fs.readFileSync(full, "utf8");
    }
  }
  return "";
}

function truncateText(text, max = MAX_REFERENCE_CHARS) {
  const source = String(text || "").trim();
  if (!source) return "";
  if (source.length <= max) return source;
  return `${source.slice(0, max)}\n[reference trimmed]`;
}

function joinNonEmpty(parts, separator = "\n") {
  return parts.map(p => String(p || "").trim()).filter(Boolean).join(separator);
}

function loadStyleReferences(maxChars = 9000) {
  try {
    if (!fs.existsSync(STYLE_DIR) || !fs.statSync(STYLE_DIR).isDirectory()) return "";
    const files = fs.readdirSync(STYLE_DIR)
      .filter(name => name.endsWith(".txt") || name.endsWith(".md"))
      .sort();

    let acc = "";
    for (const file of files) {
      const content = fs.readFileSync(path.join(STYLE_DIR, file), "utf8").trim();
      if (!content) continue;
      const block = `--- ${file} ---\n${content}\n\n`;
      if (acc.length + block.length > maxChars) {
        const remain = maxChars - acc.length;
        acc += block.slice(0, Math.max(0, remain));
        acc += `\n[reference trimmed: ${file}]`;
        break;
      }
      acc += block;
    }
    return acc;
  } catch (e) {
    console.warn("[refs] style_examples load failed:", e?.message || e);
    return "";
  }
}

const PASSPORT_PROMPT_REFERENCE = truncateText(safeReadAny("passport_prompt.txt"), 7000);
const PASSPORT_SCHEMA_REFERENCE = truncateText(safeReadAny("passport_schema.json"), 3500);
const STYLE_EXAMPLES_REFERENCE = truncateText(loadStyleReferences(9000), 9000);

// для product kernel не суём всю schema целиком — только style_examples
const KERNEL_REFERENCE = joinNonEmpty([
  STYLE_EXAMPLES_REFERENCE ? `Style examples:\n${STYLE_EXAMPLES_REFERENCE}` : ""
]);

// для полного паспорта даём prompt + schema + style examples
const PASSPORT_REFERENCE = joinNonEmpty([
  PASSPORT_PROMPT_REFERENCE ? `Prompt reference:\n${PASSPORT_PROMPT_REFERENCE}` : "",
  PASSPORT_SCHEMA_REFERENCE ? `Schema reference:\n${PASSPORT_SCHEMA_REFERENCE}` : "",
  STYLE_EXAMPLES_REFERENCE ? `Style examples:\n${STYLE_EXAMPLES_REFERENCE}` : ""
]);

try {
  console.log("[refs] KERNEL_REFERENCE len:", KERNEL_REFERENCE.length);
  console.log("[refs] PASSPORT_REFERENCE len:", PASSPORT_REFERENCE.length);
} catch (_) {}

// ======================================================
// TEXT / JSON HELPERS
// ======================================================
function sanitizeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    return value
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \u00A0]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(sanitizeText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return sanitizeText(
      value.answer ??
      value.value ??
      value.text ??
      value.content ??
      value.description ??
      value.response ??
      ""
    );
  }
  return "";
}

function cleanupAnswer(text) {
  return sanitizeText(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\.{2,}/g, ".")
    .trim();
}

function pickNonEmpty(...values) {
  for (const v of values) {
    const s = sanitizeText(v);
    if (s) return s;
  }
  return "";
}

function uniqueList(values) {
  const seen = new Set();
  const res = [];
  for (const it of values || []) {
    const t = sanitizeText(it);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    res.push(t);
  }
  return res;
}

function normalizeList(value, fallback = []) {
  const result = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      const cleaned = sanitizeText(item);
      if (cleaned) result.push(cleaned);
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const cleaned = sanitizeText(item);
      if (cleaned) result.push(cleaned);
    }
  } else {
    const cleaned = sanitizeText(value);
    if (cleaned) {
      cleaned
        .split(/\n+/)
        .map(p => p.replace(/^[\-•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
        .filter(Boolean)
        .forEach(p => result.push(p));
    }
  }
  return uniqueList(result.length ? result : fallback);
}

function safeParseJson(text) {
  try { return JSON.parse(String(text)); } catch (_) { return null; }
}

function extractFirstJson(content) {
  if (!content) return null;
  if (Array.isArray(content)) {
    const joined = content.map(p => (typeof p === "string" ? p : p?.text || "")).join("\n");
    return extractFirstJson(joined);
  }
  const text = String(content || "").replace(/```json|```/gi, "").trim();
  if (!text) return null;

  const direct = safeParseJson(text);
  if (direct) return direct;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return safeParseJson(text.slice(start, end + 1));
  }
  return null;
}

function wordCount(text) {
  const s = sanitizeText(text);
  return s ? s.split(/\s+/).length : 0;
}

function containsLatin(text) {
  return /[A-Za-z]/.test(String(text || ""));
}

function hasBannedGeneric(text) {
  const s = sanitizeText(text).toLowerCase();
  return BANNED_GENERIC_PHRASES.some(p => s.includes(p.toLowerCase()));
}

function looksLikeTrashName(name) {
  const s = sanitizeText(name);
  if (!s) return true;
  if (containsLatin(s)) return true;
  if (s.length < 3 || s.length > 30) return true;
  if (BAD_NAME_PATTERNS.some(re => re.test(s))) return true;
  return false;
}

function hasConcreteMarkers(text) {
  const s = sanitizeText(text);
  if (!s) return false;
  const hasDigits = /\d/.test(s);
  const hasQuotes = /«|»|"/.test(s);
  const hasBrandHints = CONCRETE_BRAND_HINTS.some(b => s.includes(b));
  const hasArrowOrCommercialMarkers = /→|≥|₽|ккал|г\b|шт\b|дн\b|N=\d+/i.test(s);
  return hasDigits || hasQuotes || hasBrandHints || hasArrowOrCommercialMarkers;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ======================================================
// INCLUDE HELPERS
// ======================================================
function defaultInclude() {
  const include = {};
  INCLUDE_KEYS.forEach(k => { include[k] = true; });
  return include;
}

function normalizeInclude(body) {
  const raw = body && typeof body.include === "object" && body.include !== null ? body.include : {};
  const include = defaultInclude();
  INCLUDE_KEYS.forEach(key => {
    if (raw[key] === false) include[key] = false;
    if (raw[key] === true) include[key] = true;
  });
  return include;
}

function getEnabledSchemas(include) {
  const enabled = {};
  Object.entries(BLOCK_SCHEMAS).forEach(([blockKey, schema]) => {
    const filtered = schema.filter(item => include[item.no] !== false);
    if (filtered.length) enabled[blockKey] = filtered;
  });
  return enabled;
}

// ======================================================
// API
// ======================================================
function resolveApiUrl() {
  if (process.env.QWEN_API_URL) return process.env.QWEN_API_URL;
  if (process.env.OPENAI_API_URL) return process.env.OPENAI_API_URL;
  if (process.env.OPENAI_BASE_URL) return `${process.env.OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  return "";
}

function resolveApiKey() {
  return process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY || "";
}

function resolveModelName() {
  return process.env.TEXT_MODEL_NAME || process.env.OPENAI_MODEL || process.env.MODEL_NAME || "";
}

async function callTextModel(messages, temperature) {
  const apiUrl = resolveApiUrl();
  const apiKey = resolveApiKey();
  const modelName = resolveModelName();

  if (!apiUrl || !apiKey || !modelName) {
    console.error("[generate] Missing API env vars");
    return null;
  }

  try {
    const sys = (messages.find(m => m.role === "system") || {}).content || "";
    const usr = (messages.find(m => m.role === "user") || {}).content || "";
    console.log("[prompt] SYSTEM:", String(sys).slice(0, 350));
    console.log("[prompt] USER:", String(usr).slice(0, 350));
  } catch (_) {}

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://qwen-landing-qqft.vercel.app",
        "X-Title": "Polar Star Generator"
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature,
        top_p: 0.92,
        seed: Math.floor(Math.random() * 1000000)
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const rawText = await response.text().catch(() => "");

    if (!response.ok) {
      console.error("[generate] model error", response.status, rawText);
      return null;
    }

    try { console.log("[generate] raw head:", rawText.slice(0, 1800)); } catch (_) {}

    const parsed = safeParseJson(rawText);
    const content = parsed?.choices?.[0]?.message?.content ?? parsed?.choices?.[0]?.text ?? rawText;
    return extractFirstJson(content) || extractFirstJson(rawText);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error("[generate] Request timeout >", REQUEST_TIMEOUT_MS, "ms");
    } else {
      console.error("[generate] request failed", error);
    }
    return null;
  }
}

// ======================================================
// INPUT
// ======================================================
function compressAudience(input) {
  const rawAudience = [];
  if (Array.isArray(input.audienceList)) rawAudience.push(...input.audienceList);
  if (sanitizeText(input.audience)) rawAudience.push(...sanitizeText(input.audience).split(/[,;]+/));
  const joined = rawAudience.join(" ").toLowerCase();
  const segments = [];

  if (/(семь|родител|дет|дом|школ)/.test(joined)) {
    segments.push("родители 25–40 лет и дети 3–12 лет, для которых важны удобство, вкус и ощущение правильного питания");
  }
  if (/(офис|работ|дорог|перекус|машин|метро|с собой)/.test(joined)) {
    segments.push("занятые взрослые 25–45 лет, которым нужен быстрый, чистый и понятный формат потребления");
  }
  if (/(спорт|фитнес|зал|белок)/.test(joined)) {
    segments.push("активные люди 18–40 лет, которым важны функциональная польза, белок и удобство после нагрузки");
  }
  if (/(60\+|пожил|мягк|жеван|глот)/.test(joined)) {
    segments.push("пожилые потребители, которым важны мягкость, простота употребления и понятная польза");
  }
  if (!segments.length) {
    const comment = `${sanitizeText(input.comment)} ${sanitizeText(input.pain)}`.toLowerCase();
    if (/(семь|дет|дом)/.test(comment)) {
      segments.push("семьи с детьми, которым нужен удобный, вкусный и понятный ежедневный продукт");
    } else {
      segments.push("потребители с конкретной неудовлетворённой бытовой болью внутри категории");
    }
  }
  return uniqueList(segments).join("; ");
}

function normalizeInput(body) {
  const source = body && typeof body.form === "object" && body.form !== null ? body.form : body || {};
  const category = sanitizeText(source.category);
  const audienceList = Array.isArray(source.audience)
    ? source.audience.map(i => sanitizeText(i)).filter(Boolean)
    : sanitizeText(source.audience)
      ? sanitizeText(source.audience).split(/[,;]+/).map(i => i.trim()).filter(Boolean)
      : [];
  const painsArray = Array.isArray(source.pains) ? source.pains.map(i => sanitizeText(i)).filter(Boolean) : [];

  const input = {
    category: pickNonEmpty(category, "Новый продукт"),
    audience: sanitizeText(source.audience),
    audienceList,
    pain: pickNonEmpty(source.pain, painsArray[0]),
    comment: sanitizeText(source.comment),
    innovation: pickNonEmpty(source.innovation, source.uniqueness),
    name: sanitizeText(source.name || source.productName),
    diagnostics: source.diagnostics && typeof source.diagnostics === "object" ? source.diagnostics : {}
  };

  input.audienceSummary = compressAudience(input);
  return input;
}

// ======================================================
// PROMPTS
// ======================================================
function buildProductKernelSystemPrompt() {
  return joinNonEmpty([
    "Ты — сильный product inventor, category designer и FMCG innovation strategist.",
    "Твоя задача: придумать действительно НОВЫЙ продукт, а не слабую вариацию существующего SKU.",
    "Новый продукт = новый ритуал, новый сценарий, новый поведенческий смысл, новая монетизируемая ценность, новая продуктовая механика.",
    "Плохие решения: 'умная упаковка', 'контролируемая порция', 'современный дизайн', 'новый ритуал' без конкретики.",
    "",
    "ОБЯЗАТЕЛЬНО:",
    "- Пиши по-русски.",
    "- Никакой латиницы в названии.",
    "- Никаких шаблонов 'мега', 'супер', 'про'.",
    "- Никаких общих фраз.",
    "- Если даёшь цифры без точного подтверждения, помечай [ПРЕДПОЛОЖЕНИЕ].",
    "",
    "Верни строго JSON:",
    JSON.stringify({
      invented_category: "string",
      product_thesis: "string",
      why_new: "string",
      new_market: "string",
      consumer_tension: "string",
      what_existing_solutions_fail_at: ["string", "string", "string"],
      breakthrough_mechanism: "string",
      product_format: "string",
      portion_logic: "string",
      physical_form: "string",
      composition_logic: "string",
      usage_scenarios: ["string", "string", "string"],
      new_rituals: ["string", "string", "string"],
      monetizable_value: ["string", "string", "string"],
      why_people_will_pay: "string",
      sensory_hooks: {
        visual: "string",
        audio: "string",
        smell: "string",
        tactile: "string",
        taste: "string"
      },
      rough_numbers: {
        portion_g: "number_or_string",
        protein_g: "number_or_string",
        calories_kcal: "number_or_string",
        price_rub: "string",
        shelf_life_days: "number_or_string"
      }
    }, null, 2),
    "",
    "Критерий хорошего ответа: после чтения должно быть ощущение, что это реально новый продукт, а не просто другая упаковка старой категории.",
    KERNEL_REFERENCE
  ]);
}

function buildProductKernelUserPrompt(input) {
  return joinNonEmpty([
    `Категория/направление: ${input.category}`,
    `ЦА: ${input.audienceSummary || input.audience || "-"}`,
    `Боль: ${input.pain || "-"}`,
    `Комментарий: ${input.comment || "-"}`,
    `Пожелание по инновации: ${input.innovation || "-"}`,
    input.name ? `Пожелание по названию: ${input.name}` : "Название пока не фиксируй",
    "",
    "Придумай новый продукт уровня сильного кейса, а не просто подкатегорию с банальной упаковкой.",
    "Верни только JSON."
  ]);
}

function buildNamingSystemPrompt() {
  return joinNonEmpty([
    "Ты — сильный неймер FMCG-брендов на русском языке.",
    "Придумай названия, которые звучат как реальный бренд/подкатегория, а не как машинный шаблон.",
    "Запрещено: Мега, Супер, Ультра, Про, Макси, Мини, Эко, Био, Фреш, Фит в начале названия.",
    "Запрещено: латиница, тупые рифмы, детский лепет, случайные приставки.",
    "Нужно: 6 вариантов на кириллице, 1–3 слова максимум, легко читаются, можно поставить на упаковку.",
    "Для каждого названия коротко объясни логику и эмоциональный эффект.",
    "Верни строго JSON:",
    JSON.stringify({
      options: [
        { name: "string", logic: "string", emotional_effect: "string" }
      ]
    }, null, 2)
  ]);
}

function buildNamingUserPrompt(kernel) {
  return joinNonEmpty([
    `Категория: ${sanitizeText(kernel.invented_category)}`,
    `Тезис продукта: ${sanitizeText(kernel.product_thesis)}`,
    `Почему новый: ${sanitizeText(kernel.why_new)}`,
    `Новый рынок: ${sanitizeText(kernel.new_market)}`,
    `Формат: ${sanitizeText(kernel.product_format)}`,
    `Ритуалы: ${normalizeList(kernel.new_rituals).join("; ")}`,
    "",
    "Дай хорошие русские названия. Без шаблонной ерунды. Верни только JSON."
  ]);
}

function buildPassportSystemPrompt() {
  return joinNonEmpty([
    "Ты — сильный бренд-стратег, продуктовый маркетолог, category designer и R&D-концептолог.",
    "На основе уже придуманного нового продукта создай ПОЛНЫЙ когнитивно-сенсорный паспорт.",
    "Нужен не буллет-лист и не слабая заготовка, а сильный, предметный, коммерчески осмысленный документ.",
    "",
    "ОБЯЗАТЕЛЬНО:",
    "1) Не скатывайся в общие фразы.",
    "2) Каждый блок должен объяснять: что это / почему это работает / как проявляется в реальности / как это проверить.",
    "3) Используй конкретные цифры, цены, каналы, KPI, типы дистрибуции, если уместно.",
    "4) Пиши только по-русски.",
    "5) Все предположения помечай [ПРЕДПОЛОЖЕНИЕ].",
    "6) Верни строго JSON, соответствующий schema reference.",
    PASSPORT_REFERENCE
  ]);
}

function buildPassportUserPrompt(input, kernel, chosenName) {
  return joinNonEmpty([
    "Собери полный паспорт продукта по schema reference.",
    JSON.stringify({
      kernel,
      chosen_name: chosenName,
      user_input: {
        category: input.category,
        audience: input.audienceSummary || input.audience,
        pain: input.pain,
        comment: input.comment,
        innovation: input.innovation
      }
    }, null, 2)
  ]);
}

function buildRewriteSystemPrompt() {
  return joinNonEmpty([
    "Ты — редактор стратегических продуктовых документов.",
    "Твоя задача: переписать слабые, шаблонные или короткие фрагменты так, чтобы они стали конкретными, живыми и полезными.",
    "Нельзя оставлять мусор вроде 'современный дизайн' без расшифровки.",
    "Верни строго JSON."
  ]);
}

// ======================================================
// VALIDATION HELPERS
// ======================================================
function validateKernel(kernel) {
  if (!kernel || typeof kernel !== "object") return { ok: false, missing: ["object"] };

  const missing = [];
  const requiredText = [
    "invented_category",
    "product_thesis",
    "why_new",
    "new_market",
    "consumer_tension",
    "breakthrough_mechanism",
    "product_format",
    "physical_form",
    "composition_logic",
    "why_people_will_pay"
  ];

  for (const key of requiredText) {
    if (wordCount(kernel[key]) < 12) missing.push(key);
  }

  const scenarios = normalizeList(kernel.usage_scenarios);
  if (scenarios.length < 3) missing.push("usage_scenarios");

  const rituals = normalizeList(kernel.new_rituals);
  if (rituals.length < 3) missing.push("new_rituals");

  const monetizable = normalizeList(kernel.monetizable_value);
  if (monetizable.length < 3) missing.push("monetizable_value");

  if (!kernel.sensory_hooks || typeof kernel.sensory_hooks !== "object") {
    missing.push("sensory_hooks");
  } else {
    ["visual", "audio", "smell", "tactile", "taste"].forEach(k => {
      if (wordCount(kernel.sensory_hooks[k]) < 6) missing.push(`sensory_hooks.${k}`);
    });
  }

  if (!hasConcreteMarkers(JSON.stringify(kernel))) {
    missing.push("concrete_markers");
  }

  return { ok: missing.length === 0, missing };
}

function validateNaming(name) {
  if (!name || typeof name !== "string") return false;
  if (looksLikeTrashName(name)) return false;
  if (wordCount(name) > 3) return false;
  return true;
}

function validatePassportV2(passport) {
  if (!passport || typeof passport !== "object") return { ok: false, missing: ["object"] };

  const missing = [];
  const short = passport.short_passport || {};
  if (wordCount(short.category) < 2) missing.push("short_passport.category");
  if (wordCount(short.name) < 1) missing.push("short_passport.name");
  if (wordCount(short.pain) < 8) missing.push("short_passport.pain");
  if (!passport.cognitive_block) missing.push("cognitive_block");
  if (!passport.sensory_block) missing.push("sensory_block");
  if (!passport.branding) missing.push("branding");
  if (!passport.marketing) missing.push("marketing");
  if (!passport.production) missing.push("production");
  if (!passport.commerce) missing.push("commerce");
  if (!passport.validation_plan || !Array.isArray(passport.validation_plan) || passport.validation_plan.length < 4) {
    missing.push("validation_plan");
  }

  return { ok: missing.length === 0, missing };
}

function isWeakText(text, minWords = 35) {
  const wc = wordCount(text);
  if (wc < minWords) return true;
  if (hasBannedGeneric(text) && wc < minWords + 15) return true;
  return false;
}

// ======================================================
// FALLBACKS
// ======================================================
function hardFallbackKernel(input) {
  return {
    invented_category: `${input.category} с новым сценарием потребления`,
    product_thesis: `[ПРЕДПОЛОЖЕНИЕ] Продукт переопределяет категорию через новый ритуал, новую текстурную и форматную логику и дополнительную эмоциональную ценность.`,
    why_new: `[ПРЕДПОЛОЖЕНИЕ] В текущей категории решения либо неудобны, либо не создают нового повседневного сценария, либо не дают новой ценности поверх базовой функции.`,
    new_market: `[ПРЕДПОЛОЖЕНИЕ] Подкатегория вокруг конкретной неудовлетворённой бытовой боли.`,
    consumer_tension: input.pain || "[ПРЕДПОЛОЖЕНИЕ] Пользователь хочет важную функциональную пользу без существующих компромиссов категории.",
    what_existing_solutions_fail_at: [
      "[ПРЕДПОЛОЖЕНИЕ] Дают базовую функцию, но не новый сценарий.",
      "[ПРЕДПОЛОЖЕНИЕ] Неудобны в реальной жизни.",
      "[ПРЕДПОЛОЖЕНИЕ] Не создают дополнительной монетизируемой ценности."
    ],
    breakthrough_mechanism: `[ПРЕДПОЛОЖЕНИЕ] Новый формат соединяет продукт, сценарий и ритуал в одну предметную механику.`,
    product_format: `[ПРЕДПОЛОЖЕНИЕ] Индивидуальная порция в формате, удобном для нового сценария.`,
    portion_logic: `[ПРЕДПОЛОЖЕНИЕ] Порция подстроена под конкретный контекст употребления.`,
    physical_form: `[ПРЕДПОЛОЖЕНИЕ] Продукт имеет отдельную физическую форму, отличающую его от стандартных SKU категории.`,
    composition_logic: `[ПРЕДПОЛОЖЕНИЕ] Состав собран так, чтобы поддерживать ритуал и обещание бренда.`,
    usage_scenarios: [
      "[ПРЕДПОЛОЖЕНИЕ] Утреннее использование в быстром режиме без лишней подготовки.",
      "[ПРЕДПОЛОЖЕНИЕ] Сценарий использования в дороге или вне кухни.",
      "[ПРЕДПОЛОЖЕНИЕ] Социальный сценарий демонстративного или совместного потребления."
    ],
    new_rituals: [
      "[ПРЕДПОЛОЖЕНИЕ] Новый короткий повседневный ритуал утром.",
      "[ПРЕДПОЛОЖЕНИЕ] Ритуал использования вне дома.",
      "[ПРЕДПОЛОЖЕНИЕ] Ритуал, который хочется повторять и показывать."
    ],
    monetizable_value: [
      "[ПРЕДПОЛОЖЕНИЕ] Экономия времени без потери ощущения качества.",
      "[ПРЕДПОЛОЖЕНИЕ] Самоидентификация через более умный выбор.",
      "[ПРЕДПОЛОЖЕНИЕ] Новый удобный ритуал, за который готовы платить."
    ],
    why_people_will_pay: `[ПРЕДПОЛОЖЕНИЕ] Люди платят не только за продукт, но и за новый удобный сценарий плюс эмоциональную уверенность в своём выборе.`,
    sensory_hooks: {
      visual: "[ПРЕДПОЛОЖЕНИЕ] Визуальный код сразу объясняет новый формат и выгоду.",
      audio: "[ПРЕДПОЛОЖЕНИЕ] Звук открытия или употребления становится маркером ритуала.",
      smell: "[ПРЕДПОЛОЖЕНИЕ] Аромат поддерживает ощущение натуральности и контроля.",
      tactile: "[ПРЕДПОЛОЖЕНИЕ] Осязание подтверждает удобство и чистоту использования.",
      taste: "[ПРЕДПОЛОЖЕНИЕ] Вкус делает повторное потребление естественным."
    },
    rough_numbers: {
      portion_g: "[ПРЕДПОЛОЖЕНИЕ] 35–60",
      protein_g: "[ПРЕДПОЛОЖЕНИЕ] 10–18",
      calories_kcal: "[ПРЕДПОЛОЖЕНИЕ] 120–220",
      price_rub: "[ПРЕДПОЛОЖЕНИЕ] 119–199 ₽",
      shelf_life_days: "[ПРЕДПОЛОЖЕНИЕ] 90–180"
    }
  };
}

function fallbackPassportV2(input, kernel, chosenName) {
  const product = {
    short_passport: {
      category: kernel.invented_category || input.category,
      name: chosenName,
      name_variants: [
        { name: chosenName, logic: "[ПРЕДПОЛОЖЕНИЕ] Основное имя отражает новый ритуал и понятную ценность." },
        { name: "Сила роста", logic: "[ПРЕДПОЛОЖЕНИЕ] Имя про функциональную пользу и развитие." },
        { name: "Чистый кус", logic: "[ПРЕДПОЛОЖЕНИЕ] Имя подчёркивает предметность и натуральность." }
      ],
      audience: input.audienceSummary || input.audience || "[ПРЕДПОЛОЖЕНИЕ]",
      pain: kernel.consumer_tension || input.pain || "[ПРЕДПОЛОЖЕНИЕ]",
      uniqueness: kernel.product_thesis || "[ПРЕДПОЛОЖЕНИЕ]",
      key_idea: kernel.why_new || "[ПРЕДПОЛОЖЕНИЕ]",
      one_liner: kernel.product_thesis || "[ПРЕДПОЛОЖЕНИЕ]",
      portion_g: kernel?.rough_numbers?.portion_g || "[ПРЕДПОЛОЖЕНИЕ]",
      protein_per_portion_g: kernel?.rough_numbers?.protein_g || "[ПРЕДПОЛОЖЕНИЕ]",
      calories_per_portion_kcal: kernel?.rough_numbers?.calories_kcal || "[ПРЕДПОЛОЖЕНИЕ]",
      rrc_rub: kernel?.rough_numbers?.price_rub || "[ПРЕДПОЛОЖЕНИЕ]",
      source_evidence_assumptions: "[ПРЕДПОЛОЖЕНИЕ] Черновой fallback, требует повторной генерации и верификации."
    },
    cognitive_block: {
      pain_disruption: {
        core_problem: kernel.consumer_tension || "[ПРЕДПОЛОЖЕНИЕ]",
        why_existing_solutions_fail: normalizeList(kernel.what_existing_solutions_fail_at).join(" "),
        why_this_pain_can_create_a_new_category: kernel.new_market || "[ПРЕДПОЛОЖЕНИЕ]"
      },
      consumption_change: {
        new_market: kernel.new_market || "[ПРЕДПОЛОЖЕНИЕ]",
        what_replaces: normalizeList(kernel.what_existing_solutions_fail_at, ["[ПРЕДПОЛОЖЕНИЕ]"]),
        new_monetizable_value: normalizeList(kernel.monetizable_value, ["[ПРЕДПОЛОЖЕНИЕ]"]),
        why_people_will_pay: kernel.why_people_will_pay || "[ПРЕДПОЛОЖЕНИЕ]"
      },
      rituals: {
        behavior_change: "[ПРЕДПОЛОЖЕНИЕ] Новый продукт меняет поведение за счёт более короткого, удобного и эмоционально понятного сценария.",
        old_vs_new_rituals: [
          { old_ritual: "[ПРЕДПОЛОЖЕНИЕ] Старый неудобный способ", new_ritual: normalizeList(kernel.new_rituals)[0] || "[ПРЕДПОЛОЖЕНИЕ]" },
          { old_ritual: "[ПРЕДПОЛОЖЕНИЕ] Старый бытовой компромисс", new_ritual: normalizeList(kernel.new_rituals)[1] || "[ПРЕДПОЛОЖЕНИЕ]" },
          { old_ritual: "[ПРЕДПОЛОЖЕНИЕ] Старое скучное потребление", new_ritual: normalizeList(kernel.new_rituals)[2] || "[ПРЕДПОЛОЖЕНИЕ]" }
        ],
        new_rituals: normalizeList(kernel.new_rituals, ["[ПРЕДПОЛОЖЕНИЕ]"]),
        usage_contexts: normalizeList(kernel.usage_scenarios, ["[ПРЕДПОЛОЖЕНИЕ]"])
      },
      narratives: {
        headlines: [
          "[ПРЕДПОЛОЖЕНИЕ] Когда вы выбираете этот продукт, вы получаете новый сценарий без старых компромиссов.",
          "[ПРЕДПОЛОЖЕНИЕ] Когда продукт встраивается в день, бытовая боль становится простой привычкой.",
          "[ПРЕДПОЛОЖЕНИЕ] Когда формат понятен, повторная покупка становится естественной."
        ],
        landing_copy: [
          "[ПРЕДПОЛОЖЕНИЕ] Продукт не просто закрывает базовую функцию категории, а создаёт новый ритуал, за который потребитель готов платить.",
          "[ПРЕДПОЛОЖЕНИЕ] Здесь соединяются предметная польза, сценарное удобство и эмоциональная уверенность в выборе."
        ],
        brand_story: "[ПРЕДПОЛОЖЕНИЕ] Бренд вводит новый продукт в жизнь человека как более умный и более естественный способ решать ежедневную задачу."
      },
      desired_model: {
        thoughts: [
          "[ПРЕДПОЛОЖЕНИЕ] Я выбираю более продуманное решение.",
          "[ПРЕДПОЛОЖЕНИЕ] Это не компромисс, а улучшение привычки.",
          "[ПРЕДПОЛОЖЕНИЕ] Я понимаю, за что плачу."
        ],
        feelings: [
          "[ПРЕДПОЛОЖЕНИЕ] Спокойствие.",
          "[ПРЕДПОЛОЖЕНИЕ] Уверенность.",
          "[ПРЕДПОЛОЖЕНИЕ] Контроль."
        ],
        behaviors: [
          "[ПРЕДПОЛОЖЕНИЕ] Повторная покупка.",
          "[ПРЕДПОЛОЖЕНИЕ] Встраивание в повседневный ритуал.",
          "[ПРЕДПОЛОЖЕНИЕ] Рекомендация другим."
        ]
      },
      education: {
        channels: ["[ПРЕДПОЛОЖЕНИЕ] Упаковка", "[ПРЕДПОЛОЖЕНИЕ] Короткие видео", "[ПРЕДПОЛОЖЕНИЕ] Сэмплинг"],
        mechanics: ["[ПРЕДПОЛОЖЕНИЕ] QR-инструкция", "[ПРЕДПОЛОЖЕНИЕ] Демонстрация сценария", "[ПРЕДПОЛОЖЕНИЕ] Контент о пользе"],
        low_budget_options: ["[ПРЕДПОЛОЖЕНИЕ] UGC", "[ПРЕДПОЛОЖЕНИЕ] Микроамбассадоры"],
        scalable_options: ["[ПРЕДПОЛОЖЕНИЕ] Видео-платформы", "[ПРЕДПОЛОЖЕНИЕ] Ритейл-мерчандайзинг"],
        kpi: ["[ПРЕДПОЛОЖЕНИЕ] QR scans", "[ПРЕДПОЛОЖЕНИЕ] CTR", "[ПРЕДПОЛОЖЕНИЕ] Sample→purchase conversion"]
      },
      source_evidence_assumptions: "[ПРЕДПОЛОЖЕНИЕ]"
    },
    sensory_block: {
      visual: {
        desired_experience: kernel?.sensory_hooks?.visual || "[ПРЕДПОЛОЖЕНИЕ]",
        memory_marker: "[ПРЕДПОЛОЖЕНИЕ] Узнаваемый визуальный код.",
        brand_role: "[ПРЕДПОЛОЖЕНИЕ] Подтверждает новую подкатегорию.",
        measurable_goal: "[ПРЕДПОЛОЖЕНИЕ] premium look ≥ 7/9",
        protocol_test: "[ПРЕДПОЛОЖЕНИЕ] Shelf mockup test, N=30",
        analysis_method: "[ПРЕДПОЛОЖЕНИЕ] Mean score + verbatims",
        acceptance_criteria: "[ПРЕДПОЛОЖЕНИЕ] ≥7/9",
        recommendations: ["[ПРЕДПОЛОЖЕНИЕ] Чёткий цветовой код", "[ПРЕДПОЛОЖЕНИЕ] Выразимая лицевая сторона"]
      },
      audio: {
        desired_experience: kernel?.sensory_hooks?.audio || "[ПРЕДПОЛОЖЕНИЕ]",
        memory_marker: "[ПРЕДПОЛОЖЕНИЕ] Звук открытия/употребления.",
        brand_role: "[ПРЕДПОЛОЖЕНИЕ] Делает ритуал узнаваемым.",
        measurable_goal: "[ПРЕДПОЛОЖЕНИЕ] satisfaction ≥ 7/9",
        protocol_test: "[ПРЕДПОЛОЖЕНИЕ] In-use sound test",
        analysis_method: "[ПРЕДПОЛОЖЕНИЕ] Ratings",
        acceptance_criteria: "[ПРЕДПОЛОЖЕНИЕ] ≥7/9",
        recommendations: ["[ПРЕДПОЛОЖЕНИЕ] Конструкция с контролируемым щелчком", "[ПРЕДПОЛОЖЕНИЕ] Снижение паразитного шума"]
      },
      smell: {
        desired_experience: kernel?.sensory_hooks?.smell || "[ПРЕДПОЛОЖЕНИЕ]",
        memory_marker: "[ПРЕДПОЛОЖЕНИЕ] Чистый шлейф без тяжести.",
        brand_role: "[ПРЕДПОЛОЖЕНИЕ] Поддерживает доверие и натуральность.",
        measurable_goal: "[ПРЕДПОЛОЖЕНИЕ] неприятный запах ≤ 2/9",
        protocol_test: "[ПРЕДПОЛОЖЕНИЕ] Blind smell panel, N=30",
        analysis_method: "[ПРЕДПОЛОЖЕНИЕ] Mean score",
        acceptance_criteria: "[ПРЕДПОЛОЖЕНИЕ] ≤2/9",
        recommendations: ["[ПРЕДПОЛОЖЕНИЕ] Контроль летучих соединений", "[ПРЕДПОЛОЖЕНИЕ] Барьерная упаковка"]
      },
      tactile: {
        desired_experience: kernel?.sensory_hooks?.tactile || "[ПРЕДПОЛОЖЕНИЕ]",
        memory_marker: "[ПРЕДПОЛОЖЕНИЕ] Чистое и приятное ощущение.",
        brand_role: "[ПРЕДПОЛОЖЕНИЕ] Подтверждает удобство сценария.",
        measurable_goal: "[ПРЕДПОЛОЖЕНИЕ] no-mess < 0.05g residue",
        protocol_test: "[ПРЕДПОЛОЖЕНИЕ] Contact test",
        analysis_method: "[ПРЕДПОЛОЖЕНИЕ] Residue measurement",
        acceptance_criteria: "[ПРЕДПОЛОЖЕНИЕ] PASS if below threshold",
        recommendations: ["[ПРЕДПОЛОЖЕНИЕ] Soft-touch", "[ПРЕДПОЛОЖЕНИЕ] Контроль липкости/скольжения"]
      },
      taste: {
        desired_experience: kernel?.sensory_hooks?.taste || "[ПРЕДПОЛОЖЕНИЕ]",
        memory_marker: "[ПРЕДПОЛОЖЕНИЕ] Вкус, который хочется повторять.",
        brand_role: "[ПРЕДПОЛОЖЕНИЕ] Делает ритуал устойчивым.",
        measurable_goal: "[ПРЕДПОЛОЖЕНИЕ] overall taste ≥ 7/9",
        protocol_test: "[ПРЕДПОЛОЖЕНИЕ] Blind taste test, N=50",
        analysis_method: "[ПРЕДПОЛОЖЕНИЕ] Mean + profile",
        acceptance_criteria: "[ПРЕДПОЛОЖЕНИЕ] ≥7/9",
        recommendations: ["[ПРЕДПОЛОЖЕНИЕ] Баланс вкуса", "[ПРЕДПОЛОЖЕНИЕ] Контроль послевкусия"]
      },
      source_evidence_assumptions: "[ПРЕДПОЛОЖЕНИЕ]"
    },
    branding: {
      story: "[ПРЕДПОЛОЖЕНИЕ] История строится вокруг нового, более умного способа решать повседневную задачу.",
      promise: "[ПРЕДПОЛОЖЕНИЕ] Бренд обещает продукт без старых компромиссов категории.",
      identity_effect: "[ПРЕДПОЛОЖЕНИЕ] Покупатель чувствует себя человеком, который выбирает более продуманное решение.",
      context: {
        favorable: ["[ПРЕДПОЛОЖЕНИЕ] Рост интереса к удобству", "[ПРЕДПОЛОЖЕНИЕ] Рост запросов на понятную пользу", "[ПРЕДПОЛОЖЕНИЕ] Запрос на новые ритуалы"],
        unfavorable: ["[ПРЕДПОЛОЖЕНИЕ] Скепсис к новой подкатегории", "[ПРЕДПОЛОЖЕНИЕ] Ценовая чувствительность", "[ПРЕДПОЛОЖЕНИЕ] Сила старых привычек"]
      },
      brand_core: {
        name_logic: "[ПРЕДПОЛОЖЕНИЕ] Имя должно описывать новый сценарий или новую пользу.",
        logo_idea: "[ПРЕДПОЛОЖЕНИЕ] Логотип должен быть простым, читаемым и быстро узнаваемым.",
        slogan: "[ПРЕДПОЛОЖЕНИЕ] Новый ритуал без компромиссов.",
        distinctive_assets: ["[ПРЕДПОЛОЖЕНИЕ] Цветовой код", "[ПРЕДПОЛОЖЕНИЕ] Форма упаковки", "[ПРЕДПОЛОЖЕНИЕ] Повторяемая формула пользы"]
      },
      customer_journey: [
        { stage: "awareness", customer_feeling: "[ПРЕДПОЛОЖЕНИЕ] Интерес", next_trigger: "[ПРЕДПОЛОЖЕНИЕ] Необычный формат/обещание" },
        { stage: "interest", customer_feeling: "[ПРЕДПОЛОЖЕНИЕ] Любопытство", next_trigger: "[ПРЕДПОЛОЖЕНИЕ] Понятная польза" },
        { stage: "trial", customer_feeling: "[ПРЕДПОЛОЖЕНИЕ] Проверка", next_trigger: "[ПРЕДПОЛОЖЕНИЕ] Успешный опыт" },
        { stage: "repeat", customer_feeling: "[ПРЕДПОЛОЖЕНИЕ] Уверенность", next_trigger: "[ПРЕДПОЛОЖЕНИЕ] Встраивание в ритуал" },
        { stage: "loyalty", customer_feeling: "[ПРЕДПОЛОЖЕНИЕ] Привязанность", next_trigger: "[ПРЕДПОЛОЖЕНИЕ] Линейка и привычка" },
        { stage: "advocacy", customer_feeling: "[ПРЕДПОЛОЖЕНИЕ] Гордость", next_trigger: "[ПРЕДПОЛОЖЕНИЕ] Социальное подтверждение" }
      ],
      growth_strategy: {
        year_1: "[ПРЕДПОЛОЖЕНИЕ] Проверка спроса и базового SKU.",
        year_3: "[ПРЕДПОЛОЖЕНИЕ] Расширение линейки и каналов.",
        year_5: "[ПРЕДПОЛОЖЕНИЕ] Закрепление подкатегории.",
        year_10: "[ПРЕДПОЛОЖЕНИЕ] Категорийное лидерство или новая платформа."
      },
      source_evidence_assumptions: "[ПРЕДПОЛОЖЕНИЕ]"
    },
    marketing: {
      segments: [
        {
          segment: "[ПРЕДПОЛОЖЕНИЕ] Основной сегмент",
          need: "[ПРЕДПОЛОЖЕНИЕ] Понятная польза + удобство",
          purchase_trigger: "[ПРЕДПОЛОЖЕНИЕ] Решение конкретной боли",
          why_they_buy: "[ПРЕДПОЛОЖЕНИЕ] Получают новый сценарий",
          acquisition_channel: "[ПРЕДПОЛОЖЕНИЕ] Ритейл/контент"
        },
        {
          segment: "[ПРЕДПОЛОЖЕНИЕ] Вторичный сегмент",
          need: "[ПРЕДПОЛОЖЕНИЕ] Быстрый сценарий",
          purchase_trigger: "[ПРЕДПОЛОЖЕНИЕ] Удобство",
          why_they_buy: "[ПРЕДПОЛОЖЕНИЕ] Повторяемый ритуал",
          acquisition_channel: "[ПРЕДПОЛОЖЕНИЕ] Digital"
        },
        {
          segment: "[ПРЕДПОЛОЖЕНИЕ] Третичный сегмент",
          need: "[ПРЕДПОЛОЖЕНИЕ] Новизна и понятность",
          purchase_trigger: "[ПРЕДПОЛОЖЕНИЕ] Отличие от обычной категории",
          why_they_buy: "[ПРЕДПОЛОЖЕНИЕ] Наличие дополнительной ценности",
          acquisition_channel: "[ПРЕДПОЛОЖЕНИЕ] Sampling"
        }
      ],
      base_product: "[ПРЕДПОЛОЖЕНИЕ] Базовый SKU строится вокруг нового формата и нового сценария.",
      line_extension: ["[ПРЕДПОЛОЖЕНИЕ] Вариант 1", "[ПРЕДПОЛОЖЕНИЕ] Вариант 2"],
      pricing: {
        base_rrc_rub: kernel?.rough_numbers?.price_rub || "[ПРЕДПОЛОЖЕНИЕ]",
        pricing_logic: "[ПРЕДПОЛОЖЕНИЕ] Цена отражает новый сценарий и дополнительную ценность.",
        models: ["[ПРЕДПОЛОЖЕНИЕ] Розница", "[ПРЕДПОЛОЖЕНИЕ] Набор/подписка"]
      },
      channels: {
        start: ["[ПРЕДПОЛОЖЕНИЕ] Пилотный ритейл", "[ПРЕДПОЛОЖЕНИЕ] Онлайн"],
        growth: ["[ПРЕДПОЛОЖЕНИЕ] Спецканалы", "[ПРЕДПОЛОЖЕНИЕ] Маркетплейсы"],
        scale: ["[ПРЕДПОЛОЖЕНИЕ] Массовый ритейл", "[ПРЕДПОЛОЖЕНИЕ] Расширенная дистрибуция"]
      },
      promotion: {
        low_budget: ["[ПРЕДПОЛОЖЕНИЕ] UGC", "[ПРЕДПОЛОЖЕНИЕ] Микроинфлюенсеры", "[ПРЕДПОЛОЖЕНИЕ] Контент"],
        testable: ["[ПРЕДПОЛОЖЕНИЕ] A/B офферы", "[ПРЕДПОЛОЖЕНИЕ] Сэмплинг", "[ПРЕДПОЛОЖЕНИЕ] Landing test"],
        scalable: ["[ПРЕДПОЛОЖЕНИЕ] Paid social", "[ПРЕДПОЛОЖЕНИЕ] Retail media", "[ПРЕДПОЛОЖЕНИЕ] CRM"]
      },
      source_evidence_assumptions: "[ПРЕДПОЛОЖЕНИЕ]"
    },
    production: {
      technology_process_steps: [
        { step: "[ПРЕДПОЛОЖЕНИЕ] Приём сырья", detail: "[ПРЕДПОЛОЖЕНИЕ]", ccp: "[ПРЕДПОЛОЖЕНИЕ]" },
        { step: "[ПРЕДПОЛОЖЕНИЕ] Подготовка", detail: "[ПРЕДПОЛОЖЕНИЕ]", ccp: "[ПРЕДПОЛОЖЕНИЕ]" },
        { step: "[ПРЕДПОЛОЖЕНИЕ] Формование/сборка", detail: "[ПРЕДПОЛОЖЕНИЕ]", ccp: "[ПРЕДПОЛОЖЕНИЕ]" },
        { step: "[ПРЕДПОЛОЖЕНИЕ] Термообработка/стабилизация", detail: "[ПРЕДПОЛОЖЕНИЕ]", ccp: "[ПРЕДПОЛОЖЕНИЕ]" },
        { step: "[ПРЕДПОЛОЖЕНИЕ] Фасовка", detail: "[ПРЕДПОЛОЖЕНИЕ]", ccp: "[ПРЕДПОЛОЖЕНИЕ]" }
      ],
      qc_checkpoints: ["[ПРЕДПОЛОЖЕНИЕ] Сырьё", "[ПРЕДПОЛОЖЕНИЕ] Герметичность", "[ПРЕДПОЛОЖЕНИЕ] Сенсорика"],
      shelf_life_days: kernel?.rough_numbers?.shelf_life_days || "[ПРЕДПОЛОЖЕНИЕ]",
      shelf_life_method: "[ПРЕДПОЛОЖЕНИЕ] Ускоренные и реальные испытания.",
      packaging_spec: {
        material: "[ПРЕДПОЛОЖЕНИЕ]",
        o2_transmission_rate: "[ПРЕДПОЛОЖЕНИЕ]",
        moisture_transmission: "[ПРЕДПОЛОЖЕНИЕ]",
        seal_strength: "[ПРЕДПОЛОЖЕНИЕ]"
      },
      microbiology_limits: {},
      production_constraints: ["[ПРЕДПОЛОЖЕНИЕ] Ограничение 1", "[ПРЕДПОЛОЖЕНИЕ] Ограничение 2"],
      source_evidence_assumptions: "[ПРЕДПОЛОЖЕНИЕ]"
    },
    regulatory: {
      allowed_claims: ["[ПРЕДПОЛОЖЕНИЕ] Claim 1", "[ПРЕДПОЛОЖЕНИЕ] Claim 2"],
      forbidden_claims: ["[ПРЕДПОЛОЖЕНИЕ] Claim 1", "[ПРЕДПОЛОЖЕНИЕ] Claim 2"],
      labeling_requirements: ["[ПРЕДПОЛОЖЕНИЕ] Маркировка", "[ПРЕДПОЛОЖЕНИЕ] Состав", "[ПРЕДПОЛОЖЕНИЕ] Аллергены"],
      legal_notes: "[ПРЕДПОЛОЖЕНИЕ]",
      source_evidence_assumptions: "[ПРЕДПОЛОЖЕНИЕ]"
    },
    commerce: {
      unit_economics: {
        raw_material_cost_rub_per_unit: "[ПРЕДПОЛОЖЕНИЕ]",
        packaging_cost_rub_per_unit: "[ПРЕДПОЛОЖЕНИЕ]",
        production_cost_rub_per_unit: "[ПРЕДПОЛОЖЕНИЕ]",
        logistics_rub_per_unit: "[ПРЕДПОЛОЖЕНИЕ]",
        opex_alloc_rub_per_unit: "[ПРЕДПОЛОЖЕНИЕ]",
        cost_per_unit_rub: "[ПРЕДПОЛОЖЕНИЕ]",
        rrc_assumed_rub: kernel?.rough_numbers?.price_rub || "[ПРЕДПОЛОЖЕНИЕ]",
        gross_margin_percent: "[ПРЕДПОЛОЖЕНИЕ]",
        notes: "[ПРЕДПОЛОЖЕНИЕ]"
      },
      pricing_models: ["[ПРЕДПОЛОЖЕНИЕ] Розница", "[ПРЕДПОЛОЖЕНИЕ] Набор"],
      cac_target_rub: "[ПРЕДПОЛОЖЕНИЕ]",
      ltv_target_rub: "[ПРЕДПОЛОЖЕНИЕ]",
      break_even_volume_months: "[ПРЕДПОЛОЖЕНИЕ]",
      source_evidence_assumptions: "[ПРЕДПОЛОЖЕНИЕ]"
    },
    validation_plan: [
      {
        name: "[ПРЕДПОЛОЖЕНИЕ] Sensory test",
        hypothesis: "[ПРЕДПОЛОЖЕНИЕ]",
        method: "[ПРЕДПОЛОЖЕНИЕ]",
        kpi: "[ПРЕДПОЛОЖЕНИЕ]",
        threshold: "[ПРЕДПОЛОЖЕНИЕ]",
        duration_days: 14,
        budget_rub: "[ПРЕДПОЛОЖЕНИЕ]"
      },
      {
        name: "[ПРЕДПОЛОЖЕНИЕ] In-use test",
        hypothesis: "[ПРЕДПОЛОЖЕНИЕ]",
        method: "[ПРЕДПОЛОЖЕНИЕ]",
        kpi: "[ПРЕДПОЛОЖЕНИЕ]",
        threshold: "[ПРЕДПОЛОЖЕНИЕ]",
        duration_days: 7,
        budget_rub: "[ПРЕДПОЛОЖЕНИЕ]"
      },
      {
        name: "[ПРЕДПОЛОЖЕНИЕ] Pilot",
        hypothesis: "[ПРЕДПОЛОЖЕНИЕ]",
        method: "[ПРЕДПОЛОЖЕНИЕ]",
        kpi: "[ПРЕДПОЛОЖЕНИЕ]",
        threshold: "[ПРЕДПОЛОЖЕНИЕ]",
        duration_days: 30,
        budget_rub: "[ПРЕДПОЛОЖЕНИЕ]"
      },
      {
        name: "[ПРЕДПОЛОЖЕНИЕ] A/B landing",
        hypothesis: "[ПРЕДПОЛОЖЕНИЕ]",
        method: "[ПРЕДПОЛОЖЕНИЕ]",
        kpi: "[ПРЕДПОЛОЖЕНИЕ]",
        threshold: "[ПРЕДПОЛОЖЕНИЕ]",
        duration_days: 14,
        budget_rub: "[ПРЕДПОЛОЖЕНИЕ]"
      }
    ],
    risks: [
      { risk: "[ПРЕДПОЛОЖЕНИЕ] Риск 1", category: "product", probability: "[ПРЕДПОЛОЖЕНИЕ]", impact: "[ПРЕДПОЛОЖЕНИЕ]", mitigation: "[ПРЕДПОЛОЖЕНИЕ]" },
      { risk: "[ПРЕДПОЛОЖЕНИЕ] Риск 2", category: "technology", probability: "[ПРЕДПОЛОЖЕНИЕ]", impact: "[ПРЕДПОЛОЖЕНИЕ]", mitigation: "[ПРЕДПОЛОЖЕНИЕ]" },
      { risk: "[ПРЕДПОЛОЖЕНИЕ] Риск 3", category: "behavioral", probability: "[ПРЕДПОЛОЖЕНИЕ]", impact: "[ПРЕДПОЛОЖЕНИЕ]", mitigation: "[ПРЕДПОЛОЖЕНИЕ]" },
      { risk: "[ПРЕДПОЛОЖЕНИЕ] Риск 4", category: "marketing", probability: "[ПРЕДПОЛОЖЕНИЕ]", impact: "[ПРЕДПОЛОЖЕНИЕ]", mitigation: "[ПРЕДПОЛОЖЕНИЕ]" },
      { risk: "[ПРЕДПОЛОЖЕНИЕ] Риск 5", category: "pricing", probability: "[ПРЕДПОЛОЖЕНИЕ]", impact: "[ПРЕДПОЛОЖЕНИЕ]", mitigation: "[ПРЕДПОЛОЖЕНИЕ]" }
    ],
    appendices: {
      sensory_protocol_template: {},
      product_card_example: null,
      unit_economics_template: "[ПРЕДПОЛОЖЕНИЕ]",
      qa_checklist_template: ["[ПРЕДПОЛОЖЕНИЕ] Пункт 1", "[ПРЕДПОЛОЖЕНИЕ] Пункт 2", "[ПРЕДПОЛОЖЕНИЕ] Пункт 3"]
    },
    sign_off_checklist: [
      { item: "Паспорт заполнен", status: "No", comments: "[ПРЕДПОЛОЖЕНИЕ]" },
      { item: "Ключевые числа проверены", status: "No", comments: "[ПРЕДПОЛОЖЕНИЕ]" },
      { item: "Сенсорные критерии заданы", status: "No", comments: "[ПРЕДПОЛОЖЕНИЕ]" },
      { item: "Validation plan готов", status: "No", comments: "[ПРЕДПОЛОЖЕНИЕ]" },
      { item: "Риски описаны", status: "No", comments: "[ПРЕДПОЛОЖЕНИЕ]" },
      { item: "Документ годен к публикации", status: "No", comments: "[ПРЕДПОЛОЖЕНИЕ]" }
    ],
    conclusion: {
      why_viable: "[ПРЕДПОЛОЖЕНИЕ] Продукт жизнеспособен, если подтвердится спрос на новый ритуал.",
      best_first_test_market: "[ПРЕДПОЛОЖЕНИЕ] Тестовый канал с высокой релевантностью.",
      first_things_to_validate: [
        "[ПРЕДПОЛОЖЕНИЕ] Проверить повторяемость ритуала",
        "[ПРЕДПОЛОЖЕНИЕ] Проверить воспринимаемую ценность",
        "[ПРЕДПОЛОЖЕНИЕ] Проверить сенсорную приемлемость"
      ],
      next_step: "[ПРЕДПОЛОЖЕНИЕ] Собрать MVP и проверить пилотом."
    }
  };

  return product;
}

// ======================================================
// NORMALIZATION V2
// ======================================================
function ensureArrayStrings(value, fallback = []) {
  return normalizeList(value, fallback);
}

function normalizeSensoryModality(mod, fallbackText = "[ПРЕДПОЛОЖЕНИЕ]") {
  const source = mod && typeof mod === "object" ? mod : {};
  return {
    desired_experience: normalizeMeaningfulText(source.desired_experience, fallbackText),
    memory_marker: normalizeMeaningfulText(source.memory_marker, "[ПРЕДПОЛОЖЕНИЕ]"),
    brand_role: normalizeMeaningfulText(source.brand_role, "[ПРЕДПОЛОЖЕНИЕ]"),
    measurable_goal: normalizeMeaningfulText(source.measurable_goal, "[ПРЕДПОЛОЖЕНИЕ]"),
    protocol_test: source.protocol_test ?? "[ПРЕДПОЛОЖЕНИЕ]",
    analysis_method: normalizeMeaningfulText(source.analysis_method, "[ПРЕДПОЛОЖЕНИЕ]"),
    acceptance_criteria: normalizeMeaningfulText(source.acceptance_criteria, "[ПРЕДПОЛОЖЕНИЕ]"),
    recommendations: ensureArrayStrings(source.recommendations, ["[ПРЕДПОЛОЖЕНИЕ]"])
  };
}

function normalizePassportV2(raw, input, kernel, chosenName) {
  const fallback = fallbackPassportV2(input, kernel, chosenName);
  const src = raw && typeof raw === "object" ? raw : {};

  const product = {
    short_passport: {
      category: normalizeMeaningfulText(src?.short_passport?.category, fallback.short_passport.category),
      name: validateNaming(src?.short_passport?.name) ? sanitizeText(src.short_passport.name) : fallback.short_passport.name,
      name_variants: Array.isArray(src?.short_passport?.name_variants)
        ? src.short_passport.name_variants.map(v => ({
            name: validateNaming(v?.name) ? sanitizeText(v.name) : fallback.short_passport.name,
            logic: normalizeMeaningfulText(v?.logic, "[ПРЕДПОЛОЖЕНИЕ]")
          })).slice(0, 6)
        : fallback.short_passport.name_variants,
      audience: normalizeMeaningfulText(src?.short_passport?.audience, fallback.short_passport.audience),
      pain: normalizeMeaningfulText(src?.short_passport?.pain, fallback.short_passport.pain),
      uniqueness: normalizeMeaningfulText(src?.short_passport?.uniqueness, fallback.short_passport.uniqueness),
      key_idea: normalizeMeaningfulText(src?.short_passport?.key_idea, fallback.short_passport.key_idea),
      one_liner: normalizeMeaningfulText(src?.short_passport?.one_liner, fallback.short_passport.one_liner),
      portion_g: pickNonEmpty(src?.short_passport?.portion_g, fallback.short_passport.portion_g),
      protein_per_portion_g: pickNonEmpty(src?.short_passport?.protein_per_portion_g, fallback.short_passport.protein_per_portion_g),
      calories_per_portion_kcal: pickNonEmpty(src?.short_passport?.calories_per_portion_kcal, fallback.short_passport.calories_per_portion_kcal),
      rrc_rub: pickNonEmpty(src?.short_passport?.rrc_rub, fallback.short_passport.rrc_rub),
      source_evidence_assumptions: normalizeMeaningfulText(
        src?.short_passport?.source_evidence_assumptions,
        fallback.short_passport.source_evidence_assumptions
      )
    },

    cognitive_block: {
      pain_disruption: {
        core_problem: normalizeMeaningfulText(
          src?.cognitive_block?.pain_disruption?.core_problem,
          fallback.cognitive_block.pain_disruption.core_problem
        ),
        why_existing_solutions_fail: normalizeMeaningfulText(
          src?.cognitive_block?.pain_disruption?.why_existing_solutions_fail,
          fallback.cognitive_block.pain_disruption.why_existing_solutions_fail
        ),
        why_this_pain_can_create_a_new_category: normalizeMeaningfulText(
          src?.cognitive_block?.pain_disruption?.why_this_pain_can_create_a_new_category,
          fallback.cognitive_block.pain_disruption.why_this_pain_can_create_a_new_category
        )
      },
      consumption_change: {
        new_market: normalizeMeaningfulText(
          src?.cognitive_block?.consumption_change?.new_market,
          fallback.cognitive_block.consumption_change.new_market
        ),
        what_replaces: ensureArrayStrings(
          src?.cognitive_block?.consumption_change?.what_replaces,
          fallback.cognitive_block.consumption_change.what_replaces
        ),
        new_monetizable_value: ensureArrayStrings(
          src?.cognitive_block?.consumption_change?.new_monetizable_value,
          fallback.cognitive_block.consumption_change.new_monetizable_value
        ),
        why_people_will_pay: normalizeMeaningfulText(
          src?.cognitive_block?.consumption_change?.why_people_will_pay,
          fallback.cognitive_block.consumption_change.why_people_will_pay
        )
      },
      rituals: {
        behavior_change: normalizeMeaningfulText(
          src?.cognitive_block?.rituals?.behavior_change,
          fallback.cognitive_block.rituals.behavior_change
        ),
        old_vs_new_rituals: Array.isArray(src?.cognitive_block?.rituals?.old_vs_new_rituals)
          ? src.cognitive_block.rituals.old_vs_new_rituals.map(r => ({
              old_ritual: normalizeMeaningfulText(r?.old_ritual, "[ПРЕДПОЛОЖЕНИЕ]"),
              new_ritual: normalizeMeaningfulText(r?.new_ritual, "[ПРЕДПОЛОЖЕНИЕ]")
            }))
          : fallback.cognitive_block.rituals.old_vs_new_rituals,
        new_rituals: ensureArrayStrings(
          src?.cognitive_block?.rituals?.new_rituals,
          fallback.cognitive_block.rituals.new_rituals
        ),
        usage_contexts: ensureArrayStrings(
          src?.cognitive_block?.rituals?.usage_contexts,
          fallback.cognitive_block.rituals.usage_contexts
        )
      },
      narratives: {
        headlines: ensureArrayStrings(
          src?.cognitive_block?.narratives?.headlines,
          fallback.cognitive_block.narratives.headlines
        ),
        landing_copy: ensureArrayStrings(
          src?.cognitive_block?.narratives?.landing_copy,
          fallback.cognitive_block.narratives.landing_copy
        ),
        brand_story: normalizeMeaningfulText(
          src?.cognitive_block?.narratives?.brand_story,
          fallback.cognitive_block.narratives.brand_story
        )
      },
      desired_model: {
        thoughts: ensureArrayStrings(
          src?.cognitive_block?.desired_model?.thoughts,
          fallback.cognitive_block.desired_model.thoughts
        ),
        feelings: ensureArrayStrings(
          src?.cognitive_block?.desired_model?.feelings,
          fallback.cognitive_block.desired_model.feelings
        ),
        behaviors: ensureArrayStrings(
          src?.cognitive_block?.desired_model?.behaviors,
          fallback.cognitive_block.desired_model.behaviors
        )
      },
      education: {
        channels: ensureArrayStrings(
          src?.cognitive_block?.education?.channels,
          fallback.cognitive_block.education.channels
        ),
        mechanics: ensureArrayStrings(
          src?.cognitive_block?.education?.mechanics,
          fallback.cognitive_block.education.mechanics
        ),
        low_budget_options: ensureArrayStrings(
          src?.cognitive_block?.education?.low_budget_options,
          fallback.cognitive_block.education.low_budget_options
        ),
        scalable_options: ensureArrayStrings(
          src?.cognitive_block?.education?.scalable_options,
          fallback.cognitive_block.education.scalable_options
        ),
        kpi: ensureArrayStrings(
          src?.cognitive_block?.education?.kpi,
          fallback.cognitive_block.education.kpi
        )
      },
      source_evidence_assumptions: normalizeMeaningfulText(
        src?.cognitive_block?.source_evidence_assumptions,
        fallback.cognitive_block.source_evidence_assumptions
      )
    },

    sensory_block: {
      visual: normalizeSensoryModality(src?.sensory_block?.visual, fallback.sensory_block.visual.desired_experience),
      audio: normalizeSensoryModality(src?.sensory_block?.audio, fallback.sensory_block.audio.desired_experience),
      smell: normalizeSensoryModality(src?.sensory_block?.smell, fallback.sensory_block.smell.desired_experience),
      tactile: normalizeSensoryModality(src?.sensory_block?.tactile, fallback.sensory_block.tactile.desired_experience),
      taste: normalizeSensoryModality(src?.sensory_block?.taste, fallback.sensory_block.taste.desired_experience),
      source_evidence_assumptions: normalizeMeaningfulText(
        src?.sensory_block?.source_evidence_assumptions,
        fallback.sensory_block.source_evidence_assumptions
      )
    },

    branding: {
      story: normalizeMeaningfulText(src?.branding?.story, fallback.branding.story),
      promise: normalizeMeaningfulText(src?.branding?.promise, fallback.branding.promise),
      identity_effect: normalizeMeaningfulText(src?.branding?.identity_effect, fallback.branding.identity_effect),
      context: {
        favorable: ensureArrayStrings(src?.branding?.context?.favorable, fallback.branding.context.favorable),
        unfavorable: ensureArrayStrings(src?.branding?.context?.unfavorable, fallback.branding.context.unfavorable)
      },
      brand_core: {
        name_logic: normalizeMeaningfulText(src?.branding?.brand_core?.name_logic, fallback.branding.brand_core.name_logic),
        logo_idea: normalizeMeaningfulText(src?.branding?.brand_core?.logo_idea, fallback.branding.brand_core.logo_idea),
        slogan: normalizeMeaningfulText(src?.branding?.brand_core?.slogan, fallback.branding.brand_core.slogan),
        distinctive_assets: ensureArrayStrings(
          src?.branding?.brand_core?.distinctive_assets,
          fallback.branding.brand_core.distinctive_assets
        )
      },
      customer_journey: Array.isArray(src?.branding?.customer_journey)
        ? src.branding.customer_journey.map(j => ({
            stage: sanitizeText(j?.stage),
            customer_feeling: normalizeMeaningfulText(j?.customer_feeling, "[ПРЕДПОЛОЖЕНИЕ]"),
            next_trigger: normalizeMeaningfulText(j?.next_trigger, "[ПРЕДПОЛОЖЕНИЕ]")
          }))
        : fallback.branding.customer_journey,
      growth_strategy: {
        year_1: normalizeMeaningfulText(src?.branding?.growth_strategy?.year_1, fallback.branding.growth_strategy.year_1),
        year_3: normalizeMeaningfulText(src?.branding?.growth_strategy?.year_3, fallback.branding.growth_strategy.year_3),
        year_5: normalizeMeaningfulText(src?.branding?.growth_strategy?.year_5, fallback.branding.growth_strategy.year_5),
        year_10: normalizeMeaningfulText(src?.branding?.growth_strategy?.year_10, fallback.branding.growth_strategy.year_10)
      },
      source_evidence_assumptions: normalizeMeaningfulText(
        src?.branding?.source_evidence_assumptions,
        fallback.branding.source_evidence_assumptions
      )
    },

    marketing: {
      segments: Array.isArray(src?.marketing?.segments)
        ? src.marketing.segments.map(s => ({
            segment: normalizeMeaningfulText(s?.segment, "[ПРЕДПОЛОЖЕНИЕ]"),
            need: normalizeMeaningfulText(s?.need, "[ПРЕДПОЛОЖЕНИЕ]"),
            purchase_trigger: normalizeMeaningfulText(s?.purchase_trigger, "[ПРЕДПОЛОЖЕНИЕ]"),
            why_they_buy: normalizeMeaningfulText(s?.why_they_buy, "[ПРЕДПОЛОЖЕНИЕ]"),
            acquisition_channel: normalizeMeaningfulText(s?.acquisition_channel, "[ПРЕДПОЛОЖЕНИЕ]")
          }))
        : fallback.marketing.segments,
      base_product: normalizeMeaningfulText(src?.marketing?.base_product, fallback.marketing.base_product),
      line_extension: ensureArrayStrings(src?.marketing?.line_extension, fallback.marketing.line_extension),
      pricing: {
        base_rrc_rub: pickNonEmpty(src?.marketing?.pricing?.base_rrc_rub, fallback.marketing.pricing.base_rrc_rub),
        pricing_logic: normalizeMeaningfulText(src?.marketing?.pricing?.pricing_logic, fallback.marketing.pricing.pricing_logic),
        models: ensureArrayStrings(src?.marketing?.pricing?.models, fallback.marketing.pricing.models)
      },
      channels: {
        start: ensureArrayStrings(src?.marketing?.channels?.start, fallback.marketing.channels.start),
        growth: ensureArrayStrings(src?.marketing?.channels?.growth, fallback.marketing.channels.growth),
        scale: ensureArrayStrings(src?.marketing?.channels?.scale, fallback.marketing.channels.scale)
      },
      promotion: {
        low_budget: ensureArrayStrings(src?.marketing?.promotion?.low_budget, fallback.marketing.promotion.low_budget),
        testable: ensureArrayStrings(src?.marketing?.promotion?.testable, fallback.marketing.promotion.testable),
        scalable: ensureArrayStrings(src?.marketing?.promotion?.scalable, fallback.marketing.promotion.scalable)
      },
      source_evidence_assumptions: normalizeMeaningfulText(
        src?.marketing?.source_evidence_assumptions,
        fallback.marketing.source_evidence_assumptions
      )
    },

    production: {
      technology_process_steps: Array.isArray(src?.production?.technology_process_steps)
        ? src.production.technology_process_steps.map(p => ({
            step: normalizeMeaningfulText(p?.step, "[ПРЕДПОЛОЖЕНИЕ]"),
            detail: normalizeMeaningfulText(p?.detail, "[ПРЕДПОЛОЖЕНИЕ]"),
            ccp: normalizeMeaningfulText(p?.ccp, "[ПРЕДПОЛОЖЕНИЕ]")
          }))
        : fallback.production.technology_process_steps,
      qc_checkpoints: ensureArrayStrings(src?.production?.qc_checkpoints, fallback.production.qc_checkpoints),
      shelf_life_days: pickNonEmpty(src?.production?.shelf_life_days, fallback.production.shelf_life_days),
      shelf_life_method: normalizeMeaningfulText(src?.production?.shelf_life_method, fallback.production.shelf_life_method),
      packaging_spec: {
        material: normalizeMeaningfulText(src?.production?.packaging_spec?.material, fallback.production.packaging_spec.material),
        o2_transmission_rate: normalizeMeaningfulText(src?.production?.packaging_spec?.o2_transmission_rate, fallback.production.packaging_spec.o2_transmission_rate),
        moisture_transmission: normalizeMeaningfulText(src?.production?.packaging_spec?.moisture_transmission, fallback.production.packaging_spec.moisture_transmission),
        seal_strength: normalizeMeaningfulText(src?.production?.packaging_spec?.seal_strength, fallback.production.packaging_spec.seal_strength)
      },
      microbiology_limits: src?.production?.microbiology_limits || fallback.production.microbiology_limits,
      production_constraints: ensureArrayStrings(src?.production?.production_constraints, fallback.production.production_constraints),
      source_evidence_assumptions: normalizeMeaningfulText(
        src?.production?.source_evidence_assumptions,
        fallback.production.source_evidence_assumptions
      )
    },

    regulatory: {
      allowed_claims: ensureArrayStrings(src?.regulatory?.allowed_claims, fallback.regulatory.allowed_claims),
      forbidden_claims: ensureArrayStrings(src?.regulatory?.forbidden_claims, fallback.regulatory.forbidden_claims),
      labeling_requirements: ensureArrayStrings(src?.regulatory?.labeling_requirements, fallback.regulatory.labeling_requirements),
      legal_notes: normalizeMeaningfulText(src?.regulatory?.legal_notes, fallback.regulatory.legal_notes),
      source_evidence_assumptions: normalizeMeaningfulText(
        src?.regulatory?.source_evidence_assumptions,
        fallback.regulatory.source_evidence_assumptions
      )
    },

    commerce: {
      unit_economics: {
        raw_material_cost_rub_per_unit: pickNonEmpty(src?.commerce?.unit_economics?.raw_material_cost_rub_per_unit, fallback.commerce.unit_economics.raw_material_cost_rub_per_unit),
        packaging_cost_rub_per_unit: pickNonEmpty(src?.commerce?.unit_economics?.packaging_cost_rub_per_unit, fallback.commerce.unit_economics.packaging_cost_rub_per_unit),
        production_cost_rub_per_unit: pickNonEmpty(src?.commerce?.unit_economics?.production_cost_rub_per_unit, fallback.commerce.unit_economics.production_cost_rub_per_unit),
        logistics_rub_per_unit: pickNonEmpty(src?.commerce?.unit_economics?.logistics_rub_per_unit, fallback.commerce.unit_economics.logistics_rub_per_unit),
        opex_alloc_rub_per_unit: pickNonEmpty(src?.commerce?.unit_economics?.opex_alloc_rub_per_unit, fallback.commerce.unit_economics.opex_alloc_rub_per_unit),
        cost_per_unit_rub: pickNonEmpty(src?.commerce?.unit_economics?.cost_per_unit_rub, fallback.commerce.unit_economics.cost_per_unit_rub),
        rrc_assumed_rub: pickNonEmpty(src?.commerce?.unit_economics?.rrc_assumed_rub, fallback.commerce.unit_economics.rrc_assumed_rub),
        gross_margin_percent: pickNonEmpty(src?.commerce?.unit_economics?.gross_margin_percent, fallback.commerce.unit_economics.gross_margin_percent),
        notes: normalizeMeaningfulText(src?.commerce?.unit_economics?.notes, fallback.commerce.unit_economics.notes)
      },
      pricing_models: ensureArrayStrings(src?.commerce?.pricing_models, fallback.commerce.pricing_models),
      cac_target_rub: pickNonEmpty(src?.commerce?.cac_target_rub, fallback.commerce.cac_target_rub),
      ltv_target_rub: pickNonEmpty(src?.commerce?.ltv_target_rub, fallback.commerce.ltv_target_rub),
      break_even_volume_months: pickNonEmpty(src?.commerce?.break_even_volume_months, fallback.commerce.break_even_volume_months),
      source_evidence_assumptions: normalizeMeaningfulText(
        src?.commerce?.source_evidence_assumptions,
        fallback.commerce.source_evidence_assumptions
      )
    },

    validation_plan: Array.isArray(src?.validation_plan) && src.validation_plan.length
      ? src.validation_plan.map(v => ({
          name: normalizeMeaningfulText(v?.name, "[ПРЕДПОЛОЖЕНИЕ]"),
          hypothesis: normalizeMeaningfulText(v?.hypothesis, "[ПРЕДПОЛОЖЕНИЕ]"),
          method: normalizeMeaningfulText(v?.method, "[ПРЕДПОЛОЖЕНИЕ]"),
          kpi: normalizeMeaningfulText(v?.kpi, "[ПРЕДПОЛОЖЕНИЕ]"),
          threshold: normalizeMeaningfulText(v?.threshold, "[ПРЕДПОЛОЖЕНИЕ]"),
          duration_days: pickNonEmpty(v?.duration_days, 14),
          budget_rub: pickNonEmpty(v?.budget_rub, "[ПРЕДПОЛОЖЕНИЕ]")
        }))
      : fallback.validation_plan,

    risks: Array.isArray(src?.risks) && src.risks.length
      ? src.risks.map(r => ({
          risk: normalizeMeaningfulText(r?.risk, "[ПРЕДПОЛОЖЕНИЕ]"),
          category: pickNonEmpty(r?.category, "product"),
          probability: normalizeMeaningfulText(r?.probability, "[ПРЕДПОЛОЖЕНИЕ]"),
          impact: normalizeMeaningfulText(r?.impact, "[ПРЕДПОЛОЖЕНИЕ]"),
          mitigation: normalizeMeaningfulText(r?.mitigation, "[ПРЕДПОЛОЖЕНИЕ]")
        }))
      : fallback.risks,

    appendices: {
      sensory_protocol_template: src?.appendices?.sensory_protocol_template || fallback.appendices.sensory_protocol_template,
      product_card_example: src?.appendices?.product_card_example ?? fallback.appendices.product_card_example,
      unit_economics_template: normalizeMeaningfulText(
        src?.appendices?.unit_economics_template,
        fallback.appendices.unit_economics_template
      ),
      qa_checklist_template: ensureArrayStrings(
        src?.appendices?.qa_checklist_template,
        fallback.appendices.qa_checklist_template
      )
    },

    sign_off_checklist: Array.isArray(src?.sign_off_checklist) && src.sign_off_checklist.length
      ? src.sign_off_checklist.map(s => ({
          item: normalizeMeaningfulText(s?.item, "[ПРЕДПОЛОЖЕНИЕ]"),
          status: ["Yes", "No", "N/A"].includes(s?.status) ? s.status : "No",
          comments: normalizeMeaningfulText(s?.comments, "[ПРЕДПОЛОЖЕНИЕ]")
        }))
      : fallback.sign_off_checklist,

    conclusion: src?.conclusion && typeof src.conclusion === "object"
      ? {
          why_viable: normalizeMeaningfulText(src.conclusion.why_viable, fallback.conclusion.why_viable),
          best_first_test_market: normalizeMeaningfulText(src.conclusion.best_first_test_market, fallback.conclusion.best_first_test_market),
          first_things_to_validate: ensureArrayStrings(src.conclusion.first_things_to_validate, fallback.conclusion.first_things_to_validate),
          next_step: normalizeMeaningfulText(src.conclusion.next_step, fallback.conclusion.next_step)
        }
      : fallback.conclusion
  };

  return product;
}

// ======================================================
// REWRITE V2
// ======================================================
function collectWeakPathsV2(passport) {
  const weak = [];

  const check = (path, text, minWords) => {
    if (isWeakText(text, minWords)) {
      weak.push({ path, text: sanitizeText(text) });
    }
  };

  check("short_passport.pain", passport.short_passport?.pain, 18);
  check("short_passport.uniqueness", passport.short_passport?.uniqueness, 20);
  check("short_passport.key_idea", passport.short_passport?.key_idea, 16);

  check("cognitive_block.pain_disruption.core_problem", passport.cognitive_block?.pain_disruption?.core_problem, 35);
  check("cognitive_block.pain_disruption.why_existing_solutions_fail", passport.cognitive_block?.pain_disruption?.why_existing_solutions_fail, 35);
  check("cognitive_block.pain_disruption.why_this_pain_can_create_a_new_category", passport.cognitive_block?.pain_disruption?.why_this_pain_can_create_a_new_category, 35);

  check("cognitive_block.consumption_change.new_market", passport.cognitive_block?.consumption_change?.new_market, 25);
  check("cognitive_block.consumption_change.why_people_will_pay", passport.cognitive_block?.consumption_change?.why_people_will_pay, 25);

  check("cognitive_block.rituals.behavior_change", passport.cognitive_block?.rituals?.behavior_change, 25);
  check("cognitive_block.narratives.brand_story", passport.cognitive_block?.narratives?.brand_story, 40);

  check("branding.story", passport.branding?.story, 35);
  check("branding.promise", passport.branding?.promise, 14);
  check("branding.identity_effect", passport.branding?.identity_effect, 18);

  check("marketing.base_product", passport.marketing?.base_product, 20);
  check("marketing.pricing.pricing_logic", passport.marketing?.pricing?.pricing_logic, 18);

  check("production.shelf_life_method", passport.production?.shelf_life_method, 12);
  check("regulatory.legal_notes", passport.regulatory?.legal_notes, 12);

  check("commerce.unit_economics.notes", passport.commerce?.unit_economics?.notes, 12);

  ["visual", "audio", "smell", "tactile", "taste"].forEach(k => {
    check(`sensory_block.${k}.desired_experience`, passport.sensory_block?.[k]?.desired_experience, 18);
    check(`sensory_block.${k}.brand_role`, passport.sensory_block?.[k]?.brand_role, 14);
    check(`sensory_block.${k}.analysis_method`, passport.sensory_block?.[k]?.analysis_method, 8);
  });

  return weak;
}

function setDeepValue(obj, path, value) {
  const parts = path.split(".");
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

async function rewriteWeakSectionsV2(passport) {
  const weak = collectWeakPathsV2(passport);
  if (!weak.length) return passport;

  const follow = await callTextModel([
    { role: "system", content: buildRewriteSystemPrompt() },
    {
      role: "user",
      content: joinNonEmpty([
        "Ниже список слабых полей полного product passport.",
        "Перепиши только эти поля. Для каждого дай более сильный текст: что / почему / как проявляется в реальном сценарии / если уместно KPI.",
        "",
        JSON.stringify({ weak_fields: weak }, null, 2),
        "",
        "Верни JSON вида:",
        JSON.stringify({
          rewrites: [
            { path: "branding.story", value: "..." }
          ]
        }, null, 2)
      ])
    }
  ], REWRITE_TEMPERATURE);

  if (!follow || typeof follow !== "object" || !Array.isArray(follow.rewrites)) return passport;

  const cloned = deepClone(passport);
  for (const item of follow.rewrites) {
    const p = sanitizeText(item?.path);
    const v = cleanupAnswer(item?.value);
    if (!p || !v) continue;
    setDeepValue(cloned, p, v);
  }
  return cloned;
}

// ======================================================
// LEGACY PROJECTION
// ======================================================
function modalityToLegacyText(modality) {
  if (!modality || typeof modality !== "object") return "";
  return cleanupAnswer(joinNonEmpty([
    modality.desired_experience ? `Опыт: ${modality.desired_experience}` : "",
    modality.memory_marker ? `Маркер: ${modality.memory_marker}` : "",
    modality.brand_role ? `Роль для бренда: ${modality.brand_role}` : "",
    modality.measurable_goal ? `Цель: ${modality.measurable_goal}` : "",
    modality.acceptance_criteria ? `Критерий: ${modality.acceptance_criteria}` : "",
    Array.isArray(modality.recommendations) && modality.recommendations.length
      ? `Рекомендации: ${modality.recommendations.join("; ")}`
      : ""
  ], "\n"));
}

function buildLegacyProjection(passportV2, input) {
  const cognitive = [];
  const sensory = [];
  const branding = [];
  const marketing = [];

  cognitive.push({
    no: "1.1",
    question: BLOCK_SCHEMAS.cognitive[0].question,
    answer: cleanupAnswer(joinNonEmpty([
      passportV2.cognitive_block?.pain_disruption?.core_problem,
      passportV2.cognitive_block?.pain_disruption?.why_existing_solutions_fail,
      passportV2.cognitive_block?.pain_disruption?.why_this_pain_can_create_a_new_category
    ], "\n\n"))
  });

  cognitive.push({
    no: "1.2",
    question: BLOCK_SCHEMAS.cognitive[1].question,
    answer: cleanupAnswer(joinNonEmpty([
      passportV2.cognitive_block?.consumption_change?.new_market,
      Array.isArray(passportV2.cognitive_block?.consumption_change?.what_replaces)
        ? `Что заменяет: ${passportV2.cognitive_block.consumption_change.what_replaces.join("; ")}`
        : "",
      Array.isArray(passportV2.cognitive_block?.consumption_change?.new_monetizable_value)
        ? `Новая ценность: ${passportV2.cognitive_block.consumption_change.new_monetizable_value.join("; ")}`
        : "",
      passportV2.cognitive_block?.consumption_change?.why_people_will_pay
    ], "\n\n"))
  });

  cognitive.push({
    no: "1.3",
    question: BLOCK_SCHEMAS.cognitive[2].question,
    answer: cleanupAnswer(joinNonEmpty([
      passportV2.cognitive_block?.rituals?.behavior_change,
      Array.isArray(passportV2.cognitive_block?.rituals?.old_vs_new_rituals)
        ? passportV2.cognitive_block.rituals.old_vs_new_rituals
            .map(x => `Старый ритуал: ${x.old_ritual} → Новый ритуал: ${x.new_ritual}`)
            .join("\n")
        : "",
      Array.isArray(passportV2.cognitive_block?.rituals?.new_rituals)
        ? `Новые ритуалы: ${passportV2.cognitive_block.rituals.new_rituals.join("; ")}`
        : "",
      Array.isArray(passportV2.cognitive_block?.rituals?.usage_contexts)
        ? `Контексты: ${passportV2.cognitive_block.rituals.usage_contexts.join("; ")}`
        : ""
    ], "\n\n"))
  });

  cognitive.push({
    no: "1.4",
    question: BLOCK_SCHEMAS.cognitive[3].question,
    answer: cleanupAnswer(joinNonEmpty([
      Array.isArray(passportV2.cognitive_block?.narratives?.headlines)
        ? `Короткие нарративы: ${passportV2.cognitive_block.narratives.headlines.join(" | ")}`
        : "",
      Array.isArray(passportV2.cognitive_block?.narratives?.landing_copy)
        ? `Средние нарративы: ${passportV2.cognitive_block.narratives.landing_copy.join(" | ")}`
        : "",
      passportV2.cognitive_block?.narratives?.brand_story
    ], "\n\n"))
  });

  cognitive.push({
    no: "1.5",
    question: BLOCK_SCHEMAS.cognitive[4].question,
    answer: cleanupAnswer(joinNonEmpty([
      Array.isArray(passportV2.cognitive_block?.education?.channels)
        ? `Каналы: ${passportV2.cognitive_block.education.channels.join("; ")}`
        : "",
      Array.isArray(passportV2.cognitive_block?.education?.mechanics)
        ? `Механики: ${passportV2.cognitive_block.education.mechanics.join("; ")}`
        : "",
      Array.isArray(passportV2.cognitive_block?.education?.low_budget_options)
        ? `Дешёвые опции: ${passportV2.cognitive_block.education.low_budget_options.join("; ")}`
        : "",
      Array.isArray(passportV2.cognitive_block?.education?.scalable_options)
        ? `Масштабируемые опции: ${passportV2.cognitive_block.education.scalable_options.join("; ")}`
        : "",
      Array.isArray(passportV2.cognitive_block?.education?.kpi)
        ? `KPI: ${passportV2.cognitive_block.education.kpi.join("; ")}`
        : ""
    ], "\n\n"))
  });

  sensory.push({
    no: "2.1",
    question: BLOCK_SCHEMAS.sensory[0].question,
    answer: modalityToLegacyText(passportV2.sensory_block?.visual)
  });
  sensory.push({
    no: "2.2",
    question: BLOCK_SCHEMAS.sensory[1].question,
    answer: modalityToLegacyText(passportV2.sensory_block?.audio)
  });
  sensory.push({
    no: "2.3",
    question: BLOCK_SCHEMAS.sensory[2].question,
    answer: modalityToLegacyText(passportV2.sensory_block?.smell)
  });
  sensory.push({
    no: "2.4",
    question: BLOCK_SCHEMAS.sensory[3].question,
    answer: modalityToLegacyText(passportV2.sensory_block?.tactile)
  });
  sensory.push({
    no: "2.5",
    question: BLOCK_SCHEMAS.sensory[4].question,
    answer: modalityToLegacyText(passportV2.sensory_block?.taste)
  });

  branding.push({
    no: "3.1",
    question: BLOCK_SCHEMAS.branding[0].question,
    answer: cleanupAnswer(joinNonEmpty([
      passportV2.branding?.story,
      passportV2.branding?.promise,
      passportV2.branding?.identity_effect
    ], "\n\n"))
  });

  branding.push({
    no: "3.2",
    question: BLOCK_SCHEMAS.branding[1].question,
    answer: cleanupAnswer(joinNonEmpty([
      Array.isArray(passportV2.branding?.context?.favorable)
        ? `Благоприятный контекст: ${passportV2.branding.context.favorable.join("; ")}`
        : "",
      Array.isArray(passportV2.branding?.context?.unfavorable)
        ? `Неблагоприятный контекст: ${passportV2.branding.context.unfavorable.join("; ")}`
        : ""
    ], "\n\n"))
  });

  branding.push({
    no: "3.3",
    question: BLOCK_SCHEMAS.branding[2].question,
    answer: cleanupAnswer(joinNonEmpty([
      `Название: ${passportV2.short_passport?.name || ""}`,
      passportV2.branding?.brand_core?.name_logic ? `Логика названия: ${passportV2.branding.brand_core.name_logic}` : "",
      passportV2.branding?.brand_core?.logo_idea ? `Логотип: ${passportV2.branding.brand_core.logo_idea}` : "",
      passportV2.branding?.brand_core?.slogan ? `Слоган: ${passportV2.branding.brand_core.slogan}` : "",
      Array.isArray(passportV2.branding?.brand_core?.distinctive_assets)
        ? `Активы: ${passportV2.branding.brand_core.distinctive_assets.join("; ")}`
        : ""
    ], "\n\n"))
  });

  branding.push({
    no: "3.4",
    question: BLOCK_SCHEMAS.branding[3].question,
    answer: cleanupAnswer(
      Array.isArray(passportV2.branding?.customer_journey)
        ? passportV2.branding.customer_journey
            .map(s => `${s.stage}: ${s.customer_feeling} → ${s.next_trigger}`)
            .join("\n")
        : ""
    )
  });

  branding.push({
    no: "3.5",
    question: BLOCK_SCHEMAS.branding[4].question,
    answer: cleanupAnswer(joinNonEmpty([
      passportV2.branding?.growth_strategy?.year_1 ? `1 год: ${passportV2.branding.growth_strategy.year_1}` : "",
      passportV2.branding?.growth_strategy?.year_3 ? `3 года: ${passportV2.branding.growth_strategy.year_3}` : "",
      passportV2.branding?.growth_strategy?.year_5 ? `5 лет: ${passportV2.branding.growth_strategy.year_5}` : "",
      passportV2.branding?.growth_strategy?.year_10 ? `10 лет: ${passportV2.branding.growth_strategy.year_10}` : ""
    ], "\n"))
  });

  marketing.push({
    no: "4.1",
    question: BLOCK_SCHEMAS.marketing[0].question,
    answer: cleanupAnswer(
      Array.isArray(passportV2.marketing?.segments)
        ? passportV2.marketing.segments
            .map(s => `${s.segment}: потребность — ${s.need}; триггер — ${s.purchase_trigger}; почему купят — ${s.why_they_buy}; канал — ${s.acquisition_channel}`)
            .join("\n")
        : ""
    )
  });

  marketing.push({
    no: "4.2",
    question: BLOCK_SCHEMAS.marketing[1].question,
    answer: cleanupAnswer(joinNonEmpty([
      passportV2.marketing?.base_product,
      Array.isArray(passportV2.marketing?.line_extension)
        ? `Развитие линейки: ${passportV2.marketing.line_extension.join("; ")}`
        : ""
    ], "\n\n"))
  });

  marketing.push({
    no: "4.3",
    question: BLOCK_SCHEMAS.marketing[2].question,
    answer: cleanupAnswer(joinNonEmpty([
      passportV2.marketing?.pricing?.base_rrc_rub ? `Базовая цена: ${passportV2.marketing.pricing.base_rrc_rub}` : "",
      passportV2.marketing?.pricing?.pricing_logic,
      Array.isArray(passportV2.marketing?.pricing?.models)
        ? `Модели: ${passportV2.marketing.pricing.models.join("; ")}`
        : ""
    ], "\n\n"))
  });

  marketing.push({
    no: "4.4",
    question: BLOCK_SCHEMAS.marketing[3].question,
    answer: cleanupAnswer(joinNonEmpty([
      Array.isArray(passportV2.marketing?.channels?.start) ? `Старт: ${passportV2.marketing.channels.start.join("; ")}` : "",
      Array.isArray(passportV2.marketing?.channels?.growth) ? `Рост: ${passportV2.marketing.channels.growth.join("; ")}` : "",
      Array.isArray(passportV2.marketing?.channels?.scale) ? `Масштаб: ${passportV2.marketing.channels.scale.join("; ")}` : ""
    ], "\n\n"))
  });

  marketing.push({
    no: "4.5",
    question: BLOCK_SCHEMAS.marketing[4].question,
    answer: cleanupAnswer(joinNonEmpty([
      Array.isArray(passportV2.marketing?.promotion?.low_budget) ? `Безбюджетные: ${passportV2.marketing.promotion.low_budget.join("; ")}` : "",
      Array.isArray(passportV2.marketing?.promotion?.testable) ? `Тестовые: ${passportV2.marketing.promotion.testable.join("; ")}` : "",
      Array.isArray(passportV2.marketing?.promotion?.scalable) ? `Масштабируемые: ${passportV2.marketing.promotion.scalable.join("; ")}` : ""
    ], "\n\n"))
  });

  const tech = [
    `Технологический процесс: ${
      Array.isArray(passportV2.production?.technology_process_steps)
        ? passportV2.production.technology_process_steps.map(x => `${x.step}: ${x.detail} (CCP: ${x.ccp})`).join("; ")
        : "[ПРЕДПОЛОЖЕНИЕ]"
    }`,
    `QC точки: ${Array.isArray(passportV2.production?.qc_checkpoints) ? passportV2.production.qc_checkpoints.join("; ") : "[ПРЕДПОЛОЖЕНИЕ]"}`,
    `Shelf-life: ${passportV2.production?.shelf_life_days || "[ПРЕДПОЛОЖЕНИЕ]"}; метод: ${passportV2.production?.shelf_life_method || "[ПРЕДПОЛОЖЕНИЕ]"}`,
    `Ограничения: ${Array.isArray(passportV2.production?.production_constraints) ? passportV2.production.production_constraints.join("; ") : "[ПРЕДПОЛОЖЕНИЕ]"}`,
    `Регуляторика: ${passportV2.regulatory?.legal_notes || "[ПРЕДПОЛОЖЕНИЕ]"}`
  ];

  const packaging = [
    `Материал: ${passportV2.production?.packaging_spec?.material || "[ПРЕДПОЛОЖЕНИЕ]"}`,
    `OTR: ${passportV2.production?.packaging_spec?.o2_transmission_rate || "[ПРЕДПОЛОЖЕНИЕ]"}`,
    `MVTR: ${passportV2.production?.packaging_spec?.moisture_transmission || "[ПРЕДПОЛОЖЕНИЕ]"}`,
    `Seal strength: ${passportV2.production?.packaging_spec?.seal_strength || "[ПРЕДПОЛОЖЕНИЕ]"}`,
    `Повторная покупка: ${Array.isArray(passportV2.appendices?.qa_checklist_template) ? passportV2.appendices.qa_checklist_template.join("; ") : "[ПРЕДПОЛОЖЕНИЕ]"}`
  ];

  const star = [
    passportV2.short_passport?.uniqueness || "",
    passportV2.cognitive_block?.consumption_change?.new_market || "",
    passportV2.cognitive_block?.consumption_change?.why_people_will_pay || "",
    passportV2.branding?.promise || "",
    passportV2.commerce?.unit_economics?.notes || ""
  ].map(cleanupAnswer).filter(Boolean);

  const conclusion = cleanupAnswer(joinNonEmpty([
    passportV2.conclusion?.why_viable ? `Почему жизнеспособен: ${passportV2.conclusion.why_viable}` : "",
    passportV2.conclusion?.best_first_test_market ? `Где тестировать сначала: ${passportV2.conclusion.best_first_test_market}` : "",
    Array.isArray(passportV2.conclusion?.first_things_to_validate)
      ? `Что проверять первым: ${passportV2.conclusion.first_things_to_validate.join("; ")}`
      : "",
    passportV2.conclusion?.next_step ? `Следующий шаг: ${passportV2.conclusion.next_step}` : ""
  ], "\n\n"));

  return {
    header: {
      category: passportV2.short_passport?.category || input.category,
      name: passportV2.short_passport?.name || "Новый продукт",
      audience: passportV2.short_passport?.audience || input.audienceSummary || input.audience,
      pain: passportV2.short_passport?.pain || input.pain,
      uniqueness: passportV2.short_passport?.uniqueness || ""
    },
    product_core: {
      one_liner: passportV2.short_passport?.one_liner || "",
      physical_form: passportV2.short_passport?.key_idea || "",
      appearance: passportV2.sensory_block?.visual?.desired_experience || "",
      composition: passportV2.marketing?.base_product || "",
      usage: Array.isArray(passportV2.cognitive_block?.rituals?.usage_contexts)
        ? passportV2.cognitive_block.rituals.usage_contexts.join("; ")
        : "",
      novelty_mechanism: passportV2.cognitive_block?.consumption_change?.new_market || "",
      why_people_will_try_it: passportV2.cognitive_block?.consumption_change?.why_people_will_pay || ""
    },
    blocks: {
      cognitive,
      sensory,
      branding,
      marketing
    },
    tech,
    packaging,
    star,
    conclusion
  };
}

// ======================================================
// REWRITE / FIX HELPERS
// ======================================================
async function fillMissingFields(originalRaw, missingFields, roleSystem, roleUserBase, temperature = 0.25) {
  const system = { role: "system", content: roleSystem };
  const user = { role: "user", content: `${roleUserBase}\n\nЗаполни недостающие поля: ${JSON.stringify(missingFields)}. Верни только JSON.` };
  const follow = await callTextModel([system, user], temperature);
  if (follow && typeof follow === "object") return Object.assign({}, originalRaw, follow);
  return originalRaw;
}

// ======================================================
// CORE PIPELINE
// ======================================================
async function createProductKernel(input) {
  const raw = await callTextModel(
    [
      { role: "system", content: buildProductKernelSystemPrompt() },
      { role: "user", content: buildProductKernelUserPrompt(input) }
    ],
    PRODUCT_TEMPERATURE
  );

  let kernel = raw && typeof raw === "object" ? raw : null;
  if (!kernel) kernel = hardFallbackKernel(input);

  const v = validateKernel(kernel);
  if (!v.ok) {
    const roleSystem = "Ты исправляешь слабый продуктовый kernel. Верни только JSON. Сделай его конкретным, новым и предметным.";
    const roleUserBase = joinNonEmpty([
      `Текущий kernel: ${JSON.stringify(kernel)}`,
      `Слабые или пустые поля: ${JSON.stringify(v.missing)}`,
      `Исходный запрос: ${JSON.stringify(input)}`
    ]);
    const filled = await fillMissingFields(kernel, v.missing, roleSystem, roleUserBase, 0.44);
    kernel = filled && typeof filled === "object" ? filled : kernel;
  }

  const v2 = validateKernel(kernel);
  if (!v2.ok) {
    console.warn("[kernel] still weak, fallback used:", v2.missing);
    kernel = Object.assign({}, hardFallbackKernel(input), kernel || {});
  }

  return kernel;
}

async function createName(kernel, input) {
  if (input.name && validateNaming(input.name)) return sanitizeText(input.name);

  const raw = await callTextModel(
    [
      { role: "system", content: buildNamingSystemPrompt() },
      { role: "user", content: buildNamingUserPrompt(kernel) }
    ],
    NAMING_TEMPERATURE
  );

  let options = [];
  if (Array.isArray(raw?.options)) options = raw.options;
  else if (Array.isArray(raw)) options = raw;

  for (const option of options) {
    const candidate = sanitizeText(option?.name || option?.title || option);
    if (validateNaming(candidate)) return candidate;
  }

  const retry = await callTextModel(
    [
      { role: "system", content: buildNamingSystemPrompt() },
      {
        role: "user",
        content: joinNonEmpty([
          buildNamingUserPrompt(kernel),
          "Первый ответ был слабым. Нужны более живые русские названия без шаблонов.",
          "Верни JSON."
        ])
      }
    ],
    0.84
  );

  let retryOptions = [];
  if (Array.isArray(retry?.options)) retryOptions = retry.options;
  else if (Array.isArray(retry)) retryOptions = retry;

  for (const option of retryOptions) {
    const candidate = sanitizeText(option?.name || option?.title || option);
    if (validateNaming(candidate)) return candidate;
  }

  const category = sanitizeText(kernel.invented_category || input.category).toLowerCase();
  if (/паштет/.test(category)) return "Сила роста";
  if (/снек|батончик/.test(category)) return "Умный старт";
  if (/завтрак/.test(category)) return "Утро без каши";
  if (/мяс/.test(category)) return "Чистый кус";
  return "Новая привычка";
}

async function createPassportV2(input, kernel, chosenName) {
  const raw = await callTextModel(
    [
      { role: "system", content: buildPassportSystemPrompt() },
      { role: "user", content: buildPassportUserPrompt(input, kernel, chosenName) }
    ],
    PASSPORT_TEMPERATURE
  );

  let passport = normalizePassportV2(raw || {}, input, kernel, chosenName);

  const v = validatePassportV2(passport);
  if (!v.ok) {
    const roleSystem = "Ты исправляешь слабый product passport. Верни только JSON в той же полной структуре.";
    const roleUserBase = joinNonEmpty([
      `Слабые или отсутствующие секции: ${JSON.stringify(v.missing)}`,
      `Текущий passport: ${JSON.stringify(passport)}`
    ]);
    const filled = await fillMissingFields(passport, v.missing, roleSystem, roleUserBase, 0.28);
    passport = normalizePassportV2(filled || passport, input, kernel, chosenName);
  }

  passport = await rewriteWeakSectionsV2(passport);
  return passport;
}

// ======================================================
// PUBLIC RUN
// ======================================================
async function runGenerate(body = {}) {
  const input = normalizeInput(body);
  const include = normalizeInclude(body);

  const kernel = await createProductKernel(input);
  const chosenName = await createName(kernel, input);
  const passportV2 = await createPassportV2(input, kernel, chosenName);
  const legacy = buildLegacyProjection(passportV2, input);

  return {
    ...legacy,
    passport_v2: passportV2,
    generated_name: chosenName,
    generated_kernel: kernel,
    include
  };
}

// ======================================================
// EXPORTS
// ======================================================
module.exports = runGenerate;
module.exports.runGenerate = runGenerate;
module.exports.default = runGenerate;
module.exports.normalizeInput = normalizeInput;
module.exports.normalizeInclude = normalizeInclude;
module.exports.createProductKernel = createProductKernel;
module.exports.createName = createName;
module.exports.createPassportV2 = createPassportV2;
module.exports.buildLegacyProjection = buildLegacyProjection;