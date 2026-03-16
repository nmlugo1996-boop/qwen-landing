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
const PASSPORT_TEMPERATURE = 0.32;
const REWRITE_TEMPERATURE = 0.28;
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
  "KitKat", "Pringles", "Lush", "ВкусВилл", "IKEA", "Tinkoff"
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
const PASSPORT_SCHEMA_REFERENCE = truncateText(safeReadAny("passport_schema.json"), 2600);
const STYLE_EXAMPLES_REFERENCE = truncateText(loadStyleReferences(9000), 9000);

const STYLE_REFERENCE = joinNonEmpty([
  PASSPORT_PROMPT_REFERENCE ? `Prompt reference:\n${PASSPORT_PROMPT_REFERENCE}` : "",
  PASSPORT_SCHEMA_REFERENCE ? `Schema reference:\n${PASSPORT_SCHEMA_REFERENCE}` : "",
  STYLE_EXAMPLES_REFERENCE ? `Style examples:\n${STYLE_EXAMPLES_REFERENCE}` : ""
]);

try {
  console.log("[refs] STYLE_REFERENCE len:", STYLE_REFERENCE.length);
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
  if (s.length < 3 || s.length > 28) return true;
  if (BAD_NAME_PATTERNS.some(re => re.test(s))) return true;
  return false;
}

function hasConcreteMarkers(text) {
  const s = sanitizeText(text);
  if (!s) return false;
  const hasDigits = /\d/.test(s);
  const hasQuotes = /«|»|"/.test(s);
  const hasBrandHints = CONCRETE_BRAND_HINTS.some(b => s.includes(b));
  const hasArrowOrTableLike = /→|≥|₽|ккал|г\b|шт\b|дн\b/i.test(s);
  return hasDigits || hasQuotes || hasBrandHints || hasArrowOrTableLike;
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

    try { console.log("[generate] raw head:", rawText.slice(0, 1600)); } catch (_) {}

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
// INPUT NORMALIZATION
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
      segments.push("потребители, у которых есть конкретная бытовая боль, не решённая текущими продуктами категории");
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
    "Твоя задача: придумать действительно НОВЫЙ продукт, который ощущается как новая подкатегория, новый ритуал и новая коммерческая возможность.",
    "Нельзя делать слабую вариацию существующего товара.",
    "Плохие решения: 'умная упаковка', 'контролируемая порция', 'современный дизайн', 'новый ритуал' без конкретики.",
    "Продукт должен отвечать на вопросы:",
    "1) Что именно нового появилось в модели потребления?",
    "2) Почему этого реально нет или почти нет на рынке в массовом виде?",
    "3) Что в продукте предметно нового: текстура, формат, ритуал, комбинация пользы и сценария, формат упаковки, способ употребления?",
    "4) Почему за это будут платить?",
    "5) Почему это можно пилотировать как FMCG / food / wellness / convenience продукт?",
    "",
    "ОБЯЗАТЕЛЬНО:",
    "- Пиши по-русски.",
    "- Никакой латиницы в названии.",
    "- Никаких шаблонов 'мега', 'супер', 'про'.",
    "- Никаких общих фраз.",
    "- Если даёшь цифры без точного подтверждения, помечай [ПРЕДПОЛОЖЕНИЕ].",
    "",
    "ВЕРНИ СТРОГО JSON:",
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
        calories_kcal: "number_or_string",
        price_rub: "string",
        shelf_life_days: "number_or_string"
      }
    }, null, 2),
    "",
    "Критерий хорошего ответа: после чтения должно возникать ощущение 'да, это реально новая продуктовая идея, а не просто переупаковка существующего'.",
    STYLE_REFERENCE
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
    "Запрещено возвращать абстрактные фразы.",
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
    `Продуктовый формат: ${sanitizeText(kernel.product_format)}`,
    `Ритуалы: ${normalizeList(kernel.new_rituals).join("; ")}`,
    "",
    "Дай хорошие русские названия. Без мусора. Без машинного шаблона.",
    "Верни только JSON."
  ]);
}

