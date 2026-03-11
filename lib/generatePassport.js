// lib/generatePassport.js
const fs = require("fs");
const path = require("path");
const fetch = global.fetch || require("cross-fetch");

// --- НАСТРОЙКИ ---
const REF_DIRS = [
  path.join(process.cwd(), "reference"),
];

// ⚡ ПАРАМЕТРЫ (настройте при необходимости)
const MAX_REFERENCE_CHARS = 2000;
const CONCEPT_TEMPERATURE = 0.50;
const PASSPORT_TEMPERATURE = 0.18;
const REQUEST_TIMEOUT_MS = 23000; // ms

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

// запрещённые паттерны (имена/клише)
const BAD_NAME_PATTERNS = [
  "верный вкус", "сильный выбор", "живой выбор", "сочный выбор", "добрый вкус",
  "новада", "медальонка", "сырникет"
];
const BAD_PHRASES = [
  "занятые потребители","понятная выгода","удобный формат","новый и удобный",
  "видимый отличительный признак","законченные элементы","понятная геометрия",
  "пустые фразы","placeholder","важно продумать","нужно продумать","можно сделать","нужно сделать"
];

// ----------------- помощники для чтения референсов -----------------
function safeReadAny(...relativePaths) {
  for (const rel of relativePaths) {
    for (const dir of REF_DIRS) {
      const full = path.join(dir, rel);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return fs.readFileSync(full, "utf8");
      }
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

// Основной эталон: используем только passport_prompt.txt (+ опционально schema)
const PASSPORT_PROMPT_REFERENCE = truncateText(safeReadAny("passport_prompt.txt"), 8000);
const PASSPORT_SCHEMA_REFERENCE = truncateText(safeReadAny("passport_schema.json"), 2200);
// Сформируем компактный STYLE_REFERENCE (минимальный: prompt + schema)
const STYLE_REFERENCE = joinNonEmpty([
  PASSPORT_PROMPT_REFERENCE ? `Prompt reference:\n${PASSPORT_PROMPT_REFERENCE}` : "",
  PASSPORT_SCHEMA_REFERENCE ? `Schema reference:\n${PASSPORT_SCHEMA_REFERENCE}` : ""
]);

try {
  console.log("[refs] STYLE_REFERENCE len:", (STYLE_REFERENCE || "").length);
  console.log("[refs] STYLE_REFERENCE head:", (STYLE_REFERENCE || "").slice(0, 400).replace(/\n/g, " "));
} catch (e) {
  // noop
}

// ----------------- утилиты по очистке и парсингу -----------------
function sanitizeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    return value.replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/[ \u00A0]+/g, " ").replace(/\n{3,}/g, "\n").trim();
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(sanitizeText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return sanitizeText(value.answer ?? value.value ?? value.text ?? value.content ?? value.description ?? value.response ?? "");
  }
  return "";
}
function cleanupAnswer(text) {
  return sanitizeText(text).replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n").replace(/\.{2,}/g, ".").trim();
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
      cleaned.split(/\n+/).map(p => p.replace(/^[\-•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean).forEach(p => result.push(p));
    }
  }
  return uniqueList(result.length ? result : fallback);
}

// JSON helper
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

// ----------------- include/schema helpers -----------------
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

// ----------------- API / call to model -----------------
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

  // логирование первых частей prompt для дебага
  try {
    const sys = (messages.find(m => m.role === "system") || {}).content || "";
    const usr = (messages.find(m => m.role === "user") || {}).content || "";
    console.log("[prompt] SYSTEM:", String(sys).slice(0, 400));
    console.log("[prompt] USER:", String(usr).slice(0, 400));
  } catch (e) {}

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
        top_p: 0.9,
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
    // для отладки можно логировать первые 2000 символов:
    try { console.log("[generate] rawText head:", rawText.slice(0, 2000)); } catch(e){}
    const parsed = safeParseJson(rawText);
    const content = parsed?.choices?.[0]?.message?.content ?? parsed?.choices?.[0]?.text ?? rawText;
    return extractFirstJson(content) || extractFirstJson(rawText);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error("[generate] Request timeout (>", REQUEST_TIMEOUT_MS, "ms )");
    } else {
      console.error("[generate] request failed", error);
    }
    return null;
  }
}

// ----------------- бизнес-логика -----------------
function containsLatin(text) { return /[A-Za-z]/.test(String(text || "")); }

