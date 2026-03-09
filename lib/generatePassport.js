const fs = require("fs");
const path = require("path");
const fetch = global.fetch || require("cross-fetch");

const REF_DIR = path.join(process.cwd(), "reference");

function safeRead(file) {
  try {
    return fs.readFileSync(path.join(REF_DIR, file), "utf8");
  } catch (error) {
    return "";
  }
}

function truncateText(text, max = 16000) {
  const source = String(text || "").trim();
  if (!source) return "";
  if (source.length <= max) return source;
  return `${source.slice(0, max)}\n\n[ПРЕДПОЛОЖЕНИЕ: reference усечён для экономии токенов]`;
}

const METHODOLOGY_REFERENCE = truncateText(
  safeRead("methodology_meatcode.md"),
  16000
);

const INCLUDE_KEYS = [
  "header.category",
  "header.name",
  "header.audience",
  "header.pain",
  "header.uniqueness",
  "1.1",
  "1.2",
  "1.3",
  "1.4",
  "1.5",
  "2.1",
  "2.2",
  "2.3",
  "2.4",
  "2.5",
  "3.1",
  "3.2",
  "3.3",
  "3.4",
  "3.5",
  "4.1",
  "4.2",
  "4.3",
  "4.4",
  "4.5",
  "tech",
  "packaging",
  "star",
  "conclusion"
];

const FIXED_TEMPERATURE = 0.18;

const BLOCK_SCHEMAS = {
  cognitive: [
    {
      no: "1.1",
      question: "Какую потребительскую боль используем для создания дизрапта?"
    },
    {
      no: "1.2",
      question: "Изменение модели потребления: какой новый рынок открываем?"
    },
    {
      no: "1.3",
      question:
        "Изменение технологии потребления: какие новые привычки потребления внедряем?"
    },
    {
      no: "1.4",
      question:
        "Нарративы: как объясняем, что инновация нужна, полезна, выгодна?"
    },
    {
      no: "1.5",
      question:
        "На работе с какими когнитивными функциями потребителя фокусируемся?"
    }
  ],
  sensory: [
    { no: "2.1", question: "Сильный визуальный образ" },
    { no: "2.2", question: "Сильный аудиальный образ" },
    { no: "2.3", question: "Сильный обонятельный образ" },
    { no: "2.4", question: "Сильный осязательный образ" },
    { no: "2.5", question: "Сильный вкусовой образ" }
  ],
  branding: [
    {
      no: "3.1",
      question:
        "Как улучшаем личную историю и самоидентификацию потребителя?"
    },
    {
      no: "3.2",
      question: "Какой контекст поможет развить бренд? Какой помешает?"
    },
    {
      no: "3.3",
      question:
        "Сильное ядро бренда: название, логотип, слоган, суть, доп. элементы"
    },
    {
      no: "3.4",
      question: "Уникальный путь клиента с продуктом и брендом (опыт бренда)"
    },
    {
      no: "3.5",
      question: "Стратегия развития бренда на 3–5–10 лет"
    }
  ],
  marketing: [
    { no: "4.1", question: "Сегментация / Позиционирование" },
    {
      no: "4.2",
      question: "Описание базового продукта и его развитие во времени"
    },
    { no: "4.3", question: "Развитие ценообразования" },
    { no: "4.4", question: "Развитие каналов сбыта" },
    {
      no: "4.5",
      question: "Продвижение (с фокусом на безбюджетный маркетинг)"
    }
  ]
};

function defaultInclude() {
  const include = {};
  INCLUDE_KEYS.forEach((key) => {
    include[key] = true;
  });
  return include;
}

function normalizeInclude(body) {
  const raw =
    body && typeof body.include === "object" && body.include !== null
      ? body.include
      : {};
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

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeText(item)).filter(Boolean).join("\n");
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

