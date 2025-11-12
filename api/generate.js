const fs = require("fs");
const path = require("path");

const fetch = global.fetch;

const REF_DIR = path.join(process.cwd(), "reference");

function safeRead(file) {
  try {
    return fs.readFileSync(path.join(REF_DIR, file), "utf8");
  } catch (error) {
    return "";
  }
}

const FORM_REFERENCE = safeRead("form_template.md");
const BOOK_REFERENCE = safeRead("book_v2_excerpt.md");
const EXAMPLE_REFERENCE = safeRead("miau_example.md");

const SYSTEM_PROMPT = [
  "Ты — инженер-наставник методики «Полярная звезда».",
  "Работай строго на русском языке и верни валидный JSON без Markdown и комментариев.",
  "Структура ответа: { \"header\": {\"category\": \"\", \"name\": \"\", \"audience\": \"\", \"pain\": \"\", \"innovation\": \"\"}, \"blocks\": {\"cognitive\": [...5 объектов...], \"sensory\": [...5 объектов...], \"branding\": [...5 объектов...], \"marketing\": [...5 объектов...]}, \"tech\": [\"...\"], \"star\": [\"...\"], \"conclusion\": \"\" }.",
  "Каждый массив блоков обязан содержать ровно пять объектов с полями \"no\", \"question\", \"answer\".",
  "Ни один ответ не может быть пустым, нейтральным или заглушкой.",
  "Форма вопросов и строгий порядок заполнения:",
  FORM_REFERENCE,
  "Методические правила качества:",
  BOOK_REFERENCE,
  "Эталон плотности и тона оформления:",
  EXAMPLE_REFERENCE
].filter(Boolean).join("\n\n");

const BLOCK_SCHEMAS = {
  cognitive: [
    { no: "1.1", question: "Какую потребительскую боль используем для создания дизрапта?" },
    { no: "1.2", question: "Изменение модели потребления: какой новый рынок открываем?" },
    { no: "1.3", question: "Изменение технологии потребления: какие новые привычки потребления внедряем?" },
    { no: "1.4", question: "Нарративы: как объясняем, что инновация нужна, полезна, выгодна?" },
    { no: "1.5", question: "На работе с какими когнитивными функциями потребителя фокусируемся?" }
  ],
  sensory: [
    { no: "2.1", question: "Сильный визуальный образ" },
    { no: "2.2", question: "Сильный аудиальный образ" },
    { no: "2.3", question: "Сильный обонятельный образ" },
    { no: "2.4", question: "Сильный осязательный образ" },
    { no: "2.5", question: "Сильный вкусовой образ" }
  ],
  branding: [
    { no: "3.1", question: "Как улучшаем личную историю и самоидентификацию потребителя?" },
    { no: "3.2", question: "Какой контекст поможет развить бренд? Какой помешает?" },
    { no: "3.3", question: "Сильное ядро бренда: название, логотип, слоган, суть, доп. элементы" },
    { no: "3.4", question: "Уникальный путь клиента с продуктом и брендом (опыт бренда)" },
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

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  const input = normalizeInput(body);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(input) }
  ];

  const llmDraft = await callTextModel(messages, input.temperature);
  const draft = normalizeDraft(llmDraft, input);

  res.status(200).json(draft);
};