function buildPassportSystemPrompt(enabledSchemas, include) {
  const mandatoryLines = [];
  Object.entries(enabledSchemas).forEach(([key, items]) => {
    items.forEach(item => mandatoryLines.push(`${key}.${item.no}: ${item.question}`));
  });

  const extras = [];
  if (include.tech !== false) extras.push("tech");
  if (include.packaging !== false) extras.push("packaging");
  if (include.star !== false) extras.push("star");
  if (include.conclusion !== false) extras.push("conclusion");

  return joinNonEmpty([
    "Ты — сильный бренд-стратег, продуктовый маркетолог, category designer и R&D-концептолог.",
    "Твоя задача: на основе уже придуманного НОВОГО продукта написать глубокий когнитивно-сенсорный паспорт уровня сильного стратегического документа.",
    "Ориентир качества: глубина и ощущение кейса уровня 'Шоковсянка' / 'МЯСОВОЙ КОД'.",
    "",
    "ЖЁСТКИЕ ТРЕБОВАНИЯ:",
    "1) Не скатывайся в общие фразы.",
    "2) Не повторяй шаблонные клише: 'решает реальную боль', 'современный дизайн', 'инновационная упаковка', 'новый ритуал' без объяснения.",
    "3) Каждый ответ должен содержать:",
    "   - что именно это такое,",
    "   - почему это работает,",
    "   - как это проявляется в реальном сценарии потребления,",
    "   - где уместно: цифры / KPI / цены / сроки / примеры каналов / примеры брендов.",
    "4) Для когнитивных и брендинговых пунктов: минимум 120 слов на каждый пункт.",
    "5) Для сенсорных пунктов: минимум 90 слов на каждый пункт + измеримый маркер / критерий теста.",
    "6) Пиши живо, предметно, коммерчески.",
    "7) Используй конкретные названия каналов, сетей, площадок, брендов там, где это уместно.",
    "8) Все предположения помечай как [ПРЕДПОЛОЖЕНИЕ].",
    "",
    "НУЖЕН ИМЕННО НОВЫЙ ПРОДУКТ, А НЕ РАЗДУТАЯ ВЕРСИЯ СУЩЕСТВУЮЩЕГО SKU.",
    "",
    "Верни строго JSON.",
    mandatoryLines.length ? `Обязательные вопросы:\n${mandatoryLines.join("\n")}` : "",
    extras.length ? `Дополнительные секции: ${extras.join(", ")}` : "",
    STYLE_REFERENCE
  ]);
}

function buildPassportUserPrompt(input, kernel, chosenName, include) {
  return joinNonEmpty([
    "Разверни этот продукт в сильный структурный паспорт.",
    JSON.stringify({
      kernel,
      chosen_name: chosenName,
      user_input: {
        category: input.category,
        audience: input.audienceSummary || input.audience,
        pain: input.pain,
        comment: input.comment,
        innovation: input.innovation
      },
      include
    }, null, 2)
  ]);
}

function buildRewriteSystemPrompt() {
  return joinNonEmpty([
    "Ты — редактор стратегических продуктовых документов.",
    "Твоя задача: переписать слабые, шаблонные или короткие фрагменты так, чтобы они стали сильными, конкретными и живыми.",
    "Запрещено оставлять общие фразы.",
    "Если в тексте есть мусор вроде 'современный дизайн' или 'новый ритуал' без объяснения, надо переписать содержательно.",
    "Верни строго JSON."
  ]);
}

// ======================================================
// OUTPUT SHAPE HELPERS
// ======================================================
function defaultPassportsBlocks(concept) {
  return {
    cognitive: [
      { no: "1.1", question: "Какую потребительскую боль используем для создания дизрапта?", answer: concept.consumer_tension || "" },
      { no: "1.2", question: "Изменение модели потребления: какой новый рынок открываем? Какую новую дополнительную монетизируемую ценность предлагаем?", answer: concept.new_market || "" },
      { no: "1.3", question: "Изменение технологии потребления: какие новые привычки и ритуалы потребления внедряем?", answer: normalizeList(concept.new_rituals).join("\n") },
      { no: "1.4", question: "Нарративы: как объясняем, что инновация нужна, полезна, выгодна?", answer: "" },
      { no: "1.5", question: "Какие способы, каналы и приёмы обучения потребителей используем?", answer: "" }
    ],
    sensory: [
      { no: "2.1", question: "Сильный визуальный образ", answer: concept?.sensory_hooks?.visual || "" },
      { no: "2.2", question: "Сильный аудиальный образ", answer: concept?.sensory_hooks?.audio || "" },
      { no: "2.3", question: "Сильный обонятельный образ", answer: concept?.sensory_hooks?.smell || "" },
      { no: "2.4", question: "Сильный осязательный образ", answer: concept?.sensory_hooks?.tactile || "" },
      { no: "2.5", question: "Сильный вкусовой образ", answer: concept?.sensory_hooks?.taste || "" }
    ],
    branding: [
      { no: "3.1", question: "Сильная история и обещание бренда: как улучшаем личную историю и самоидентификацию потребителя?", answer: "" },
      { no: "3.2", question: "Какой контекст поможет развить бренд? Какой помешает?", answer: "" },
      { no: "3.3", question: "Сильное ядро бренда: название, логотип, слоган, уникальные дополнительные атрибуты", answer: "" },
      { no: "3.4", question: "Уникальный путь клиента с продуктом и брендом", answer: "" },
      { no: "3.5", question: "Стратегия развития бренда на 3–5–10 лет", answer: "" }
    ],
    marketing: [
      { no: "4.1", question: "Сегментация / Позиционирование", answer: "" },
      { no: "4.2", question: "Описание базового продукта и его развитие во времени", answer: "" },
      { no: "4.3", question: "Развитие ценообразования", answer: "" },
      { no: "4.4", question: "Развитие каналов сбыта", answer: "" },
      { no: "4.5", question: "Продвижение (с фокусом на безбюджетный маркетинг)", answer: "" }
    ]
  };
}