function cleanupAnswer(text) {
  return sanitizeText(text)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pickNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function containsLatin(text) {
  return /[A-Za-z]/.test(String(text || ""));
}

function cleanBrandName(name) {
  return String(name || "")
    .replace(/[«»"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const RUSSIAN_PREFIXES = [
  "Чистый",
  "Верный",
  "Сильный",
  "Живой",
  "Точный",
  "Добрый",
  "Новый",
  "Главный",
  "Родной",
  "Ясный",
  "Крепкий",
  "Сытный"
];

const RUSSIAN_SUFFIXES = [
  "Источник",
  "Выбор",
  "Формат",
  "Ритм",
  "Вкус",
  "Подход",
  "Импульс",
  "Баланс",
  "Стандарт",
  "Результат",
  "Запас",
  "Код"
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function generateRussianBrandName(category = "") {
  const seed = String(category || "").toLowerCase();
  const prefixIndex =
    Math.abs(hashCode(`${seed}::ru_prefix`)) % RUSSIAN_PREFIXES.length;
  const suffixIndex =
    Math.abs(hashCode(`${seed}::ru_suffix`)) % RUSSIAN_SUFFIXES.length;

  return `${RUSSIAN_PREFIXES[prefixIndex]} ${RUSSIAN_SUFFIXES[suffixIndex]}`;
}

function enforceRussianBrandName(name, category = "") {
  const cleaned = cleanBrandName(name);

  if (!cleaned) return generateRussianBrandName(category);
  if (containsLatin(cleaned)) return generateRussianBrandName(category);

  const finalName = cleaned.replace(/[^А-Яа-яЁё0-9\s\-]/g, "").trim();
  return finalName || generateRussianBrandName(category);
}

function normalizeMeaningfulText(text, fallback = "") {
  const cleaned = cleanupAnswer(text);
  if (!cleaned) return fallback;

  const value = cleaned.toLowerCase();
  const badPatterns = [
    "нужно чётко описать",
    "нужно четко описать",
    "нужно уточнить",
    "требуется уточнить",
    "нужно содержательно раскрыть",
    "новый продукт",
    "aurora sense",
    "polar star",
    "frost peak"
  ];

  if (badPatterns.some((pattern) => value.includes(pattern))) {
    return fallback;
  }

  return cleaned;
}

function normalizeList(value, fallbackList = []) {
  const result = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const text = sanitizeText(item);
      if (text) result.push(text);
    });
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => {
      const text = sanitizeText(item);
      if (text) result.push(text);
    });
  } else {
    const text = sanitizeText(value);
    if (text) {
      text
        .split(/\n+/)
        .map((part) =>
          part
            .replace(/^[\-\u2022]\s*/, "")
            .replace(/^\d+[.)]\s*/, "")
            .trim()
        )
        .filter(Boolean)
        .forEach((part) => result.push(part));
    }
  }

  return result.length ? result : fallbackList;
}

function matchesNo(entry, no) {
  if (!entry) return false;

  if (typeof entry === "object") {
    const candidate = entry.no || entry.code || entry.number;
    return candidate ? String(candidate).trim() === no : false;
  }

  return false;
}

function extractBlock(rawDraft, key) {
  if (!rawDraft || typeof rawDraft !== "object") return null;

  const candidate = rawDraft.blocks?.[key] ?? rawDraft[key];
  if (Array.isArray(candidate) || (candidate && typeof candidate === "object")) {
    return candidate;
  }

  return null;
}