async function callTextModel(messages, temperature) {
  if (!process.env.QWEN_API_URL || !process.env.QWEN_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(process.env.QWEN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.TEXT_MODEL_NAME,
        messages,
        temperature: clamp(Number.isFinite(temperature) ? temperature : 0.7, 0, 1),
        top_p: 0.95
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    return extractFirstJson(rawContent);
  } catch (error) {
    console.error("[generate:text]", error);
    return null;
  }
}

function normalizeDraft(rawDraft, input) {
  const fallback = buildFallbackDraft(input);

  if (!rawDraft || typeof rawDraft !== "object") {
    return fallback;
  }

  const header = {
    category: pickNonEmpty(
      sanitizeText(rawDraft.header?.category),
      sanitizeText(rawDraft.category),
      fallback.header.category
    ),
    name: pickNonEmpty(
      sanitizeText(rawDraft.header?.name),
      sanitizeText(rawDraft.name),
      fallback.header.name
    ),
    audience: pickNonEmpty(
      sanitizeText(rawDraft.header?.audience),
      sanitizeText(rawDraft.audience),
      fallback.header.audience
    ),
    pain: pickNonEmpty(
      sanitizeText(rawDraft.header?.pain),
      sanitizeText(rawDraft.pain),
      fallback.header.pain
    ),
    innovation: pickNonEmpty(
      sanitizeText(rawDraft.header?.innovation),
      sanitizeText(rawDraft.innovation),
      fallback.header.innovation
    )
  };

  const blocks = {};
  Object.entries(BLOCK_SCHEMAS).forEach(([key, schema]) => {
    const rawBlock = extractBlock(rawDraft, key);
    blocks[key] = schema.map((item, index) => {
      const fallbackItem = fallback.blocks[key][index];
      const answer = pickNonEmpty(
        extractAnswer(rawBlock, item, index),
        fallbackItem.answer
      );
      return {
        no: item.no,
        question: item.question,
        answer
      };
    });
  });

  const tech = normalizeList(rawDraft.tech, fallback.tech);
  const star = normalizeList(rawDraft.star, fallback.star);
  const conclusion = pickNonEmpty(
    sanitizeText(rawDraft.conclusion),
    sanitizeText(rawDraft.summary),
    fallback.conclusion
  );

  return { header, blocks, tech, star, conclusion };
}

function buildFallbackDraft(input) {
  const category = pickNonEmpty(input.category, "Новый продукт");
  const name = pickNonEmpty(input.name, generatePolarName(input.category));
  const audienceList = Array.isArray(input.audienceList) ? input.audienceList : [];
  const audience = pickNonEmpty(
    input.audience,
    audienceList.length ? audienceList.join(", ") : "Осознанные потребители, ищущие новое решение"
  );
  const pain = pickNonEmpty(
    input.pain,
    "Нужно сформулировать основную потребительскую боль"
  );
  const innovation = pickNonEmpty(
    input.innovation,
    "Нужно чётко описать инновацию и уникальность предложения"
  );

  const categoryText = category.trim();
  const categoryLower = categoryText.toLowerCase();
  const audienceText = audience.trim();
  const painText = pain.trim();
  const innovationText = innovation.trim();
  const nameText = name.trim();

  const fallbackAnswers = {
    cognitive: [
      `Главная боль, с которой работаем: ${painText}. Показываем, как продукт устраняет её системно.`,
      `Категория ${categoryLower} открывает новый сценарий для аудитории ${audienceText}.`,
      `Внедряем привычку регулярного использования продукта без барьеров и с предсказуемым результатом.`,
      `Развиваем нарративы, подчеркивающие доверие, пользу и практическую выгоду предложения.`,
      `Акцентируем когнитивные функции — рациональность, чувство контроля и уверенность в выборе.`
    ],
    sensory: [
      `Фирменный визуальный образ: чистая лаконичная графика с акцентом на ${innovationText}.`,
      `Аудиальный код бренда — короткие уверенные сигналы, поддерживающие настроение «готов к действию».`,
      `Аромат ассоциируется с натуральностью и свежестью, избегая химических оттенков.`,
      `Тактильный опыт: приятные материалы упаковки, удобно держать и открывать одной рукой.`,
      `Вкус сбалансирован, с узнаваемым послевкусием, подтверждающим ценность ${categoryLower}.`
    ],
    branding: [
      `История бренда усиливает самоидентификацию клиента: «я выбираю решение, которое заботится обо мне».`,
      `Рабочие контексты — честные, современные площадки; избегаем шумных и агрессивных окружений.`,
      `Ядро бренда: имя ${nameText}, чёткий визуальный знак и слоган, транслирующий ${innovationText}.`,
      `Путь клиента: знакомство, быстрый пробный опыт, закрепление через повторные покупки и рекомендации.`,
      `Стратегия роста: 3 года — закрепление в ключевых каналах, 5 лет — расширение линейки, 10 лет — международное признание.`
    ],
    marketing: [
      `Сегментируем аудиторию по потребности решить боль "${painText}" и позиционируем продукт как надёжное решение.`,
      `Базовая версия ${categoryLower} закрывает ежедневный сценарий; планируем релизы для особых случаев.`,
      `Стратегия цены объясняет инновацию "${innovationText}" и поддерживает маржинальность через подписки и наборы.`,
      `Основные каналы — ритейл и цифровые площадки, где находится аудитория ${audienceText}.`,
      `Продвижение делает упор на демонстрацию результата, рекомендации и партнёрские интеграции без больших бюджетов.`
    ]
  };

  const fallbackBlocks = {};
  Object.entries(BLOCK_SCHEMAS).forEach(([key, schema]) => {
    fallbackBlocks[key] = schema.map((item, index) => ({
      no: item.no,
      question: item.question,
      answer: fallbackAnswers[key][index] || `Требуется добавить ответ на вопрос: ${item.question.toLowerCase()}`
    }));
  });

  const tech = [
    `Производственный цикл ${categoryLower} строится на прозрачных поставках и контроле качества.`,
    `Технология подчёркивает инновацию: ${innovationText}; она решает боль "${painText}".`,
    `Формируем стандарты безопасности и упаковки, которые упрощают использование для аудитории ${audienceText}.`
  ];

  const star = [
    `Продукт ${nameText} закрывает ключевую боль: ${painText}.`,
    `Инновация "${innovationText}" делает предложение заметным и трудновоспроизводимым.`,
    `Аудитория ${audienceText} получает понятный сценарий использования и эмоциональную ценность.`
  ];

  const conclusion = `Продукт ${nameText} в категории ${categoryText} сочетает решение боли, технологичность и ясный брендовый образ; следующий шаг — проверить гипотезы на фокус-группах и доработать детали.`;

  return {
    header: {
      category: categoryText,
      name: nameText,
      audience: audienceText,
      pain: painText,
      innovation: innovationText
    },
    blocks: fallbackBlocks,
    tech,
    star,
    conclusion
  };
}

function normalizeInput(body) {
  const source = body && typeof body.form === "object" && body.form !== null ? body.form : body || {};

  const category = sanitizeText(source.category);
  const name = sanitizeText(source.name || source.productName);

  const audienceList = Array.isArray(source.audience)
    ? source.audience.map((item) => sanitizeText(item)).filter(Boolean)
    : sanitizeText(source.audience)
    ? sanitizeText(source.audience).split(/[,;]+/).map((item) => item.trim()).filter(Boolean)
    : [];

  const painsArray = Array.isArray(source.pains)
    ? source.pains.map((item) => sanitizeText(item)).filter(Boolean)
    : [];

  const pain = pickNonEmpty(
    sanitizeText(source.pain),
    painsArray[0]
  );

  const innovation = pickNonEmpty(
    sanitizeText(source.innovation),
    sanitizeText(source.uniqueness)
  );

  const tempCandidate = typeof source.temperature === "number"
    ? source.temperature
    : typeof body.temperature === "number"
    ? body.temperature
    : 0.7;

  return {
    category: pickNonEmpty(category, "Новый продукт"),
    name,
    audience: audienceList.join(", "),
    audienceList,
    pain,
    innovation,
    temperature: clamp(Number.isFinite(tempCandidate) ? tempCandidate : 0.7, 0, 1)
  };
}

function buildUserMessage(input) {
  return [
    "Вводные:",
    `Категория: ${input.category || "-"}`,
    input.name ? `Предпочитаемое название: ${input.name}` : "Название: придумай убедительное рабочее имя",
    `Целевая аудитория: ${input.audience || "-"}`,
    `Потребительская боль: ${input.pain || "-"}`,
    `Уникальность: ${input.innovation || "-"}`,
    `Температура (креативность): ${input.temperature}`
  ].join("\n");
}

function extractBlock(rawDraft, key) {
  if (!rawDraft || typeof rawDraft !== "object") {
    return null;
  }
  const candidate = rawDraft.blocks?.[key] ?? rawDraft[key];
  if (Array.isArray(candidate) || (candidate && typeof candidate === "object")) {
    return candidate;
  }
  return null;
}

function extractAnswer(rawBlock, item, index) {
  if (!rawBlock) {
    return "";
  }

  if (Array.isArray(rawBlock)) {
    const byNo = rawBlock.find((entry) => matchesNo(entry, item.no));
    if (byNo !== undefined) {
      return sanitizeText(byNo);
    }
    if (rawBlock[index] !== undefined) {
      return sanitizeText(rawBlock[index]);
    }
    return "";
  }

  if (typeof rawBlock === "object") {
    const byNo = rawBlock[item.no];
    if (byNo !== undefined) {
      return sanitizeText(byNo);
    }
    if (rawBlock[item.question] !== undefined) {
      return sanitizeText(rawBlock[item.question]);
    }
    const lowerQuestion = item.question.toLowerCase();
    for (const [key, value] of Object.entries(rawBlock)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes(item.no) || lowerKey.includes(lowerQuestion)) {
        return sanitizeText(value);
      }
    }
  }

  return "";
}