function extractBlock(rawDraft, key) {
  if (!rawDraft || typeof rawDraft !== "object") return null;
  const cand = rawDraft.blocks?.[key] ?? rawDraft[key];
  if (Array.isArray(cand) || (cand && typeof cand === "object")) return cand;
  return null;
}

function matchesNo(entry, no) {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry.no || entry.code || entry.number;
  return candidate ? String(candidate).trim() === no : false;
}

function extractAnswer(rawBlock, item, index) {
  if (!rawBlock) return "";
  if (Array.isArray(rawBlock)) {
    const byNo = rawBlock.find(r => matchesNo(r, item.no));
    if (byNo) return sanitizeText(byNo.answer ?? byNo.value ?? byNo.text ?? byNo);
    if (rawBlock[index] !== undefined) return sanitizeText(rawBlock[index]);
    return "";
  }
  if (typeof rawBlock === "object") {
    if (rawBlock[item.no] !== undefined) return sanitizeText(rawBlock[item.no]);
    if (rawBlock[item.question] !== undefined) return sanitizeText(rawBlock[item.question]);
  }
  return "";
}

function normalizeMeaningfulText(value, fallback = "") {
  const cleaned = cleanupAnswer(value);
  if (!cleaned) return cleanupAnswer(fallback);
  if (hasBannedGeneric(cleaned) && wordCount(cleaned) < 40) return cleanupAnswer(fallback);
  return cleaned;
}