function extractAnswer(rawBlock, item, index) {
  if (!rawBlock) return "";

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

function safeParseJson(text) {
  try {
    return JSON.parse(String(text));
  } catch (error) {
    return null;
  }
}

function extractFirstJson(content) {
  if (!content) return null;

  if (Array.isArray(content)) {
    const combined = content
      .map((part) => {
        if (typeof part === "string") return part;
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
  if (direct) return direct;

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return safeParseJson(cleaned.slice(start, end + 1));
  }

  return null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeInput(body) {
  const source =
    body && typeof body.form === "object" && body.form !== null
      ? body.form
      : body || {};

  const category = sanitizeText(source.category);
  const name = sanitizeText(source.name || source.productName);

  const audienceList = Array.isArray(source.audience)
    ? source.audience.map((item) => sanitizeText(item)).filter(Boolean)
    : sanitizeText(source.audience)
      ? sanitizeText(source.audience)
          .split(/[,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  const painsArray = Array.isArray(source.pains)
    ? source.pains.map((item) => sanitizeText(item)).filter(Boolean)
    : [];

  const pain = pickNonEmpty(sanitizeText(source.pain), painsArray[0]);

  const innovation = pickNonEmpty(
    sanitizeText(source.innovation),
    sanitizeText(source.uniqueness)
  );

  const comment = sanitizeText(source.comment);

  const diagnostics =
    source.diagnostics && typeof source.diagnostics === "object"
      ? source.diagnostics
      : {};

  return {
    category: pickNonEmpty(category, "Новый продукт"),
    name,
    audience: audienceList.join(", "),
    audienceList,
    pain,
    innovation,
    comment,
    diagnostics,
    temperature: FIXED_TEMPERATURE
  };
}

function buildSystemPrompt(enabledSchemas, include) {
  const blockList = [];

  Object.entries(enabledSchemas).forEach(([key, items]) => {
    items.forEach((item) => {
      blockList.push(`${key}.${item.no}: ${item.question}`);
    });
  });

  const sections = [];
  if (blockList.length) {
    sections.push("Обязательные секции и вопросы:\n" + blockList.join("\n"));
  }
  if (include.tech !== false) sections.push("tech");
  if (include.packaging !== false) sections.push("packaging");
  if (include.star !== false) sections.push("star");
  if (include.conclusion !== false) sections.push("conclusion");

  return [
    "Ты — сильный русскоязычный стратег по когнитивно-сенсорному маркетингу и бренд-платформам.",
    "Работай строго на русском языке.",
    "Верни только валидный JSON. Без markdown, без пояснений до или после JSON.",
    'Структура ответа строго такая: { "header": { "category": string, "name": string, "audience": string, "pain": string, "uniqueness": string }, "blocks": { "cognitive": [{ "no": string, "question": string, "answer": string }], "sensory": [{ "no": string, "question": string, "answer": string }], "branding": [{ "no": string, "question": string, "answer": string }], "marketing": [{ "no": string, "question": string, "answer": string }] }, "tech"?: string[] | string, "packaging"?: string[] | string, "star"?: string[] | string, "conclusion"?: string }',
    "Ты не пишешь анкету. Ты пишешь сильный стратегический паспорт продукта.",
    "Каждый answer должен быть плотным, прикладным и содержательным.",
    "Внутри одного answer можно использовать подпункты, короткие списки, метки вроде «Новый рынок:», «Ритуал:», «KPI:», «Референсы:», если это усиливает ответ.",
    "Пустые фразы, placeholder'ы, мета-комментарии и ответы из 1–2 слов запрещены.",
    "Название продукта в header.name должно быть только на русском языке. Латиница запрещена.",
    "Если пользователь дал латинское название — придумай сильный русский эквивалент.",
    "Если данных мало, аккуратно дострой их, но текст должен оставаться правдоподобным, коммерчески осмысленным и зрелым.",
    "Особенно важно: ответы должны быть пригодны для вставки в бизнес-документ.",
    "Главный reference по структуре, уровню детализации и зрелости:",
    METHODOLOGY_REFERENCE,
    sections.length
      ? "Секции, которые нужно включить:\n" + sections.join("\n")
      : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildUserMessage(input, include) {
  const parts = [
    "Ниже вводные пользователя. На их основе собери сильный стратегический паспорт продукта.",
    `Категория: ${input.category || "-"}`,
    input.name
      ? `Желаемое название: ${input.name}`
      : "Название: придумай сильное русское название без латиницы",
    `Целевая аудитория: ${input.audience || "-"}`,
    `Потребительская боль: ${input.pain || "-"}`,
    `Уникальность / инновация: ${input.innovation || "-"}`,
    `Рабочая температура модели: ${FIXED_TEMPERATURE}`
  ];

  if (input.comment && input.comment.trim()) {
    parts.push(`Дополнительные комментарии пользователя: ${input.comment}`);
  }

  if (include && typeof include === "object") {
    const enabledList = Object.entries(include)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
    if (enabledList.length > 0) {
      parts.push(`Заполни только эти секции: ${enabledList.join(", ")}`);
    }
  }

  if (input.diagnostics && typeof input.diagnostics === "object") {
    const selectedDiagnostics = Object.entries(input.diagnostics)
      .filter(([, value]) => value === "yes")
      .map(([key]) => key);

    if (selectedDiagnostics.length > 0) {
      parts.push(
        `Особенно внимательно проработай эти секции: ${selectedDiagnostics.join(", ")}`
      );
    }
  }

  parts.push(
    "Важно: не превращай документ в анкету. Нужен плотный, убедительный, прикладной и взрослый текст."
  );

  return parts.join("\n");
}

async function callTextModel(messages, temperature) {
  if (!process.env.QWEN_API_URL || !process.env.QWEN_API_KEY) {
    console.error("[generate] Missing QWEN_API_* env vars");
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
        temperature: clamp(
          Number.isFinite(temperature) ? temperature : FIXED_TEMPERATURE,
          0,
          1
        ),
        top_p: 0.9
      })
    });

    if (!response) {
      console.error("[generate] fetch returned empty response");
      return null;
    }

    const rawText = await response.text().catch(() => "");
    console.log("[generate] callTextModel status:", response.status);
    console.log(
      "[generate] callTextModel rawText (first 5000 chars):",
      rawText.slice(0, 5000)
    );

    if (!response.ok) {
      console.error("[generate:text] bad response", response.status, rawText);
      return null;
    }

    const parsedResponse = safeParseJson(rawText);
    const rawContent =
      parsedResponse?.choices?.[0]?.message?.content ??
      parsedResponse?.choices?.[0]?.text ??
      rawText;

    return extractFirstJson(rawContent) || extractFirstJson(rawText);
  } catch (error) {
    console.error("[generate:text] error", error);
    return null;
  }
}

function buildFallbackDraft(input, include) {
  const inc = include || defaultInclude();
  const enabledSchemas = getEnabledSchemas(inc);

  const category = pickNonEmpty(input.category, "Новый продукт");
  const name = enforceRussianBrandName(
    pickNonEmpty(input.name, generateRussianBrandName(input.category)),
    input.category
  );

  const audienceList = Array.isArray(input.audienceList) ? input.audienceList : [];
  const audience = pickNonEmpty(
    input.audience,
    audienceList.length
      ? audienceList.join(", ")
      : "Потребители, которым важны понятная польза, удобство и ощущение правильного выбора"
  );

  const pain = pickNonEmpty(
    input.pain,
    "У аудитории есть неудобный, устаревший или эмоционально слабый сценарий потребления, который продукт должен резко улучшить"
  );

  const innovation = pickNonEmpty(
    input.innovation,
    "Продукт соединяет удобство, практическую пользу и более современную логику потребления"
  );

  const categoryText = category.trim();
  const categoryLower = categoryText.toLowerCase();
  const audienceText = audience.trim();
  const painText = pain.trim();
  const innovationText = innovation.trim();
  const nameText = name.trim();

  const header = {};
  if (inc["header.category"] !== false) header.category = categoryText;
  if (inc["header.name"] !== false) header.name = nameText;
  if (inc["header.audience"] !== false) header.audience = audienceText;
  if (inc["header.pain"] !== false) header.pain = painText;
  if (inc["header.uniqueness"] !== false) header.uniqueness = innovationText;

  const fallbackAnswers = {
    cognitive: [
      [
        `Ключевая боль в категории ${categoryLower} заключается в том, что потребителю сложно получить понятный, чистый и современный результат без компромиссов.`,
        "Для дизрапта важно атаковать не абстрактную потребность, а конкретный сбой в привычном сценарии потребления.",
        `Продукт должен показывать, что проблема не в самой категории, а в том, как неудобно она устроена сейчас.`,
        "Именно на этом разрыве между привычным и желаемым возникает новый спрос."
      ].join("\n"),
      [
        `Новый рынок открывается не за счёт фантазийной категории, а за счёт переупаковки ${categoryLower} под другой сценарий использования.`,
        `Продукт переводит аудиторию ${audienceText} из режима «мириться с компромиссами» в режим «получать результат без лишнего трения».`,
        "Ценность возникает не только из состава или цены, но и из новой логики потребления.",
        "Так категория начинает восприниматься как более современная и более достойная регулярной покупки."
      ].join("\n"),
      [
        "Новая технология потребления должна внедрять повторяемый ритуал, который легко воспроизводится в реальной жизни.",
        "Продукт должен встраиваться в бытовой, дорожный, рабочий или семейный сценарий так, чтобы им было удобно пользоваться без подготовки.",
        "Важно не просто продать товар, а закрепить новую норму поведения.",
        "Именно привычка, а не разовая новизна, делает решение сильным."
      ].join("\n"),
      [
        "Нарратив должен объяснять, почему инновация нужна именно сейчас и почему старый способ потребления уже морально устарел.",
        "Коммуникация строится вокруг простой прикладной мысли: продукт снимает лишнее напряжение, экономит время и делает результат более чистым.",
        "Объяснение должно быть не технократическим, а жизненным: что именно меняется в опыте человека и почему это выгодно.",
        "Сильный нарратив превращает новинку из странной идеи в очевидный шаг вперёд."
      ].join("\n"),
      [
        "Фокус в когнитивной модели делается на чувстве контроля, ясности выбора и снижении внутреннего сомнения.",
        "Потребитель должен чувствовать не просто удовольствие от покупки, а удовлетворение от того, что выбрал более зрелое решение.",
        "Одновременно важно включить эмоциональную функцию самоуважения: человек пользуется тем, что действительно работает.",
        "Такая связка рационального оправдания и эмоционального подкрепления делает продукт устойчивым в голове аудитории."
      ].join("\n")
    ],
    sensory: [
      [
        "Визуальный образ должен мгновенно передавать идею современного, чистого и продуманного продукта.",
        "Лучше использовать крупный доминирующий элемент, читаемую композицию и один сильный визуальный код, который повторяется в упаковке и digital.",
        "Важно избегать хаоса, дешёвых эффектов и визуального шума.",
        "Визуал должен работать как аргумент в пользу качества и контроля."
      ].join("\n"),
      [
        "Аудиальный образ нужен как подтверждение качества взаимодействия с продуктом.",
        "Это может быть узнаваемый звук открытия, щелчок фиксации или короткий звуковой код в рекламе.",
        "Аудиальный слой должен усиливать восприятие точности, собранности и уверенности.",
        "Он не должен быть навязчивым, но должен быть узнаваемым."
      ].join("\n"),
      [
        "Обонятельный образ должен работать в пользу доверия, а не перегружать человека.",
        "Если категория предполагает аромат, он должен считываться как натуральный, чистый и уместный.",
        "Если продукт связан с едой, запах обязан усиливать аппетит и ощущение качества.",
        "Запах не должен давать ощущения химозности или тяжёлого хвоста."
      ].join("\n"),
      [
        "Осязательный образ должен быть частью пользовательского опыта.",
        "Поверхность упаковки, сопротивление материала и логика открытия должны подтверждать обещание бренда.",
        "Тактильность особенно важна там, где решение принимается быстро и до момента использования.",
        "Если на ощупь продукт кажется дешёвым, маркетинговое обещание рушится ещё до покупки."
      ].join("\n"),
      [
        "Вкусовой образ должен быть не просто приятным, а стратегически связанным с позиционированием.",
        "Вкус обязан подтверждать заявленную пользу, не уходя ни в карикатурную полезность, ни в плоскую нейтральность.",
        "Важно удержать баланс между удовольствием, запоминаемостью и повторяемостью.",
        "Сильный вкусовой код закрепляет категорию в памяти и превращает первое знакомство в привычку."
      ].join("\n")
    ],
    branding: [
      [
        "История бренда должна усиливать самоидентификацию потребителя: не просто «я это покупаю», а «я именно такой человек».",
        "Бренд помогает человеку увидеть себя более собранным, современным и требовательным к качеству собственной жизни.",
        "История должна быть не сказочной, а социальной и узнаваемой.",
        "Через такую рамку бренд получает право стоить дороже и быть предметом рекомендаций."
      ].join("\n"),
      [
        "Благоприятный контекст для роста бренда — среды, где ценятся осознанность, функциональность, эстетика выбора и понятная польза.",
        "Неблагоприятный контекст — пространства, где решение принимается только по минимальной цене.",
        "Поэтому бренд нужно развивать там, где аудитория готова ценить продуманность, а не только базовую функцию.",
        "Контекст роста и контекст помех должны быть определены заранее."
      ].join("\n"),
      [
        `Ядро бренда должно быть жёстким и легко считываемым: русское имя ${nameText}, понятная смысловая ось, ясный визуальный знак и короткий слоган.`,
        "Название должно работать как культурный маркер, а не как случайный набор звуков.",
        "Логотип обязан быть воспроизводимым, а слоган — объяснять не всё подряд, а главное обещание.",
        "Дополнительные элементы бренда должны усиливать узнаваемость."
      ].join("\n"),
      [
        "Путь клиента должен быть выстроен как последовательность снижения недоверия и усиления повторной покупки.",
        "Сначала человек замечает продукт за счёт ясного сигнала и понятной категории, затем получает быстрый пробный опыт.",
        "Далее отношение закрепляется через удобство использования и подтверждённую ценность.",
        "Лояльность возникает не из случайной симпатии, а из повторяемого положительного опыта."
      ].join("\n"),
      [
        "Стратегия развития бренда на 3–5–10 лет должна быть реалистичной и последовательной.",
        "На первом горизонте задача — доказать право продукта на существование и закрепиться в понятных каналах.",
        "На среднем горизонте — расширить линейку, усилить ритуалы потребления и получить повторяемый спрос.",
        "На длинном горизонте — стать маркером категории и создавать стандарты."
      ].join("\n")
    ],
    marketing: [
      [
        "Сегментация должна идти не только по полу, возрасту и доходу, а по логике неудобства, которое человек хочет снять.",
        `Продукт для категории ${categoryLower} нужно позиционировать как решение конкретной жизненной ситуации.`,
        "Это позволяет сделать коммуникацию более жёсткой, а оффер — более убедительным.",
        "Чем точнее определён сценарий, тем выше шанс, что продукт попадёт в повторяемую покупку."
      ].join("\n"),
      [
        "Базовый продукт должен закрывать наиболее частотный сценарий, а развитие линейки — расширять ритуал, не ломая ядро позиционирования.",
        "На старте нужно дать понятный и легко тестируемый формат, в котором польза, удобство и отличие считываются сразу.",
        "Затем уже можно добавлять вкусы, версии, размеры, лимитки и специальные режимы использования.",
        "Линейка должна расти как логическое продолжение первой сильной версии."
      ].join("\n"),
      [
        "Ценообразование должно объяснять ценность, а не маскировать слабость продукта.",
        "Цена обязана быть связана с удобством, качеством опыта и продуманностью форм-фактора.",
        "Если стратегия строится только на доступности, бренд рискует скатиться в серую зону замены без лица.",
        "Сильнее работает модель, где базовая цена оправдана, а рост среднего чека обеспечивается наборами и сценарным потреблением."
      ].join("\n"),
      [
        "Каналы сбыта надо выстраивать по принципу контекстной уместности.",
        "Продукт должен появляться там, где потребность возникает естественно, а не только там, где дешёвый доступ к полке.",
        "На старте полезнее зайти в более точные и репутационно сильные каналы.",
        "Когда канал совпадает со сценарием потребления, конверсия и доверие растут заметно быстрее."
      ].join("\n"),
      [
        "Продвижение должно опираться на демонстрацию нового сценария и на простые доказательства, а не на общую красивость.",
        "Особенно важны форматы, где человек быстро понимает: что это, почему это удобнее и зачем это нужно именно ему.",
        "Безбюджетное продвижение строится вокруг UGC, амбассадоров, точечных коллабораций и пробного опыта.",
        "Хорошее продвижение не развлекает отдельно от продукта, а закрепляет ритуал покупки."
      ].join("\n")
    ]
  };

  const fallbackBlocks = {};
  Object.entries(enabledSchemas).forEach(([key, schema]) => {
    fallbackBlocks[key] = schema.map((item, index) => ({
      no: item.no,
      question: item.question,
      answer:
        fallbackAnswers[key][index] ||
        `Нужно содержательно раскрыть вопрос: ${item.question.toLowerCase()}.`
    }));
  });

  const techLines = [
    `Технологическая логика продукта в категории ${categoryLower} должна быть прозрачной для потребителя и убедительной для канала продаж.`,
    `Ключевая инновация продукта: ${innovationText}. Она должна выражаться не только в обещании, но и в реальном пользовательском опыте.`,
    "Состав, производственная логика и контроль качества должны поддерживать главный тезис бренда, а не противоречить ему.",
    "При разработке важно заранее учитывать масштабирование, повторяемость качества и стабильность восприятия."
  ];

  const packagingLines = [
    "Упаковка должна быть удобной в реальном использовании и визуально отличимой на полке.",
    "Форм-фактор обязан поддерживать основной сценарий потребления, а не мешать ему.",
    "Нужно предусмотреть понятную иерархию информации на лицевой стороне: что это, зачем это, в чём отличие.",
    "Материалы и механика открытия должны поддерживать ощущение качества и контроля."
  ];

  const starLines = [
    `Продукт ${nameText} закрывает конкретную боль: ${painText}.`,
    `Он создаёт более современный и менее компромиссный сценарий потребления в категории ${categoryLower}.`,
    `Его отличие не декоративное, а монетизируемое: ${innovationText}.`,
    "У него есть потенциал стать не просто SKU, а узнаваемым маркером новой логики категории."
  ];

  const conclusionText = `Продукт ${nameText} в категории ${categoryText} имеет потенциал не за счёт декоративной новизны, а за счёт точного попадания в реальную потребительскую боль, сильной сценарной логики и ясного брендового ядра. Следующий шаг — проверить формулировки, визуальный код и продуктовый формат на живой аудитории, чтобы закрепить наиболее сильную версию позиционирования и довести её до коммерчески устойчивой модели.`;

  const result = { header, blocks: fallbackBlocks };
  if (inc.tech !== false) result.tech = techLines.join("\n");
  if (inc.packaging !== false) result.packaging = packagingLines.join("\n");
  if (inc.star !== false) result.star = starLines.join("\n");
  if (inc.conclusion !== false) result.conclusion = conclusionText;

  return result;
}

function normalizeDraft(rawDraft, input, include) {
  const inc = include || defaultInclude();
  const enabledSchemas = getEnabledSchemas(inc);
  const fallback = buildFallbackDraft(input, inc);

  if (!rawDraft || typeof rawDraft !== "object") {
    return fallback;
  }

  const header = {};

  if (inc["header.category"] !== false) {
    header.category = normalizeMeaningfulText(
      pickNonEmpty(
        sanitizeText(rawDraft.header?.category),
        sanitizeText(rawDraft.category),
        fallback.header.category
      ),
      fallback.header.category
    );
  }

  if (inc["header.name"] !== false) {
    const rawName = pickNonEmpty(
      sanitizeText(rawDraft.header?.name),
      sanitizeText(rawDraft.name),
      fallback.header.name
    );
    header.name = enforceRussianBrandName(rawName, input.category);
  }

  if (inc["header.audience"] !== false) {
    header.audience = normalizeMeaningfulText(
      pickNonEmpty(
        sanitizeText(rawDraft.header?.audience),
        sanitizeText(rawDraft.audience),
        fallback.header.audience
      ),
      fallback.header.audience
    );
  }

  if (inc["header.pain"] !== false) {
    header.pain = normalizeMeaningfulText(
      pickNonEmpty(
        sanitizeText(rawDraft.header?.pain),
        sanitizeText(rawDraft.pain),
        fallback.header.pain
      ),
      fallback.header.pain
    );
  }

  if (inc["header.uniqueness"] !== false) {
    header.uniqueness = normalizeMeaningfulText(
      pickNonEmpty(
        sanitizeText(rawDraft.header?.uniqueness),
        sanitizeText(rawDraft.header?.innovation),
        sanitizeText(rawDraft.innovation),
        fallback.header.uniqueness
      ),
      fallback.header.uniqueness
    );
  }

  const blocks = {};
  Object.entries(enabledSchemas).forEach(([key, schema]) => {
    const rawBlock = extractBlock(rawDraft, key);
    const fallbackBlock = fallback.blocks[key] || [];

    blocks[key] = schema.map((item, index) => {
      const fallbackItem = fallbackBlock[index];
      const rawAnswer = pickNonEmpty(
        extractAnswer(rawBlock, item, index),
        fallbackItem?.answer
      );

      return {
        no: item.no,
        question: item.question,
        answer: normalizeMeaningfulText(rawAnswer, fallbackItem?.answer || "")
      };
    });
  });

  const out = { header, blocks };

  if (inc.tech !== false) {
    const arr = normalizeList(rawDraft.tech, normalizeList(fallback.tech));
    out.tech = arr.length ? arr.join("\n") : fallback.tech;
  }

  if (inc.packaging !== false) {
    const pack = normalizeMeaningfulText(
      pickNonEmpty(sanitizeText(rawDraft.packaging), fallback.packaging),
      fallback.packaging
    );
    if (pack) out.packaging = pack;
  }

  if (inc.star !== false) {
    const arr = normalizeList(rawDraft.star, normalizeList(fallback.star));
    out.star = arr.length ? arr.join("\n") : fallback.star;
  }

  if (inc.conclusion !== false) {
    out.conclusion = normalizeMeaningfulText(
      pickNonEmpty(
        sanitizeText(rawDraft.conclusion),
        sanitizeText(rawDraft.summary),
        fallback.conclusion
      ),
      fallback.conclusion
    );
  }

  return out;
}

async function runGenerate(body) {
  const include = normalizeInclude(body);
  const input = normalizeInput(body);
  const enabledSchemas = getEnabledSchemas(include);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[generate] included sections:",
      Object.keys(enabledSchemas).join(", ")
    );
  }

  const systemPrompt = buildSystemPrompt(enabledSchemas, include);
  const userContent = buildUserMessage(input, include);

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];

  const llmDraft = await callTextModel(messages, FIXED_TEMPERATURE);
  const draft = normalizeDraft(llmDraft, input, include);

  return draft;
}

module.exports = {
  runGenerate
};