function normalizeList(value, fallbackList) {
  const result = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const text = sanitizeText(item);
      if (text) {
        result.push(text);
      }
    });
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => {
      const text = sanitizeText(item);
      if (text) {
        result.push(text);
      }
    });
  } else {
    const text = sanitizeText(value);
    if (text) {
      text
        .split(/\r?\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => result.push(part));
    }
  }

  return result.length ? result : fallbackList;
}

function extractFirstJson(content) {
  if (!content) {
    return null;
  }

  if (Array.isArray(content)) {
    const combined = content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object") {
          return part.text || part.content || "";
        }
        return "";
      })
      .join("\n");
    return extractFirstJson(combined);
  }

  const text = String(content);
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const direct = safeParseJson(cleaned);
  if (direct) {
    return direct;
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return safeParseJson(cleaned.slice(start, end + 1));
  }
  return null;
}

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeText(item)).filter(Boolean).join(" ");
  }
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

function pickNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function matchesNo(entry, no) {
  if (!entry) {
    return false;
  }
  if (typeof entry === "object") {
    const candidate = entry.no || entry.code || entry.number;
    return candidate ? String(candidate).trim() === no : false;
  }
  return false;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const NORTHERN_PREFIXES = [
  "Nord",
  "Polar",
  "Aurora",
  "Arctic",
  "Fjord",
  "Glacier",
  "Star",
  "Ice",
  "Frost",
  "Lumina",
  "Boreal"
];

const NORTHERN_SUFFIXES = [
  "Origin",
  "Pulse",
  "Harvest",
  "Fresh",
  "Glow",
  "Wave",
  "Bloom",
  "Peak",
  "Sense",
  "Crest",
  "Line"
];

function generatePolarName(category = "") {
  const seed = String(category || "").toLowerCase();
  const prefixIndex = Math.abs(hashCode(`${seed}::prefix`)) % NORTHERN_PREFIXES.length;
  const suffixIndex = Math.abs(hashCode(`${seed}::suffix`)) % NORTHERN_SUFFIXES.length;
  return `${NORTHERN_PREFIXES[prefixIndex]} ${NORTHERN_SUFFIXES[suffixIndex]}`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}

function safeParseJson(text) {
  try {
    return JSON.parse(String(text));
  } catch (error) {
    return null;
  }
}