function normalizeFinalDraft(rawDraft, input, include, concept, chosenName) {
  const enabled = getEnabledSchemas(include);
  const fallbackBlocks = defaultPassportsBlocks(concept);

  const draft = {
    header: {
      category: pickNonEmpty(rawDraft?.header?.category, concept.invented_category, input.category),
      name: pickNonEmpty(rawDraft?.header?.name, chosenName, input.name),
      audience: pickNonEmpty(rawDraft?.header?.audience, input.audienceSummary || input.audience),
      pain: pickNonEmpty(rawDraft?.header?.pain, concept.consumer_tension, input.pain),
      uniqueness: normalizeMeaningfulText(
        rawDraft?.header?.uniqueness,
        concept.product_thesis || concept.why_new || ""
      )
    },
    product_core: {
      one_liner: normalizeMeaningfulText(
        rawDraft?.product_core?.one_liner,
        concept.product_thesis || ""
      ),
      physical_form: normalizeMeaningfulText(
        rawDraft?.product_core?.physical_form,
        concept.physical_form || concept.product_format || ""
      ),
      appearance: normalizeMeaningfulText(
        rawDraft?.product_core?.appearance,
        concept?.sensory_hooks?.visual || ""
      ),
      composition: normalizeMeaningfulText(
        rawDraft?.product_core?.composition,
        concept.composition_logic || ""
      ),
      usage: normalizeMeaningfulText(
        rawDraft?.product_core?.usage,
        normalizeList(concept.usage_scenarios).join("\n")
      ),
      novelty_mechanism: normalizeMeaningfulText(
        rawDraft?.product_core?.novelty_mechanism,
        concept.breakthrough_mechanism || concept.why_new || ""
      ),
      why_people_will_try_it: normalizeMeaningfulText(
        rawDraft?.product_core?.why_people_will_try_it,
        concept.why_people_will_pay || ""
      )
    },
    blocks: {},
    comment: input.comment,
    diagnostics: input.diagnostics,
    uniqueness: normalizeMeaningfulText(
      rawDraft?.uniqueness || rawDraft?.header?.uniqueness,
      concept.product_thesis || ""
    )
  };

  Object.entries(enabled).forEach(([key, items]) => {
    const rawBlock = extractBlock(rawDraft, key);
    draft.blocks[key] = items.map((item, index) => ({
      no: item.no,
      question: item.question,
      answer: normalizeMeaningfulText(
        extractAnswer(rawBlock, item, index),
        fallbackBlocks[key]?.find(x => x.no === item.no)?.answer || ""
      )
    }));
  });

  if (include.tech !== false) {
    draft.tech = normalizeList(
      rawDraft?.tech,
      [
        `Ключевая технологическая идея: ${concept.composition_logic || "[ПРЕДПОЛОЖЕНИЕ]"}.`,
        `Производственная логика: ${concept.breakthrough_mechanism || "[ПРЕДПОЛОЖЕНИЕ]"}.`,
        `Срок годности: ${sanitizeText(concept?.rough_numbers?.shelf_life_days) || "[ПРЕДПОЛОЖЕНИЕ]"} дней [ПРЕДПОЛОЖЕНИЕ].`
      ]
    );
  }

  if (include.packaging !== false) {
    draft.packaging = normalizeList(
      rawDraft?.packaging,
      [
        `Форм-фактор: ${concept.product_format || concept.physical_form || "[ПРЕДПОЛОЖЕНИЕ]"}.`,
        `Логика порции: ${concept.portion_logic || "[ПРЕДПОЛОЖЕНИЕ]"}.`,
        `Упаковка должна усиливать ритуал: ${normalizeList(concept.usage_scenarios).slice(0, 2).join("; ") || "[ПРЕДПОЛОЖЕНИЕ]"}.`
      ]
    );
  }

  if (include.star !== false) {
    draft.star = normalizeList(
      rawDraft?.star,
      [
        `Продукт открывает подкатегорию: ${concept.new_market || "[ПРЕДПОЛОЖЕНИЕ]"}.`,
        `У продукта есть новый ритуал: ${normalizeList(concept.new_rituals).slice(0, 2).join("; ") || "[ПРЕДПОЛОЖЕНИЕ]"}.`,
        `Есть дополнительная ценность: ${normalizeList(concept.monetizable_value).slice(0, 2).join("; ") || "[ПРЕДПОЛОЖЕНИЕ]"}.`
      ]
    );
  }

  if (include.conclusion !== false) {
    draft.conclusion = normalizeMeaningfulText(
      rawDraft?.conclusion,
      `${chosenName} — новый продукт с отдельной потребительской логикой, новым ритуалом и коммерческим потенциалом.`
    );
  }

  return draft;
}

// ======================================================
// VALIDATION
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

function validateDraftQuality(draft) {
  if (!draft || typeof draft !== "object") return { ok: false, weak: ["object"] };
  const weak = [];

  if (!draft.header || wordCount(draft.header.name) < 1) weak.push("header.name");
  if (!draft.product_core || wordCount(draft.product_core.one_liner) < 12) weak.push("product_core.one_liner");
  if (wordCount(draft.product_core.novelty_mechanism) < 18) weak.push("product_core.novelty_mechanism");
  if (!draft.blocks || typeof draft.blocks !== "object") weak.push("blocks");

  for (const [blockKey, items] of Object.entries(draft.blocks || {})) {
    if (!Array.isArray(items)) continue;
    items.forEach(item => {
      const wc = wordCount(item.answer);
      const tooShort = blockKey === "sensory" ? wc < 45 : wc < 60;
      if (tooShort) weak.push(`${blockKey}.${item.no}.too_short`);
      if (hasBannedGeneric(item.answer) && wc < 50) weak.push(`${blockKey}.${item.no}.generic`);
    });
  }

  return { ok: weak.length === 0, weak };
}

// ======================================================
// REWRITE HELPERS
// ======================================================
async function fillMissingFields(originalRaw, missingFields, roleSystem, roleUserBase, temperature = 0.25) {
  const system = { role: "system", content: roleSystem };
  const user = { role: "user", content: `${roleUserBase}\n\nЗаполни недостающие поля: ${JSON.stringify(missingFields)}. Верни только JSON.` };
  const follow = await callTextModel([system, user], temperature);
  if (follow && typeof follow === "object") return Object.assign({}, originalRaw, follow);
  return originalRaw;
}