function fallbackNameFromCategory(category) {
  const lower = sanitizeText(category).toLowerCase();
  const prefixes = ["Супер","Мега","Ультра","Про","Макси","Мини","Эко","Био","Фит","Фреш"];
  const suffixes = ["Лайт","Плюс","Макс","Про","Гурме","Дели","Фуд","Снак","Бит","Го"];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  if (/колбас/.test(lower)) return `${randomPrefix}Колбас${randomSuffix}`;
  if (/паштет/.test(lower)) return `${randomPrefix}Паштет${randomSuffix}`;
  if (/сыр/.test(lower)) return `${randomPrefix}Сыр${randomSuffix}`;
  if (/снек|батончик|перекус/.test(lower)) return `${randomPrefix}Снек${randomSuffix}`;
  if (/сардел/.test(lower)) return `${randomPrefix}Сардел${randomSuffix}`;
  if (/сало/.test(lower)) return `${randomPrefix}Сало${randomSuffix}`;
  if (/детск/.test(lower)) return `${randomPrefix}Дет${randomSuffix}`;
  if (/спорт|фитнес|белок/.test(lower)) return `${randomPrefix}Спорт${randomSuffix}`;
  return `${randomPrefix}Продукт${randomSuffix}`;
}

function normalizeName(name, category) {
  const cleaned = String(name || "").replace(/[«»"']/g,"").replace(/[^А-Яа-яЁё0-9\s\-]/g," ").replace(/\s+/g," ").trim();
  if (!cleaned || containsLatin(cleaned)) return fallbackNameFromCategory(category);
  if (BAD_NAME_PATTERNS.includes(cleaned.toLowerCase())) return fallbackNameFromCategory(category);
  return cleaned;
}

function compressAudience(input) {
  const rawAudience = [];
  if (Array.isArray(input.audienceList)) rawAudience.push(...input.audienceList);
  if (sanitizeText(input.audience)) rawAudience.push(...sanitizeText(input.audience).split(/[,;]+/));
  const joined = rawAudience.join(" ").toLowerCase();
  const segments = [];
  if (/(семь|родител|дет|дом|школ)/.test(joined)) segments.push("семьи с детьми, которым нужен быстрый и понятный продукт без лишней подготовки");
  if (/(офис|работ|дорог|перекус|машин|метро|с собой)/.test(joined)) segments.push("занятые взрослые, которым нужен удобный продукт для дороги, офиса или быстрого перекуса");
  if (/(спорт|фитнес|зал|белок)/.test(joined)) segments.push("активные взрослые, которым нужен функциональный продукт с понятной пользой");
  if (/(60\+|пожил|мягк|жеван|глот)/.test(joined)) segments.push("пожилые потребители, которым важны мягкость, удобство и простота использования");
  if (!segments.length) {
    const comment = `${sanitizeText(input.comment)} ${sanitizeText(input.pain)}`.toLowerCase();
    if (/(семь|дет|дом)/.test(comment)) segments.push("семьи с детьми, которым нужен быстрый и аккуратный продукт для дома");
    else segments.push("занятые потребители, которым нужен новый и удобный продукт с понятной выгодой");
  }
  return uniqueList(segments).join("; ");
}

function normalizeInput(body) {
  const source = body && typeof body.form === "object" && body.form !== null ? body.form : body || {};
  const category = sanitizeText(source.category);
  const audienceList = Array.isArray(source.audience) ? source.audience.map(i=>sanitizeText(i)).filter(Boolean) :
    sanitizeText(source.audience) ? sanitizeText(source.audience).split(/[,;]+/).map(i=>i.trim()).filter(Boolean) : [];
  const painsArray = Array.isArray(source.pains) ? source.pains.map(i=>sanitizeText(i)).filter(Boolean) : [];

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

// ----------------- конструкция prompt'ов -----------------
function buildConceptSystemPrompt() {
  return joinNonEmpty([
    "Ты — продуктовый стратег и инженер продуктовой формы. Твоя задача — СФОРМИРОВАТЬ ОДИН ЕДИНСТВЕННЫЙ НОВЫЙ ПРОДУКТ (предметный объект), который можно описать, нарисовать и выпустить.",
    "ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ:",
    "1) ОПИСАНИЕ ФОРМЫ: точные габариты/вес/форма/физическая структура (например: 'пластина 90×40×4 мм, 40 г').",
    "2) СОСТАВ И ЦИФРЫ: белок/жиры/углеводы на порцию, калории, ориентир цены (в рублях).",
    "3) НОВИЗНА: почему предмет нельзя свести к существующим SKU.",
    "4) РИТУАЛ: 2–3 конкретных сценария использования (где, когда, как человек ест).",
    "5) СЕНСОРИКА: визуал, звук открытия, запах, текстура, вкусовые ноты.",
    "6) НАЗВАНИЕ: кириллица, 1–3 слова, объясните происхождение названия одной фразой.",
    "7) ВЕРНИ СТРОГО JSON С ПОЛЯМИ (всегда):",
    '{"name":string,"category":string,"one_liner":string,"physical_form":string,"weight_g":number,"protein_g":number,"calories":number,"price_rub":string,"usage_scenarios":string[],"appearance":string,"sound":string,"aroma":string,"texture":string,"composition":string,"novelty_mechanism":string,"why_people_will_try_it":string,"packaging":string,"shelf_life_days":number}',
    "8) ЕСЛИ ЧЕГО-ТО НЕТ — ВЕРНИ {\"error\":\"FIELD_MISSING\",\"fields\":[...]}.",
    STYLE_REFERENCE
  ]);
}

function buildConceptUserMessage(input) {
  return joinNonEmpty([
    `Категория: ${input.category || "-"}`,
    `Целевая аудитория: ${input.audienceSummary || input.audience || "-"}`,
    `Потребительская боль: ${input.pain || "-"}`,
    `Комментарий: ${input.comment || "-"}`,
    `Уникальность / пожелание: ${input.innovation || "-"}`,
    input.name ? `Если возможно, учти желаемое название: ${input.name}` : "Название придумай сам",
    "Сделай продукт таким, чтобы его можно было показать на полке, объяснить в одной фразе и превратить в маркетинговый паспорт.",
    "ВЕРНИ ТОЛЬКО JSON."
  ], "\n");
}

function buildPassportSystemPrompt(enabledSchemas, include) {
  const mandatoryLines = [];
  Object.entries(enabledSchemas).forEach(([key, items]) => items.forEach(item => mandatoryLines.push(`${key}.${item.no}: ${item.question}`)));
  const extra = [];
  if (include.tech !== false) extra.push("tech");
  if (include.packaging !== false) extra.push("packaging");
  if (include.star !== false) extra.push("star");
  if (include.conclusion !== false) extra.push("conclusion");

  return joinNonEmpty([
    "Ты — старший продуктовый менеджер и бренд-стратег. Разверни предоставленный концепт в подробный когнитивно-сенсорный паспорт.",
    "ТРЕБОВАНИЯ: конкретика, числа, предметность, тестовые метрики для сенсорики.",
    "ВЕРНИ СТРОГО JSON (passport_schema.json) — НИЧЕГО КРОМЕ JSON.",
    mandatoryLines.length ? `Обязательные вопросы:\n${mandatoryLines.join("\n")}` : "",
    extra.length ? `Доп. секции: ${extra.join(", ")}` : "",
    STYLE_REFERENCE
  ]);
}

function buildPassportUserMessage(input, concept, include) {
  return joinNonEmpty([
    "Разверни концепт в сильный паспорт. Пиши конкретно, с цифрами и сценарием.",
    JSON.stringify({
      header: { category: concept.category, name: concept.name, audience: concept.audience, pain: concept.pain, uniqueness: concept.uniqueness },
      product_core: {
        one_liner: concept.one_liner, physical_form: concept.physical_form, appearance: concept.appearance,
        composition: concept.composition, usage: concept.usage, novelty_mechanism: concept.novelty_mechanism, why_people_will_try_it: concept.why_people_will_try_it
      },
      concept_meta: {
        new_market: concept.new_market, replacement_logic: concept.replacement_logic, ritual: concept.ritual,
        packaging: concept.packaging, lineup: concept.lineup, price_corridor: concept.price_corridor,
        visual_code: concept.visual_code, sound_code: concept.sound_code, aroma_code: concept.aroma_code,
        tactile_code: concept.tactile_code, taste_code: concept.taste_code, channels: concept.channels,
        launch_hook: concept.launch_hook, education_hook: concept.education_hook, technology: concept.technology
      },
      user_input: { category: input.category, audience: input.audienceSummary || input.audience, pain: input.pain, comment: input.comment, innovation: input.innovation },
      include
    })
  ]);
}

// ----------------- валидации -----------------
function validateConceptObject(obj) {
  if (!obj || typeof obj !== "object") return { ok: false, missing: ["object"] };
  const required = ["name","physical_form","weight_g","protein_g","calories","price_rub","one_liner"];
  const missing = [];
  for (const k of required) {
    if (obj[k] === undefined || obj[k] === null || String(obj[k]).trim().length < 2) missing.push(k);
  }
  if (obj.weight_g && (obj.weight_g < 5 || obj.weight_g > 1000)) missing.push("weight_g_range");
  if (obj.protein_g && (obj.protein_g < 1 || obj.protein_g > 400)) missing.push("protein_g_range");
  return { ok: missing.length === 0, missing };
}

function validatePassportObject(obj) {
  if (!obj || typeof obj !== "object") return { ok: false, missing: ["object"] };
  const missing = [];
  if (!obj.header) missing.push("header");
  if (!obj.product_core) missing.push("product_core");
  const pc = obj.product_core || {};
  if (!pc.one_liner || String(pc.one_liner).trim().length < 10) missing.push("product_core.one_liner");
  if (!pc.physical_form || String(pc.physical_form).trim().length < 10) missing.push("product_core.physical_form");
  if (!obj.blocks) missing.push("blocks");
  return { ok: missing.length === 0, missing };
}

// ----------------- follow-up helper -----------------
async function fillMissingFields(originalRaw, missingFields, roleSystem, roleUserBase, temperature=0.25) {
  const system = { role: "system", content: roleSystem };
  const user = { role: "user", content: `${roleUserBase}\n\nПожалуйста, заполни недостающие поля: ${JSON.stringify(missingFields)}. Верни только JSON с добавленными полями.` };
  const follow = await callTextModel([system, user], temperature);
  if (follow && typeof follow === "object") return Object.assign({}, originalRaw, follow);
  return originalRaw;
}

// ----------------- fallback и merge -----------------
function fallbackConcept(input) {
  const randomId = Math.floor(Math.random()*1000);
  const name = fallbackNameFromCategory(input.category);
  const painOptions = [
    "Обычный продукт категории требует лишних действий и быстро превращается в безликую бытовую рутину.",
    "Потребители хотят удобства, но не готовы жертвовать качеством.",
    "Существующие решения либо слишком дорогие, либо слишком сложные.",
    "Категория застряла — нет инноваций в формате.",
    "Потребители выбирают между ценой, качеством и удобством."
  ];
  const pain = input.pain || painOptions[randomId % painOptions.length];
  const uniquenessOptions = [
    `Инновационный формат ${input.category} с готовой порцией и уникальным ритуалом.`,
    `Первый на рынке ${input.category} с модульной системой и персонализацией.`,
    `${input.category} нового поколения: умная упаковка, контролируемая порция.`,
    `Революционный подход: сочетание качества и простоты.`,
    `${input.category} с технологией сохранения свежести.`
  ];
  const uniqueness = uniquenessOptions[randomId % uniquenessOptions.length];
  return {
    name, category: input.category, audience: input.audienceSummary, pain, uniqueness,
    one_liner: `Первый в категории ${input.category} с готовой порцией и понятным ритуалом.`,
    physical_form: "индивидуальные порции в инновационной упаковке",
    appearance: "современный дизайн с прозрачными элементами",
    composition: "оптимизированный состав",
    usage: "открыть, использовать, закрыть",
    novelty_mechanism: "новая конструкция упаковки/формы",
    why_people_will_try_it: "решает реальную боль с первого использования",
    new_market: `сегмент умных решений в ${input.category}`,
    replacement_logic: `заменяет традиционный ${input.category}`,
    ritual: "новый ритуал потребления",
    packaging: "индивидуальная пачка easy-open",
    lineup: ["базовая","премиум"],
    price_corridor: "149–299 ₽",
    visual_code: "прозрачные элементы",
    sound_code: "клик-открытие",
    aroma_code: "контролируемый аромат",
    tactile_code: "приятная текстура",
    taste_code: "сбалансированный профиль",
    channels: ["пилот в клубах","онлайн-подписка"],
    launch_hook: "демонстрация формата vs старый способ",
    education_hook: "интерактивные инструкции и сэмплы",
    technology: "инновационная система порционирования"
  };
}

function isWeakConcept(concept) {
  if (!concept || typeof concept !== "object") return true;
  const required = [concept.name, concept.one_liner, concept.physical_form, concept.appearance, concept.composition, concept.usage, concept.novelty_mechanism, concept.why_people_will_try_it];
  if (required.some(item => sanitizeText(item).length < 10)) return true;
  return false;
}

function mergeConcept(rawConcept, fallback, input) {
  const source = rawConcept && typeof rawConcept === "object" ? rawConcept : {};
  const merged = {
    name: normalizeName(pickNonEmpty(source.name, input.name, fallback.name), input.category),
    category: pickNonEmpty(source.category, fallback.category),
    audience: pickNonEmpty(source.audience, fallback.audience),
    pain: pickNonEmpty(source.pain, fallback.pain),
    uniqueness: cleanupAnswer(pickNonEmpty(source.uniqueness, fallback.uniqueness)),
    one_liner: cleanupAnswer(pickNonEmpty(source.one_liner, source.oneLiner, fallback.one_liner)),
    physical_form: cleanupAnswer(pickNonEmpty(source.physical_form, source.physicalForm, fallback.physical_form)),
    appearance: cleanupAnswer(pickNonEmpty(source.appearance, fallback.appearance)),
    composition: cleanupAnswer(pickNonEmpty(source.composition, fallback.composition)),
    usage: cleanupAnswer(pickNonEmpty(source.usage, fallback.usage)),
    novelty_mechanism: cleanupAnswer(pickNonEmpty(source.novelty_mechanism, source.noveltyMechanism, fallback.novelty_mechanism)),
    why_people_will_try_it: cleanupAnswer(pickNonEmpty(source.why_people_will_try_it, source.whyPeopleWillTryIt, fallback.why_people_will_try_it)),
    new_market: cleanupAnswer(pickNonEmpty(source.new_market, source.newMarket, fallback.new_market)),
    replacement_logic: cleanupAnswer(pickNonEmpty(source.replacement_logic, source.replacementLogic, fallback.replacement_logic)),
    ritual: cleanupAnswer(pickNonEmpty(source.ritual, fallback.ritual)),
    packaging: cleanupAnswer(pickNonEmpty(source.packaging, fallback.packaging)),
    lineup: normalizeList(source.lineup, fallback.lineup),
    price_corridor: cleanupAnswer(pickNonEmpty(source.price_corridor, source.priceCorridor, fallback.price_corridor)),
    visual_code: cleanupAnswer(pickNonEmpty(source.visual_code, source.visualCode, fallback.visual_code)),
    sound_code: cleanupAnswer(pickNonEmpty(source.sound_code, source.soundCode, fallback.sound_code)),
    aroma_code: cleanupAnswer(pickNonEmpty(source.aroma_code, source.aromaCode, fallback.aroma_code)),
    tactile_code: cleanupAnswer(pickNonEmpty(source.tactile_code, source.tactileCode, fallback.tactile_code)),
    taste_code: cleanupAnswer(pickNonEmpty(source.taste_code, source.tasteCode, fallback.taste_code)),
    channels: normalizeList(source.channels, fallback.channels),
    launch_hook: cleanupAnswer(pickNonEmpty(source.launch_hook, source.launchHook, fallback.launch_hook)),
    education_hook: cleanupAnswer(pickNonEmpty(source.education_hook, source.educationHook, fallback.education_hook)),
    technology: cleanupAnswer(pickNonEmpty(source.technology, fallback.technology))
  };
  return isWeakConcept(merged) ? fallback : merged;
}

// ----------------- extract / normalize passport -----------------
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

function generateBlockFallback(no, concept) {
  switch (no) {
    case "1.1": return `${concept.pain} ${concept.replacement_logic}. Продукт атакует боль предметной формой: ${concept.one_liner}`;
    case "1.2": return `${concept.new_market}. Доп. монетизируемая ценность: ${concept.why_people_will_try_it}`;
    case "1.3": return `Новый ритуал: ${concept.ritual}. Механика: ${concept.usage}`;
    case "1.4": return `Нарратив: ${concept.one_liner}. Это выгодно, потому что ${concept.novelty_mechanism}`;
    case "1.5": return `${concept.education_hook}. Каналы: сэмплинг, упаковка, короткие видео.`;
    case "2.1": return `${concept.appearance}. Визуальный код: ${concept.visual_code}`;
    case "2.2": return `${concept.sound_code}.`;
    case "2.3": return `${concept.aroma_code}.`;
    case "2.4": return `${concept.tactile_code}.`;
    case "2.5": return `${concept.taste_code}.`;
    case "3.1": return `Бренд даёт историю: ${concept.why_people_will_try_it}`;
    case "3.2": return `Помогают: ${concept.channels.join(", ")}. Мешают: ценовая конкуренция.`;
    case "3.3": return `Ядро: ${concept.name}. Слоган: ${concept.launch_hook}`;
    case "3.4": return `Путь клиента: увидеть → попробовать → подписаться.`;
    case "3.5": return `Стратегия: 1/3/5/10 лет — развить линейку и каналы.`;
    case "4.1": return `Сегмент: ${concept.audience}. Позиционирование: ${concept.one_liner}`;
    case "4.2": return `База: ${concept.one_liner}. Развитие: ${concept.lineup.join(", ")}`;
    case "4.3": return `Ценовой коридор: ${concept.price_corridor}`;
    case "4.4": return `Каналы: ${concept.channels.join(", ")}`;
    case "4.5": return `Продвижение: UGC, демонстрации, вирусные трюки.`;
    default: return concept.one_liner;
  }
}

function buildFallbackDraft(input, include, concept) {
  const enabled = getEnabledSchemas(include);
  const draft = {
    header: {
      category: concept.category, name: concept.name, audience: concept.audience, pain: concept.pain, uniqueness: concept.uniqueness
    },
    product_core: {
      one_liner: concept.one_liner, physical_form: concept.physical_form, appearance: concept.appearance,
      composition: concept.composition, usage: concept.usage, novelty_mechanism: concept.novelty_mechanism, why_people_will_try_it: concept.why_people_will_try_it
    },
    blocks: {}, comment: input.comment, diagnostics: input.diagnostics, uniqueness: concept.uniqueness
  };
  Object.entries(enabled).forEach(([key, items]) => {
    draft.blocks[key] = items.map(item => ({ no: item.no, question: item.question, answer: cleanupAnswer(generateBlockFallback(item.no, concept)) }));
  });
  if (include.tech !== false) {
    draft.tech = [`Технологическая логика: ${concept.technology}.`, `Конструкция: ${concept.novelty_mechanism}.`];
  }
  if (include.packaging !== false) {
    draft.packaging = [`Базовая упаковка: ${concept.packaging}.`, `Механика: ${concept.usage}.`];
  }
  if (include.star !== false) {
    draft.star = [`Сильный образ: ${concept.appearance}.`, `Повод попробовать: ${concept.why_people_will_try_it}.`];
  }
  if (include.conclusion !== false) {
    draft.conclusion = `${concept.name} — предметный продукт с новым ритуалом и коммерческой логикой.`;
  }
  return draft;
}

function normalizeMeaningfulText(value, fallback) {
  const cleaned = cleanupAnswer(value);
  if (!cleaned) return fallback;
  const lowered = cleaned.toLowerCase();
  if (BAD_PHRASES.some(phrase => lowered.includes(phrase))) return fallback;
  return cleaned;
}

function normalizeDraft(rawDraft, input, include, concept) {
  const fallback = buildFallbackDraft(input, include, concept);
  if (!rawDraft || typeof rawDraft !== "object") return fallback;
  const draft = {
    header: {
      category: pickNonEmpty(rawDraft.header?.category, fallback.header.category),
      name: normalizeName(pickNonEmpty(rawDraft.header?.name, fallback.header.name), input.category),
      audience: pickNonEmpty(rawDraft.header?.audience, fallback.header.audience),
      pain: pickNonEmpty(rawDraft.header?.pain, fallback.header.pain),
      uniqueness: normalizeMeaningfulText(rawDraft.header?.uniqueness, fallback.header.uniqueness)
    },
    product_core: {
      one_liner: normalizeMeaningfulText(rawDraft.product_core?.one_liner, fallback.product_core.one_liner),
      physical_form: normalizeMeaningfulText(rawDraft.product_core?.physical_form, fallback.product_core.physical_form),
      appearance: normalizeMeaningfulText(rawDraft.product_core?.appearance, fallback.product_core.appearance),
      composition: normalizeMeaningfulText(rawDraft.product_core?.composition, fallback.product_core.composition),
      usage: normalizeMeaningfulText(rawDraft.product_core?.usage, fallback.product_core.usage),
      novelty_mechanism: normalizeMeaningfulText(rawDraft.product_core?.novelty_mechanism, fallback.product_core.novelty_mechanism),
      why_people_will_try_it: normalizeMeaningfulText(rawDraft.product_core?.why_people_will_try_it, fallback.product_core.why_people_will_try_it)
    },
    blocks: {}, comment: input.comment, diagnostics: input.diagnostics, uniqueness: normalizeMeaningfulText(rawDraft.uniqueness || rawDraft.header?.uniqueness, fallback.uniqueness)
  };
  Object.entries(getEnabledSchemas(include)).forEach(([key, items]) => {
    const rawBlock = extractBlock(rawDraft, key);
    draft.blocks[key] = items.map((item, index) => ({ no: item.no, question: item.question, answer: normalizeMeaningfulText(extractAnswer(rawBlock, item, index), fallback.blocks[key][index].answer) }));
  });
  if (include.tech !== false) draft.tech = normalizeList(rawDraft.tech, fallback.tech);
  if (include.packaging !== false) draft.packaging = normalizeList(rawDraft.packaging, fallback.packaging);
  if (include.star !== false) draft.star = normalizeList(rawDraft.star, fallback.star);
  if (include.conclusion !== false) draft.conclusion = normalizeMeaningfulText(rawDraft.conclusion, fallback.conclusion);
  return draft;
}

// ----------------- create / run -----------------
async function createConcept(input) {
  const fallback = fallbackConcept(input);
  const raw = await callTextModel(
    [{ role: "system", content: buildConceptSystemPrompt() }, { role: "user", content: buildConceptUserMessage(input) }],
    CONCEPT_TEMPERATURE
  );

  let concept = mergeConcept(raw, fallback, input);

  const v = validateConceptObject(concept);
  if (!v.ok) {
    console.log("[validate] concept missing:", v.missing);
    const roleSystem = "Заполни недостающие поля в формате JSON. Верни только JSON с недостающими полями.";
    const roleUserBase = `Текущий концепт: ${JSON.stringify(concept)}. Недостающие поля: ${JSON.stringify(v.missing)}.`;
    const filled = await fillMissingFields(concept, v.missing, roleSystem, roleUserBase, 0.25);
    concept = mergeConcept(filled, fallback, input);
    const v2 = validateConceptObject(concept);
    if (!v2.ok) {
      console.warn("[validate] concept still missing after follow-up:", v2.missing);
      return fallback;
    }
  }
  return concept;
}

async function createPassport(input, include, concept) {
  const roleSystem = buildPassportSystemPrompt(getEnabledSchemas(include), include);
  const roleUser = buildPassportUserMessage(input, concept, include);

  const raw = await callTextModel([{ role: "system", content: roleSystem }, { role: "user", content: roleUser }], PASSPORT_TEMPERATURE);

  const fallbackDraft = buildFallbackDraft(input, include, concept);
  if (!raw || typeof raw !== "object") {
    console.warn("[generate] createPassport raw is null or not object, using fallback");
    return fallbackDraft;
  }

  const v = validatePassportObject(raw);
  if (!v.ok) {
    console.log("[validate] passport missing:", v.missing);
    const roleSystemFollow = "Заполни недостающие поля паспорта. Верни только JSON.";
    const roleUserFollow = `Текущий черnovik паспорта: ${JSON.stringify(raw)}. Недостающие поля: ${JSON.stringify(v.missing)}.`;
    const filled = await fillMissingFields(raw, v.missing, roleSystemFollow, roleUserFollow, 0.18);
    const final = normalizeDraft(filled, input, include, concept);
    const v2 = validatePassportObject(final);
    if (!v2.ok) {
      console.warn("[validate] passport still missing after follow-up:", v2.missing);
      return fallbackDraft;
    }
    return final;
  }

  return normalizeDraft(raw, input, include, concept);
}

async function runGenerate(body = {}) {
  const input = normalizeInput(body);
  const include = normalizeInclude(body);
  const concept = await createConcept(input);
  const draft = await createPassport(input, include, concept);
  return normalizeDraft(draft, input, include, concept);
}

// экспорт
module.exports = runGenerate;
module.exports.runGenerate = runGenerate;
module.exports.default = runGenerate;
module.exports.normalizeInput = normalizeInput;
module.exports.normalizeInclude = normalizeInclude;
module.exports.createConcept = createConcept;
module.exports.createPassport = createPassport;
module.exports.normalizeDraft = normalizeDraft;