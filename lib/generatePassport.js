// lib/generatePassport.js
const fs = require("fs");
const path = require("path");
const fetch = global.fetch || require("cross-fetch");

// --- НАСТРОЙКИ ---
const REF_DIRS = [
  path.join(process.cwd(), "reference"),
];

// ⚡ УМЕНЬШИЛИ ЛИМИТ СИМВОЛОВ (быстрее обработка)
const MAX_REFERENCE_CHARS = 3000;

// ⚡ ВЫСОКАЯ ТЕМПЕРАТУРА ДЛЯ КРЕАТИВА (было 0.58/0.32)
const CONCEPT_TEMPERATURE = 0.95;
const PASSPORT_TEMPERATURE = 0.85;

// ⚡ ТАЙМ-АУТ ЗАПРОСА (50 секунд, чтобы успеть до 60с лимита Vercel)
const REQUEST_TIMEOUT_MS = 20000;

const INCLUDE_KEYS = [
  "header.category", "header.name", "header.audience", "header.pain", "header.uniqueness",
  "1.1", "1.2", "1.3", "1.4", "1.5",
  "2.1", "2.2", "2.3", "2.4", "2.5",
  "3.1", "3.2", "3.3", "3.4", "3.5",
  "4.1", "4.2", "4.3", "4.4", "4.5",
  "tech", "packaging", "star", "conclusion"
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

// ⚡ РАСШИРЕННЫЙ СПИСОК ЗАПРЕЩЁННЫХ ФРАЗ (блокируем «Новаду» и шаблонные ответы)
const BAD_NAME_PATTERNS = [
  "верный вкус", "сильный выбор", "живой выбор", "сочный выбор", "добрый вкус",
  "новый продукт", "идеальный продукт", "умный выбор", "правильный выбор",
  "новада", "уникальный", "инновационный", "медальонка", "паштетто", "сырникет", "хрустель"
];

const BAD_PHRASES = [
  "новый продуктовый объект", "сценарный формат", "переупаковка категории",
  "удобный порционный формат", "компактные порции с понятной геометрией",
  "продукт должен быть", "нужно продумать", "нужно сделать", "можно сделать", "важно продумать",
  "занятые потребители", "понятная выгода", "новый и удобный", "с понятной выгодой",
  "отдельная готовая единица", "общая масса категории", "готовых отдельных решений",
  "видимый отличительный признак", "законченные элементы", "понятная геометрия",
  "аккуратная поверхность", "законченного предмета", "сильный акцент",
  "форма считывается как новая вещь", "товар в другой обёртке",
  "средний плюс сегмент", "федеральные сети", "магазины у дома", "e-grocery",
  "прямое сравнение", "старого и нового сценария", "социальное доказательство",
  "демонстрации", "короткие ролики", "сравнение со старым способом",
  "соцсети", "блогеры", "инфлюенсеры", "премиум сегмент", "онлайн-каналы"
];

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

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
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(separator);
}

const METHODOLOGY_REFERENCE = truncateText(safeReadAny("methodology_meatcode.md", "meatcode.md"), 7000);
const PASSPORT_PROMPT_REFERENCE = truncateText(safeReadAny("passport_prompt.txt"), 4500);
const PASSPORT_SCHEMA_REFERENCE = truncateText(safeReadAny("passport_schema.json"), 2200);
const SHOKOVSYANKA_REFERENCE = truncateText(safeReadAny("shokovsyanka_march_2026.md"), 4500);
const GOOD_PASSPORT_REFERENCE = truncateText(safeReadAny("good_passport.json"), 3500);

const STYLE_REFERENCE = joinNonEmpty([
  PASSPORT_PROMPT_REFERENCE ? `Prompt reference:\n${PASSPORT_PROMPT_REFERENCE}` : "",
  SHOKOVSYANKA_REFERENCE ? `Approved style reference:\n${SHOKOVSYANKA_REFERENCE}` : "",
  GOOD_PASSPORT_REFERENCE ? `Good passport example:\n${GOOD_PASSPORT_REFERENCE}` : "",
  PASSPORT_SCHEMA_REFERENCE ? `Schema reference:\n${PASSPORT_SCHEMA_REFERENCE}` : "",
  METHODOLOGY_REFERENCE ? `Methodology reference:\n${METHODOLOGY_REFERENCE}` : ""
]);

function sanitizeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    return value
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[ \u00A0]+/g, " ")
      .replace(/\n{3,}/g, "\n")
      .trim();
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeText(item)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    return sanitizeText(value.answer ?? value.value ?? value.text ?? value.content ?? value.description ?? value.response ?? "");
  }
  return "";
}

function cleanupAnswer(text) {
  return sanitizeText(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n")
    .replace(/\.{2,}/g, ".")
    .replace(/\b(заменяет)\s+\1\b/gi, "$1")
    .replace(/\b(человек использует его через)\s+(человек)\b/gi, "$2")
    .trim();
}

function pickNonEmpty(...values) {
  for (const value of values) {
    const cleaned = sanitizeText(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function uniqueList(values) {
  const seen = new Set();
  const result = [];
  for (const item of values || []) {
    const text = sanitizeText(item);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
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
        .map((part) => part.replace(/^[\-•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
        .filter(Boolean)
        .forEach((part) => result.push(part));
    }
  }
  return uniqueList(result.length ? result : fallback);
}

function safeParseJson(text) {
  try {
    return JSON.parse(String(text));
  } catch (_) {
    return null;
  }
}

function extractFirstJson(content) {
  if (!content) return null;
  if (Array.isArray(content)) {
    const joined = content.map((part) => (typeof part === "string" ? part : part?.text || "")).join("\n");
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

function defaultInclude() {
  const include = {};
  INCLUDE_KEYS.forEach((key) => { include[key] = true; });
  return include;
}

function normalizeInclude(body) {
  const raw = body && typeof body.include === "object" && body.include !== null ? body.include : {};
  const include = defaultInclude();
  INCLUDE_KEYS.forEach((key) => {
    if (raw[key] === false) include[key] = false;
    if (raw[key] === true) include[key] = true;
  });
  return include;
}

function getEnabledSchemas(include) {
  const enabled = {};
  Object.entries(BLOCK_SCHEMAS).forEach(([blockKey, schema]) => {
    const filtered = schema.filter((item) => include[item.no] !== false);
    if (filtered.length) enabled[blockKey] = filtered;
  });
  return enabled;
}

function resolveApiUrl() {
  if (process.env.QWEN_API_URL) return process.env.QWEN_API_URL;
  if (process.env.OPENAI_API_URL) return process.env.OPENAI_API_URL;
  if (process.env.OPENAI_BASE_URL) {
    return `${process.env.OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  }
  return "";
}

function resolveApiKey() {
  return process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY || "";
}

function resolveModelName() {
  return process.env.TEXT_MODEL_NAME || process.env.OPENAI_MODEL || process.env.MODEL_NAME || "";
}

// --- СЕТЬ И ЗАПРОСЫ ---

async function callTextModel(messages, temperature) {
  const apiUrl = resolveApiUrl();
  const apiKey = resolveApiKey();
  const modelName = resolveModelName();

  if (!apiUrl || !apiKey || !modelName) {
    console.error("[generate] Missing API env vars");
    return null;
  }

  // ⚡ Контроль времени ответа (Timeout)
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
        seed: Math.floor(Math.random() * 1000000) // ⚡ Случайное зерно для уникальности
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const rawText = await response.text().catch(() => "");
    if (!response.ok) {
      console.error("[generate] model error", response.status, rawText);
      return null;
    }

    const parsed = safeParseJson(rawText);
    const content = parsed?.choices?.[0]?.message?.content ?? parsed?.choices?.[0]?.text ?? rawText;
    return extractFirstJson(content) || extractFirstJson(rawText);

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("[generate] Request timeout (>50s)");
    } else {
      console.error("[generate] request failed", error);
    }
    return null;
  }
}

// --- ЛОГИКА ПРОДУКТА ---

function containsLatin(text) {
  return /[A-Za-z]/.test(String(text || ""));
}

function fallbackNameFromCategory(category) {
  const lower = sanitizeText(category).toLowerCase();
  // Генерируем название на основе категории
  const prefixes = ["Супер", "Мега", "Ультра", "Про", "Макси", "Мини", "Эко", "Био", "Фит", "Фреш"];
  const suffixes = ["Лайт", "Плюс", "Макс", "Про", "Гурме", "Дели", "Фуд", "Снак", "Бит", "Го"];
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
  const cleaned = String(name || "")
    .replace(/[«»"']/g, "")
    .replace(/[^А-Яа-яЁё0-9\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || containsLatin(cleaned)) {
    return fallbackNameFromCategory(category);
  }
  if (BAD_NAME_PATTERNS.includes(cleaned.toLowerCase())) {
    return fallbackNameFromCategory(category);
  }
  return cleaned;
}

function compressAudience(input) {
  const rawAudience = [];
  if (Array.isArray(input.audienceList)) rawAudience.push(...input.audienceList);
  if (sanitizeText(input.audience)) {
    rawAudience.push(...sanitizeText(input.audience).split(/[,;]+/));
  }
  const joined = rawAudience.join(" ").toLowerCase();
  const segments = [];
  if (/(семь|родител|дет|дом|школ)/.test(joined)) {
    segments.push("семьи с детьми, которым нужен быстрый и понятный продукт без лишней подготовки");
  }
  if (/(офис|работ|дорог|перекус|машин|метро|с собой)/.test(joined)) {
    segments.push("занятые взрослые, которым нужен удобный продукт для дороги, офиса или быстрого перекуса");
  }
  if (/(спорт|фитнес|зал|белок)/.test(joined)) {
    segments.push("активные взрослые, которым нужен функциональный продукт с понятной пользой");
  }
  if (/(60\+|пожил|мягк|жеван|глот)/.test(joined)) {
    segments.push("пожилые потребители, которым важны мягкость, удобство и простота использования");
  }
  if (!segments.length) {
    const comment = `${sanitizeText(input.comment)} ${sanitizeText(input.pain)}`.toLowerCase();
    if (/(семь|дет|дом)/.test(comment)) {
      segments.push("семьи с детьми, которым нужен быстрый и аккуратный продукт для дома");
    } else {
      segments.push("занятые потребители, которым нужен новый и удобный продукт с понятной выгодой");
    }
  }
  return uniqueList(segments).join("; ");
}

function normalizeInput(body) {
  const source = body && typeof body.form === "object" && body.form !== null ? body.form : body || {};
  const category = sanitizeText(source.category);
  const audienceList = Array.isArray(source.audience)
    ? source.audience.map((item) => sanitizeText(item)).filter(Boolean)
    : sanitizeText(source.audience)
    ? sanitizeText(source.audience).split(/[,;]+/).map((item) => item.trim()).filter(Boolean)
    : [];
  const painsArray = Array.isArray(source.pains) ? source.pains.map((item) => sanitizeText(item)).filter(Boolean) : [];
  
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

// ⚡ УЛУЧШЕННЫЙ ПРОМПТ С ТРЕБОВАНИЕМ КОНКРЕТИКИ
function buildConceptSystemPrompt() {
  return joinNonEmpty([
    "Ты — гениальный продуктовый стратег. Твоя задача — ИЗОБРЕСТИ ОДИН НОВЫЙ УНИКАЛЬНЫЙ ПРОДУКТ.",
    "КРИТИЧЕСКИЕ ТРЕБОВАНИЯ:",
    "1. ПРИДУМАЙ КОНКРЕТНЫЙ ФИЗИЧЕСКИЙ ОБЪЕКТ — его можно увидеть, взять в руку, показать на полке.",
    "2. ДАЙ КОНКРЕТНЫЕ ЦИФРЫ — вес, размер, цена в рублях, содержание белка/жиров/углеводов, сроки.",
    "3. НАЗВАНИЕ НА РУССКОМ — короткое, звучное, без латиницы (не 'BeefGo', а 'Мясной Код').",
    "4. ОПИШИ РИТУАЛ — где, когда, как именно человек ест этот продукт (не 'удобно', а 'одной рукой за рулём, не пачкаясь').",
    "5. СЕНСОРИКА — конкретные образы: цвет, звук открывания, запах, текстура, послевкусие.",
    "6. КАЖДАЯ ГЕНЕРАЦИЯ ДОЛЖНА БЫТЬ УНИКАЛЬНОЙ — не повторяй предыдущие ответы.",
    "ЗАПРЕЩЕНО:",
    "- Писать абстракции: 'новый сценарий', 'переупаковка категории', 'удобный формат'.",
    "- Использовать латиницу в названии продукта.",
    "- Писать 'нужно', 'можно', 'следует' — давай готовые решения.",
    "- Давать ответы, которые можно переставить в другую категорию.",
    "- Использовать названия: 'Новада', 'Медальонка', 'Паштетто', 'Сырникет', 'Хрустель'.",
    "ПРИМЕР ХОРОШЕГО ОТВЕТА:",
    "ПЛОХО: 'Порционный продукт нового типа с двумя режимами употребления'",
    "ХОРОШО: 'Двухслойная мягкая колбасная пластина-рулет, где внешний слой — классическая варёная колбаса, а внутренний — яркий вкусовой центр; её можно есть как рулет-слайс прямо из упаковки или разворачивать и класть на хлеб'",
    "ПРОВЕРКА ПЕРЕД ОТВЕТОМ:",
    "Если продукт нельзя нарисовать по описанию — ответ плохой.",
    "Если нет конкретных цифр (цена, вес, БЖУ) — ответ плохой.",
    "Если название пустое ('Живой Выбор', 'Новада') — ответ плохой.",
    "Верни только валидный JSON без markdown.",
    '{"name":string,"category":string,"audience":string,"pain":string,"uniqueness":string,"one_liner":string,"physical_form":string,"appearance":string,"composition":string,"usage":string,"novelty_mechanism":string,"why_people_will_try_it":string,"new_market":string,"replacement_logic":string,"ritual":string,"packaging":string,"lineup":string[],"price_corridor":string,"visual_code":string,"sound_code":string,"aroma_code":string,"tactile_code":string,"taste_code":string,"channels":string[],"launch_hook":string,"education_hook":string,"technology":string}',
    METHODOLOGY_REFERENCE
  ]);
}

function buildConceptUserMessage(input) {
  return joinNonEmpty(
    [
      `Категория: ${input.category || "-"}`,
      `Целевая аудитория: ${input.audienceSummary || input.audience || "-"}`,
      `Потребительская боль: ${input.pain || "-"}`,
      `Комментарий: ${input.comment || "-"}`,
      `Уникальность / пожелание: ${input.innovation || "-"}`,
      input.name ? `Если возможно, учти желаемое название: ${input.name}` : "Название придумай сам",
      "Сделай продукт таким, чтобы его можно было показать на полке, объяснить в одной фразе и превратить в сильный маркетинговый паспорт.",
      "ВАЖНО: Избегай шаблонных фраз. Пиши как для реального инвестора — с цифрами, сценариями и конкретикой.",
      "ВАЖНО: Каждая генерация должна быть уникальной. Не повторяй предыдущие ответы."
    ],
    "\n"
  );
}

// ⚡ УЛУЧШЕННЫЙ ПРОМПТ ДЛЯ ПАСПОРТА
function buildPassportSystemPrompt(enabledSchemas, include) {
  const mandatoryLines = [];
  Object.entries(enabledSchemas).forEach(([key, items]) => {
    items.forEach((item) => {
      mandatoryLines.push(`${key}.${item.no}: ${item.question}`);
    });
  });
  const extraSections = [];
  if (include.tech !== false) extraSections.push("tech");
  if (include.packaging !== false) extraSections.push("packaging");
  if (include.star !== false) extraSections.push("star");
  if (include.conclusion !== false) extraSections.push("conclusion");

  return joinNonEmpty([
    "Ты пишешь развёрнутый когнитивно-сенсорный паспорт продукта в стиле примеров 'МЯСОВОЙ КОД' и 'Шоковсянка'.",
    "ТРЕБОВАНИЯ К КАЧЕСТВУ:",
    "1. КОНКРЕТНЫЕ ЦИФРЫ — цена в рублях (149-179₽), вес (40г), белок (20г), сроки (3 года/5 лет/10 лет).",
    "2. КОНКРЕТНЫЕ СЦЕНАРИИ — не 'удобно', а 'одной рукой за рулём, не пачкаясь'; не 'везде', а 'World Class, Азбука Вкуса, аэропорты'.",
    "3. КОНКРЕТНЫЕ ОБРАЗЫ — не 'приятный звук', а 'щелчок открывания клик'; не 'красивая упаковка', а 'матовый графит + неоновый акцент'.",
    "4. КОНКРЕТНЫЕ КАНАЛЫ — не 'соцсети', а 'TikTok, Telegram-каналы тренеров, сэмплинг в залах 18:00-21:00'.",
    "5. КОНКРЕТНЫЕ НАЗВАНИЯ — челленджи (#МясоБезКомпромиссов), слоганы ('Белок. Без компромиссов.'), акции.",
    "6. КАЖДАЯ ГЕНЕРАЦИЯ ДОЛЖНА БЫТЬ УНИКАЛЬНОЙ — не повторяй предыдущие ответы.",
    "СТРУКТУРА ОТВЕТА:",
    "- Когнитивный блок: что заменяет, какие ритуалы внедряет, нарративы в формате 'Когда вы... то...'.",
    "- Сенсорный блок: визуал, звук, запах, тактильность, вкус — всё конкретно для этого продукта.",
    "- Брендинг: история, ядро, путь клиента, стратегия 3-5-10 лет с конкретными целями.",
    "- Маркетинг: сегменты, цены, каналы, тактики продвижения с KPI.",
    "ПРИМЕР ХОРОШЕГО ОТВЕТА:",
    "ПЛОХО: 'Каналы: федеральные сети, магазины у дома'",
    "ХОРОШО: 'Этап 1: фитнес-клубы премиум-сегмента (World Class), онлайн-магазин с доставкой в зал. Этап 2: вендинговые точки в залах, аэропортах. Этап 3: Азбука Вкуса, Перекрёсток.'",
    "ПЛОХО: 'Продвижение: соцсети, блогеры'",
    "ХОРОШО: 'Вирусный челлендж #МясоБезКомпромиссов: пользователи снимают, как едят снек в нестандартной ситуации. Амбассадоры-тренеры: локальные инфлюенсеры получают продукт за честные обзоры (бартер).'",
    "ЗАПРЕЩЕНО:",
    "- Пустые фразы: 'занятые потребители', 'понятная выгода', 'новый и удобный'.",
    "- Абстракции: 'федеральные сети', 'соцсети', 'премиум сегмент' без конкретики.",
    "- Placeholder'ы: 'название на выбор', 'цена определяется'.",
    "- Повторение предыдущих ответов.",
    "Верни только валидный JSON без markdown.",
    '{"header":{"category":string,"name":string,"audience":string,"pain":string,"uniqueness":string},"product_core":{"one_liner":string,"physical_form":string,"appearance":string,"composition":string,"usage":string,"novelty_mechanism":string,"why_people_will_try_it":string},"blocks":{"cognitive":[{"no":string,"question":string,"answer":string}],"sensory":[{"no":string,"question":string,"answer":string}],"branding":[{"no":string,"question":string,"answer":string}],"marketing":[{"no":string,"question":string,"answer":string}]},"tech":string[]|string,"packaging":string[]|string,"star":string[]|string,"conclusion":string}',
    mandatoryLines.length ? `Обязательные вопросы:\n${mandatoryLines.join("\n")}` : "",
    extraSections.length ? `Дополнительные секции: ${extraSections.join(", ")}` : "",
    STYLE_REFERENCE
  ]);
}

function buildPassportUserMessage(input, concept, include) {
  return joinNonEmpty([
    "Ниже уже придуман продукт. Разверни вокруг него сильный паспорт в стиле референсов.",
    "ВАЖНО: Пиши конкретно, с цифрами и сценариями. Избегай шаблонных фраз.",
    "ВАЖНО: Каждая генерация должна быть уникальной. Не повторяй предыдущие ответы.",
    JSON.stringify({
      header: {
        category: concept.category,
        name: concept.name,
        audience: concept.audience,
        pain: concept.pain,
        uniqueness: concept.uniqueness
      },
      product_core: {
        one_liner: concept.one_liner,
        physical_form: concept.physical_form,
        appearance: concept.appearance,
        composition: concept.composition,
        usage: concept.usage,
        novelty_mechanism: concept.novelty_mechanism,
        why_people_will_try_it: concept.why_people_will_try_it
      },
      concept_meta: {
        new_market: concept.new_market,
        replacement_logic: concept.replacement_logic,
        ritual: concept.ritual,
        packaging: concept.packaging,
        lineup: concept.lineup,
        price_corridor: concept.price_corridor,
        visual_code: concept.visual_code,
        sound_code: concept.sound_code,
        aroma_code: concept.aroma_code,
        tactile_code: concept.tactile_code,
        taste_code: concept.taste_code,
        channels: concept.channels,
        launch_hook: concept.launch_hook,
        education_hook: concept.education_hook,
        technology: concept.technology
      },
      user_input: {
        category: input.category,
        audience: input.audienceSummary || input.audience,
        pain: input.pain,
        comment: input.comment,
        innovation: input.innovation
      },
      include
    })
  ]);
}

// ⚡ ИСПРАВЛЕННЫЙ FALLBACK — больше не возвращает всегда "Медальонку"
function fallbackConcept(input) {
  const lower = input.category.toLowerCase();
  const randomId = Math.floor(Math.random() * 1000);
  
  // Генерируем уникальное название на основе категории
  const name = fallbackNameFromCategory(input.category);
  
  // Разные варианты боли в зависимости от категории
  const painOptions = [
    "Обычный продукт категории требует лишних действий и быстро превращается в безликую бытовую рутину.",
    "Потребители хотят удобства, но не готовы жертвовать качеством и вкусом.",
    "Существующие решения либо слишком дорогие, либо слишком сложные в использовании.",
    "Категория застряла в прошлом — нет инноваций в формате и упаковке.",
    "Потребители вынуждены выбирать между ценой, качеством и удобством."
  ];
  const pain = input.pain || painOptions[randomId % painOptions.length];
  
  // Разные варианты уникальности
  const uniquenessOptions = [
    `Инновационный формат ${input.category} с готовой порцией и уникальным ритуалом использования.`,
    `Первый на рынке ${input.category} с модульной системой и персонализацией под каждого пользователя.`,
    `${input.category} нового поколения: умная упаковка, контролируемая порция, zero waste.`,
    `Революционный подход к ${input.category}: сочетание премиум-качества и массового удобства.`,
    `${input.category} с технологией сохранения свежести и индивидуальной дозировкой.`
  ];
  const uniqueness = uniquenessOptions[randomId % uniquenessOptions.length];
  
  return {
    name: name,
    category: input.category,
    audience: input.audienceSummary,
    pain: pain,
    uniqueness: uniqueness,
    one_liner: `Первый в категории ${input.category} с готовой порцией и уникальным ритуалом.`,
    physical_form: "индивидуальные порции в инновационной упаковке",
    appearance: "современный дизайн с прозрачными элементами для визуального контроля",
    composition: "оптимизированный состав с балансом вкуса, пользы и удобства",
    usage: "открыть, использовать, закрыть — без лишних действий и инструментов",
    novelty_mechanism: "новизна в формате порционирования и системе использования",
    why_people_will_try_it: "Продукт решает реальную боль категории с первого использования.",
    new_market: `сегмент умных решений в категории ${input.category}`,
    replacement_logic: `заменяет традиционный ${input.category}, требующий подготовки и хранения`,
    ritual: "пользователь выбирает порцию под конкретный момент использования",
    packaging: "компактная система с индивидуальным доступом к каждой порции",
    lineup: ["базовая версия", "премиум версия", "специальная серия"],
    price_corridor: "149–299 ₽ в зависимости от формата",
    visual_code: "прозрачные элементы + цветовая кодировка вкусов",
    sound_code: "характерный звук открытия с ощущением качества",
    aroma_code: "контролируемый аромат без химических оттенков",
    tactile_code: "эргономичная форма с приятной текстурой",
    taste_code: "сбалансированный профиль с ярким акцентом",
    channels: ["специализированные магазины", "онлайн-подписка", "премиум-ритейл"],
    launch_hook: "демонстрация уникального формата через сравнение со старым способом",
    education_hook: "обучение через интерактивный контент и сэмплинг",
    technology: "инновационная система порционирования и сохранения"
  };
}

function isWeakConcept(concept) {
  if (!concept || typeof concept !== "object") return true;
  const required = [
    concept.name, concept.one_liner, concept.physical_form, concept.appearance,
    concept.composition, concept.usage, concept.novelty_mechanism, concept.why_people_will_try_it
  ];
  if (required.some((item) => sanitizeText(item).length < 10)) return true;
  // ⚡ ОТКЛЮЧИЛИ ПРОВЕРКУ BAD_PHRASES — она блокировала слишком много
  // const lowered = required.map((item) => sanitizeText(item).toLowerCase()).join(" ");
  // if (BAD_PHRASES.some((phrase) => lowered.includes(phrase))) return true;
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

function extractBlock(rawDraft, key) {
  if (!rawDraft || typeof rawDraft !== "object") return null;
  const candidate = rawDraft.blocks?.[key] ?? rawDraft[key];
  if (Array.isArray(candidate) || (candidate && typeof candidate === "object")) {
    return candidate;
  }
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
    const byNo = rawBlock.find((row) => matchesNo(row, item.no));
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
    case "1.1": return `${concept.pain} ${concept.replacement_logic}. Продукт атакует боль не обещанием, а новой конструкцией: ${concept.one_liner}`;
    case "1.2": return `${concept.new_market}. Дополнительная монетизируемая ценность: ${concept.why_people_will_try_it}`;
    case "1.3": return `Новый ритуал: ${concept.ritual}. Механика использования: ${concept.usage}`;
    case "1.4": return `Нарратив строится так: ${concept.one_liner} Это выгодно, потому что ${concept.novelty_mechanism}`;
    case "1.5": return `${concept.education_hook}. Каналы обучения: дегустации, короткие видео, упаковка, социальное доказательство.`;
    case "2.1": return `${concept.appearance}. Визуальный код: ${concept.visual_code}`;
    case "2.2": return `${concept.sound_code}. Этот звук должен сопровождать первое использование.`;
    case "2.3": return `${concept.aroma_code}. Запах должен подтверждать чистоту и понятность продукта.`;
    case "2.4": return `${concept.tactile_code}. Тактильность должна поддерживать ощущение законченного предмета.`;
    case "2.5": return `${concept.taste_code}. Линейка вкусов: ${concept.lineup.join(", ")}.`;
    case "3.1": return `Продукт улучшает историю потребителя так: ${concept.why_people_will_try_it}`;
    case "3.2": return `Помогают контексты: ${concept.channels.join(", ")}. Мешают контексты, где решение принимают только по цене и не видят новизну формы.`;
    case "3.3": return `Название: ${concept.name}. Суть: ${concept.one_liner}. Слоган: ${concept.launch_hook}`;
    case "3.4": return `Путь клиента: увидеть образ, попробовать новый ритуал, закрепить повтор через удобство и вкус.`;
    case "3.5": return `3 года — закрепить формат; 5 лет — расширить линейку ${concept.lineup.join(", ")}; 10 лет — стать стандартом новой подкатегории.`;
    case "4.1": return `Ключевой сегмент: ${concept.audience}. Позиционирование: ${concept.one_liner}`;
    case "4.2": return `База: ${concept.one_liner}. Развитие: ${concept.lineup.join(", ")}.`;
    case "4.3": return `Ценовой коридор: ${concept.price_corridor}. Цена читается через новизну формы, вкуса и ритуала.`;
    case "4.4": return `Каналы: ${concept.channels.join(", ")}. Нужны места, где продукт можно быстро считать глазами.`;
    case "4.5": return `Запуск: ${concept.launch_hook}. Безбюджетно: демонстрации, короткие ролики, UGC, сравнение со старым способом.`;
    default: return concept.one_liner;
  }
}

function buildFallbackDraft(input, include, concept) {
  const enabled = getEnabledSchemas(include);
  const draft = {
    header: {
      category: concept.category,
      name: concept.name,
      audience: concept.audience,
      pain: concept.pain,
      uniqueness: concept.uniqueness
    },
    product_core: {
      one_liner: concept.one_liner,
      physical_form: concept.physical_form,
      appearance: concept.appearance,
      composition: concept.composition,
      usage: concept.usage,
      novelty_mechanism: concept.novelty_mechanism,
      why_people_will_try_it: concept.why_people_will_try_it
    },
    blocks: {},
    comment: input.comment,
    diagnostics: input.diagnostics,
    uniqueness: concept.uniqueness
  };
  Object.entries(enabled).forEach(([key, items]) => {
    draft.blocks[key] = items.map((item) => ({
      no: item.no,
      question: item.question,
      answer: cleanupAnswer(generateBlockFallback(item.no, concept))
    }));
  });
  if (include.tech !== false) {
    draft.tech = [
      `Технологическая логика: ${concept.technology}.`,
      `Конструкция продукта: ${concept.novelty_mechanism}.`,
      `Ключевой контроль качества: продукт должен сохранять ${concept.visual_code.toLowerCase()} и повторяемость вкуса.`
    ];
  }
  if (include.packaging !== false) {
    draft.packaging = [
      `Базовая упаковка: ${concept.packaging}.`,
      `Механика использования: ${concept.usage}.`,
      `На упаковке нужно показать ${concept.visual_code.toLowerCase()} и объяснить новый ритуал потребления.`
    ];
  }
  if (include.star !== false) {
    draft.star = [
      `У продукта есть сильный образ: ${concept.appearance}.`,
      `У него есть новый ритуал: ${concept.ritual}.`,
      `У него есть понятный повод попробовать: ${concept.why_people_will_try_it}.`,
      `У него есть потенциал линейки: ${concept.lineup.join(", ")}.`
    ];
  }
  if (include.conclusion !== false) {
    draft.conclusion = `${concept.name} — это не описание категории, а новый продукт с понятным предметным образом, новым ритуалом и коммерчески читаемой новизной. Следующий шаг — проверить скорость считывания образа, готовность попробовать и принятие цены ${concept.price_corridor}.`;
  }
  return draft;
}

function normalizeMeaningfulText(value, fallback) {
  const cleaned = cleanupAnswer(value);
  if (!cleaned) return fallback;
  const lowered = cleaned.toLowerCase();
  if (BAD_PHRASES.some((phrase) => lowered.includes(phrase))) {
    return fallback;
  }
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
    blocks: {},
    comment: input.comment,
    diagnostics: input.diagnostics,
    uniqueness: normalizeMeaningfulText(rawDraft.uniqueness || rawDraft.header?.uniqueness, fallback.uniqueness)
  };
  Object.entries(getEnabledSchemas(include)).forEach(([key, items]) => {
    const rawBlock = extractBlock(rawDraft, key);
    draft.blocks[key] = items.map((item, index) => ({
      no: item.no,
      question: item.question,
      answer: normalizeMeaningfulText(extractAnswer(rawBlock, item, index), fallback.blocks[key][index].answer)
    }));
  });
  if (include.tech !== false) draft.tech = normalizeList(rawDraft.tech, fallback.tech);
  if (include.packaging !== false) draft.packaging = normalizeList(rawDraft.packaging, fallback.packaging);
  if (include.star !== false) draft.star = normalizeList(rawDraft.star, fallback.star);
  if (include.conclusion !== false) draft.conclusion = normalizeMeaningfulText(rawDraft.conclusion, fallback.conclusion);
  return draft;
}

async function createConcept(input) {
  const fallback = fallbackConcept(input);
  const raw = await callTextModel(
    [
      { role: "system", content: buildConceptSystemPrompt() },
      { role: "user", content: buildConceptUserMessage(input) }
    ],
    CONCEPT_TEMPERATURE
  );
  return mergeConcept(raw, fallback, input);
}

async function createPassport(input, include, concept) {
  const raw = await callTextModel(
    [
      {
        role: "system",
        content: buildPassportSystemPrompt(getEnabledSchemas(include), include)
      },
      {
        role: "user",
        content: buildPassportUserMessage(input, concept, include)
      }
    ],
    PASSPORT_TEMPERATURE
  );
  return normalizeDraft(raw, input, include, concept);
}

async function runGenerate(body = {}) {
  const input = normalizeInput(body);
  const include = normalizeInclude(body);
  const concept = await createConcept(input);
  const draft = await createPassport(input, include, concept);
  return normalizeDraft(draft, input, include, concept);
}

module.exports = runGenerate;
module.exports.runGenerate = runGenerate;
module.exports.default = runGenerate;
module.exports.normalizeInput = normalizeInput;
module.exports.normalizeInclude = normalizeInclude;
module.exports.createConcept = createConcept;
module.exports.createPassport = createPassport;
module.exports.normalizeDraft = normalizeDraft;