async function rewriteWeakSections(draftObj, include) {
  const weak = [];

  for (const [blockKey, items] of Object.entries(draftObj.blocks || {})) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const wc = wordCount(item.answer);
      const tooShort = blockKey === "sensory" ? wc < 45 : wc < 60;
      const generic = hasBannedGeneric(item.answer);
      if (tooShort || generic) {
        weak.push({
          block: blockKey,
          no: item.no,
          question: item.question,
          answer: item.answer
        });
      }
    }
  }

  if (!weak.length) return draftObj;

  const rewriteInstructions = weak.map(w => (
    `- ${w.block}.${w.no} (${w.question})\n` +
    `Текущий слабый текст: ${sanitizeText(w.answer)}\n` +
    `Перепиши так, чтобы было: что это / почему это работает / пример сценария / если уместно KPI или конкретный маркер.`
  )).join("\n\n");

  const follow = await callTextModel([
    { role: "system", content: buildRewriteSystemPrompt() },
    {
      role: "user",
      content: joinNonEmpty([
        "Вот текущий draft в укороченном виде:",
        JSON.stringify({
          header: draftObj.header,
          product_core: draftObj.product_core,
          weak_sections: weak
        }, null, 2),
        "",
        "Верни JSON в формате:",
        JSON.stringify({
          blocks: {
            cognitive: [{ no: "1.1", answer: "..." }],
            sensory: [{ no: "2.1", answer: "..." }],
            branding: [{ no: "3.1", answer: "..." }],
            marketing: [{ no: "4.1", answer: "..." }]
          }
        }, null, 2)
      ])
    }
  ], REWRITE_TEMPERATURE);

  if (!follow || typeof follow !== "object") return draftObj;

  const cloned = JSON.parse(JSON.stringify(draftObj));
  const followBlocks = follow.blocks || {};
  for (const [bkey, items] of Object.entries(followBlocks)) {
    if (!Array.isArray(items) || !Array.isArray(cloned.blocks?.[bkey])) continue;
    items.forEach(newItem => {
      const target = cloned.blocks[bkey].find(x => String(x.no) === String(newItem.no));
      if (!target) return;
      const nextAnswer = cleanupAnswer(newItem.answer);
      if (wordCount(nextAnswer) > wordCount(target.answer)) {
        target.answer = nextAnswer;
      }
    });
  }
  return cloned;
}

// ======================================================
// FALLBACKS (minimal, not generic trash)
// ======================================================
function hardFallbackKernel(input) {
  return {
    invented_category: `${input.category} с новым сценарием потребления`,
    product_thesis: `[ПРЕДПОЛОЖЕНИЕ] Продукт переопределяет категорию через новый ритуал, новую текстурную/форматную логику и дополнительную эмоциональную ценность.`,
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
      calories_kcal: "[ПРЕДПОЛОЖЕНИЕ] 120–220",
      price_rub: "[ПРЕДПОЛОЖЕНИЕ] 119–199 ₽",
      shelf_life_days: "[ПРЕДПОЛОЖЕНИЕ] 90–180"
    }
  };
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
  if (Array.isArray(raw?.options)) {
    options = raw.options;
  } else if (Array.isArray(raw)) {
    options = raw;
  }

  for (const option of options) {
    const candidate = sanitizeText(option?.name || option?.title || option);
    if (validateNaming(candidate)) return candidate;
  }

  // если всё плохо — просим ещё раз кратко
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

  // последний мягкий fallback
  const category = sanitizeText(kernel.invented_category || input.category).toLowerCase();
  if (/паштет/.test(category)) return "Сила роста";
  if (/снек|батончик/.test(category)) return "Умный старт";
  if (/завтрак/.test(category)) return "Утро без каши";
  if (/мяс/.test(category)) return "Чистый кус";
  return "Новая привычка";
}

async function createPassportDraft(input, include, kernel, chosenName) {
  const raw = await callTextModel(
    [
      { role: "system", content: buildPassportSystemPrompt(getEnabledSchemas(include), include) },
      { role: "user", content: buildPassportUserPrompt(input, kernel, chosenName, include) }
    ],
    PASSPORT_TEMPERATURE
  );

  const normalized = normalizeFinalDraft(raw || {}, input, include, kernel, chosenName);
  const rewritten = await rewriteWeakSections(normalized, include);
  return rewritten;
}

// ======================================================
// PUBLIC RUN
// ======================================================
async function runGenerate(body = {}) {
  const input = normalizeInput(body);
  const include = normalizeInclude(body);

  const kernel = await createProductKernel(input);
  const chosenName = await createName(kernel, input);
  const draft = await createPassportDraft(input, include, kernel, chosenName);

  const quality = validateDraftQuality(draft);
  if (!quality.ok) {
    console.warn("[draft] weak sections detected:", quality.weak);
  }

  return draft;
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
module.exports.createPassportDraft = createPassportDraft;