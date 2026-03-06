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

const METHODOLOGY_REFERENCE = safeRead("methodology_meatcode.md");

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
      question:
        "Изменение модели потребления: новый рынок, какие старые решения заменяем, какая появляется дополнительная монетизируемая ценность"
    },
    {
      no: "1.2",
      question:
        "Изменение технологии потребления: старые ритуалы vs новые ритуалы, какие новые привычки нужно внедрить"
    },
    {
      no: "1.3",
      question:
        "Нарративы: три формулировки пользы новой технологии в формате коммуникации, с референсами брендов и применением"
    },
    {
      no: "1.4",
      question:
        "Желаемая когнитивная модель: мысли, чувства, поведение, которые должен вызывать продукт"
    },
    {
      no: "1.5",
      question:
        "Обучение потребителей: каналы, форматы, механики, KPI и способы внедрения новой логики потребления"
    }
  ],
  sensory: [
    {
      no: "2.1",
      question:
        "Визуальный образ: желаемый опыт, измеримая цель, протокол теста, критерий приёмки, технические рекомендации"
    },
    {
      no: "2.2",
      question:
        "Аудиальный образ: желаемый опыт, измеримая цель, протокол теста, критерий приёмки, технические рекомендации"
    },
    {
      no: "2.3",
      question:
        "Обонятельный образ: желаемый опыт, измеримая цель, протокол теста, критерий приёмки, технические рекомендации"
    },
    {
      no: "2.4",
      question:
        "Осязательный образ: желаемый опыт, измеримая цель, протокол теста, критерий приёмки, технические рекомендации"
    },
    {
      no: "2.5",
      question:
        "Вкусовой образ: желаемый опыт, измеримая цель, протокол теста, критерий приёмки, технические рекомендации"
    }
  ],
  branding: [
    {
      no: "3.1",
      question:
        "Сильная история и обещание бренда: 2 варианта истории, brand promise, что именно обещает бренд"
    },
    {
      no: "3.2",
      question:
        "Контекст: благоприятные и неблагоприятные факторы среды, что поможет бренду, что помешает"
    },
    {
      no: "3.3",
      question:
        "Ядро бренда: русское название, логика логотипа, слоган, уникальные атрибуты, смысловой каркас"
    },
    {
      no: "3.4",
      question:
        "Путь клиента и опыт бренда: этапы, точки контакта, сценарий интеграции в жизнь клиента"
    },
    {
      no: "3.5",
      question:
        "Стратегия развития бренда по горизонтам: 1 год, 3 года, 5 лет, 10 лет"
    }
  ],
  marketing: [
    {
      no: "4.1",
      question:
        "Сегментация: ключевые сегменты, их потребности и каналы привлечения"
    },
    {
      no: "4.2",
      question:
        "Базовый продукт и roadmap: стартовая SKU-логика, развитие и продуктовая линия"
    },
    {
      no: "4.3",
      question:
        "Ценообразование: основные форматы продажи, цена и обоснование"
    },
    {
      no: "4.4",
      question:
        "Каналы сбыта: этап запуска, этап роста, этап масштаба"
    },
    {
      no: "4.5",
      question:
        "Продвижение: 5 тактик, KPI, логика безбюджетного и условно-безбюджетного продвижения"
    }
  ]
};

function defaultInclude() {
  const inc = {};
  INCLUDE_KEYS.forEach((k) => {
    inc[k] = true;
  });
  return inc;
}

function normalizeInclude(body) {
  const raw =
    body && typeof body.include === "object" && body.include !== null
      ? body.include
      : {};
  const inc = defaultInclude();

  INCLUDE_KEYS.forEach((k) => {
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
  const blockList = [];

  Object.entries(enabledSchemas).forEach(([key, items]) => {
    items.forEach((item) => {
      blockList.push(`${key}.${item.no}: ${item.question}`);
    });
  });

  const sections = [];
  if (blockList.length) {
    sections.push(
      "Обязательные секции и вопросы:\n" + blockList.join("\n")
    );
  }
  if (include.tech !== false) sections.push("tech");
  if (include.packaging !== false) sections.push("packaging");
  if (include.star !== false) sections.push("star");
  if (include.conclusion !== false) sections.push("conclusion");

  return [
    "Ты — жёсткий и взрослый стратег по когнитивно-сенсорному маркетингу, бренд-платформе и продуктовой логике.",
    "Работай строго на русском языке.",
    "Верни только валидный JSON. Никакого markdown вокруг JSON, никаких пояснений до или после.",
    'Структура ответа строго такая: { "header": { "category": string, "name": string, "audience": string, "pain": string, "uniqueness": string }, "blocks": { "cognitive": [{ "no": string, "question": string, "answer": string }], "sensory": [{ "no": string, "question": string, "answer": string }], "branding": [{ "no": string, "question": string, "answer": string }], "marketing": [{ "no": string, "question": string, "answer": string }] }, "tech"?: string[] | string, "packaging"?: string[] | string, "star"?: string[] | string, "conclusion"?: string }',
    "Ты не пишешь анкету. Ты пишешь содержательный стратегический паспорт уровня сильного редакторского документа.",
    "Ответы не должны быть короткими общими фразами. Каждый answer должен быть плотным, прикладным и структурным.",
    "Запрещены пустые формулировки, вода, штампы, канцелярщина, нейтральные заглушки и общие слова без конкретики.",
    "Запрещены фразы вроде «нужно описать», «следует доработать», «требуется уточнить», если только это не блок рисков/допущений. Документ должен звучать как уже проработанный.",
    "Запрещено возвращать placeholder’ы, мета-комментарии и редакторские пометки вместо содержания.",
    "Название продукта в header.name должно быть только на русском языке: только кириллица, пробел, дефис, цифры при необходимости. Латиница запрещена.",
    "Нельзя генерировать названия Aurora Sense, Boreal Origin, Polar Star, Frost Peak и любые англоязычные или псевдо-премиальные северные конструкции.",
    "Если пользователь дал название на латинице, придумай сильный русский эквивалент.",
    "Если данных недостаточно, аккуратно дострой их, но так, чтобы текст оставался правдоподобным, коммерчески осмысленным и конкретным.",
    "Для идеального результата ориентируйся на следующую логику качества:",
    "1) Внутри answer допустимы подзаголовки и метки вроде «Новый рынок:», «Доп. монетизируемая ценность:», «Референсы брендов:», «KPI:», «Критерий приёмки:», «Варианты:», «Этап 1 / Этап 2 / Этап 3».",
    "2) Там, где уместно, давай 2–5 конкретных пунктов внутри answer.",
    "3) Там, где уместно, добавляй референсы брендов и форматы проверки.",
    "4) Там, где число или метрика не подтверждены входом, можно использовать пометку [ПРЕДПОЛОЖЕНИЕ].",
    "5) Документ должен быть сильным по смыслу и по структуре, а не просто длинным.",
    "6) Пиши так, чтобы answer можно было без стыда вставить в бизнес-документ.",
    "Для когнитивного блока делай упор на ритуалы, рынок, модель потребления, нарратив, когнитивную модель и обучение аудитории.",
    "Для сенсорного блока обязательно давай не только образ, но и измеримую цель, протокол теста, критерий приёмки и технические рекомендации.",
    "Для брендингового блока обязательно давай варианты истории, обещание, контекст, ядро бренда, путь клиента и стратегию по горизонтам.",
    "Для маркетингового блока обязательно давай сегменты, продуктовую матрицу, цены, каналы и продвижение с KPI.",
    "Для tech, packaging и star давай не пустые фразы, а конкретные опорные тезисы.",
    "conclusion должен быть финальным сильным выводом, а не вялым summary.",
    sections.length
      ? "Секции, которые нужно включить:\n" + sections.join("\n")
      : "",
    "Главный эталон структуры, уровня детализации, плотности и зрелости стиля:",
    METHODOLOGY_REFERENCE
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function runGenerate(body) {
  const include = normalizeInclude(body);
  const input = normalizeInput(body);
  const enabledSchemas = getEnabledSchemas(include);

  const enabledList = Object.values(enabledSchemas)
    .flat()
    .map((i) => i.no)
    .concat(include.tech !== false ? ["tech"] : [])
    .concat(include.packaging !== false ? ["packaging"] : [])
    .concat(include.star !== false ? ["star"] : [])
    .concat(include.conclusion !== false ? ["conclusion"] : []);

  if (process.env.NODE_ENV !== "production") {
    console.log("[generate] included sections:", enabledList.join(", "));
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

  try {
    const draft = await runGenerate(body);
    res.status(200).json(draft);
  } catch (error) {
    console.error("[generate]", error);
    res.status(500).json({ error: "Generation failed" });
  }
};

module.exports.runGenerate = runGenerate;

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
        temperature: clamp(
          Number.isFinite(temperature) ? temperature : FIXED_TEMPERATURE,
          0,
          1
        ),
        top_p: 0.85
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[generate:text] bad response", response.status, text);
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
        "Новый рынок:",
        `Продукт в категории ${categoryLower} создаёт более современный сценарий потребления и выводит аудиторию из режима компромиссов в режим удобного и осмысленного выбора.`,
        "Какие старые решения вытесняем:",
        `1) устаревшие или неудобные форматы категории;`,
        `2) решения, которые закрывают функцию, но проигрывают по опыту;`,
        `3) товары-заменители, которые воспринимаются как менее натуральные, менее удобные или менее статусные.`,
        "Дополнительная монетизируемая ценность:",
        `— более чистый и понятный опыт потребления;`,
        `— ощущение контроля и современности;`,
        `— возможность премиализировать продукт не только составом, но и новой логикой использования.`
      ].join("\n"),
      [
        "Старый сценарий:",
        `Потребитель в категории ${categoryLower} тратит лишнее время, мирится с неудобством или эмоционально слабым опытом.`,
        "Новый сценарий:",
        `Продукт встраивается в конкретный жизненный момент и делает потребление проще, быстрее и уместнее.`,
        "Новые привычки:",
        `1) повторяемый ритуал использования в понятной точке дня;`,
        `2) более демонстративное и социально подтверждаемое потребление;`,
        `3) переход от разовой пробы к встроенной привычке.`
      ].join("\n"),
      [
        "Варианты нарративов:",
        `1) Когда человек выбирает ${nameText}, он получает результат без лишнего трения и без морального компромисса.`,
        `2) ${nameText} переводит категорию ${categoryLower} из устаревшего формата в более взрослый и удобный сценарий.`,
        `3) Это не просто продукт, а более точный способ закрывать ту же потребность.`,
        "Референсы брендов:",
        "Red Bull, Nike, Activia — как примеры простых и запоминаемых смысловых мостиков."
      ].join("\n"),
      [
        "Мысли:",
        "«Я выбираю не случайное, а действительно работающее решение».",
        "Чувства:",
        "контроль, уверенность, спокойствие, ощущение правильного выбора.",
        "Поведение:",
        "повторная покупка, рекомендация, демонстративное потребление в уместных жизненных ситуациях."
      ].join("\n"),
      [
        "Форматы обучения:",
        "1) короткие ситуационные ролики;",
        "2) упаковка как обучающий интерфейс;",
        "3) QR-контент;",
        "4) амбассадоры;",
        "5) контент про сценарии использования.",
        "KPI:",
        "CTR, досмотры, сканы QR, конверсия из пробы в покупку, доля повторной покупки."
      ].join("\n")
    ],
    sensory: [
      [
        "Желаемый опыт:",
        "визуал должен считываться как современный, точный и продуктово зрелый.",
        "Измеримая цель:",
        "восприятие премиальности и ясности выше среднего по категории [ПРЕДПОЛОЖЕНИЕ].",
        "Протокол теста:",
        "A/B/C-показ нескольких визуальных направлений на целевой аудитории.",
        "Критерий приёмки:",
        "одно направление стабильно выигрывает по понятности и желанию попробовать.",
        "Технические рекомендации:",
        "контрастная иерархия, сильный лицевой элемент, отказ от визуального шума."
      ].join("\n"),
      [
        "Желаемый опыт:",
        "аудиальный слой должен подтверждать точность, контроль и качество взаимодействия.",
        "Измеримая цель:",
        "звук открытия или взаимодействия не вызывает раздражения и усиливает восприятие качества.",
        "Протокол теста:",
        "in-use тест с записью реакции пользователей.",
        "Критерий приёмки:",
        "большинство респондентов считывают звук как аккуратный и уместный.",
        "Технические рекомендации:",
        "контроль механики открытия, материалов и жёсткости упаковки."
      ].join("\n"),
      [
        "Желаемый опыт:",
        "запах должен работать в пользу доверия и качества, а не вызывать сомнение.",
        "Измеримая цель:",
        "минимизация неприятных или тяжёлых нот [ПРЕДПОЛОЖЕНИЕ].",
        "Протокол теста:",
        "слепая оценка интенсивности и приятности запаха на нескольких этапах использования.",
        "Критерий приёмки:",
        "средняя оценка неприятности ниже порогового уровня [ПРЕДПОЛОЖЕНИЕ].",
        "Технические рекомендации:",
        "работа с сырьём, упаковкой, барьерностью и нейтрализацией побочных запахов."
      ].join("\n"),
      [
        "Желаемый опыт:",
        "тактильность должна подтверждать качество и удобство использования.",
        "Измеримая цель:",
        "упаковка удобно лежит в руке, не скользит и не создаёт ощущения дешевизны.",
        "Протокол теста:",
        "контактный тест в реальном сценарии использования.",
        "Критерий приёмки:",
        "минимум жалоб на неудобство и слабую эргономику.",
        "Технические рекомендации:",
        "soft-touch там, где уместно, и продуманная механика открытия."
      ].join("\n"),
      [
        "Желаемый опыт:",
        "вкус должен подтверждать ценность продукта и стимулировать повторную покупку.",
        "Измеримая цель:",
        "высокая общая оценка вкуса и низкая доля жалоб на тяжесть или искусственность.",
        "Протокол теста:",
        "слепая дегустация нескольких вариантов на ядре ЦА.",
        "Критерий приёмки:",
        "один или два вкуса стабильно выигрывают и дают желание купить ещё.",
        "Технические рекомендации:",
        "баланс соли, жира, послевкусия и чистоты профиля."
      ].join("\n")
    ],
    branding: [
      [
        "Вариант 1:",
        `${nameText} как бренд для людей, которые не хотят идти на компромисс между пользой и нормальным опытом.`,
        "Вариант 2:",
        `${nameText} как современный инструмент для тех, кто ценит результат, удобство и ясность выбора.`,
        "Обещание бренда:",
        "понятная польза, удобный сценарий, ощущение правильного и зрелого решения."
      ].join("\n"),
      [
        "Благоприятный контекст:",
        "рост интереса к функциональности, чистым составам, осознанному выбору и новым сценариям потребления.",
        "Неблагоприятный контекст:",
        "жёсткая ценовая конкуренция, скепсис к новой категории, размывание смысла бренда через слишком широкий запуск."
      ].join("\n"),
      [
        "Название:",
        nameText,
        "Логика логотипа:",
        "знак должен передавать точность, силу и продуктовую зрелость без визуального мусора.",
        "Слоган:",
        "короткая фраза про результат, ясность или отсутствие компромиссов.",
        "Уникальные атрибуты:",
        "упаковка, сценарий использования, контентный код, визуальный маркер, повторяемый смысл."
      ].join("\n"),
      [
        "Этапы пути клиента:",
        "Осознание → Проба → Интеграция → Повторная покупка → Адвокация.",
        "Точки контакта:",
        "контент, полка, упаковка, сэмплинг, лендинг, QR-механика, UGC.",
        "Логика опыта:",
        "каждый следующий контакт снижает недоверие и усиливает ощущение осмысленного выбора."
      ].join("\n"),
      [
        "1 год:",
        "доказать право продукта на существование и закрепиться в точных каналах.",
        "3 года:",
        "расширить линейку и закрепить повторяемые сценарии потребления.",
        "5 лет:",
        "масштабировать бренд и закрепить узнаваемый язык категории.",
        "10 лет:",
        "стать одним из референсных игроков, определяющих ожидания от категории."
      ].join("\n")
    ],
    marketing: [
      [
        "Сегменты:",
        "1) массовый практичный сегмент;",
        "2) более осознанный и требовательный сегмент;",
        "3) сценарные пользователи, которым особенно важны удобство и скорость.",
        "Потребности:",
        "понятная польза, удобство, адекватная цена, доверие к формату.",
        "Каналы:",
        "зависят от сценария потребления, а не только от возраста."
      ].join("\n"),
      [
        "Базовый продукт:",
        `${categoryText} как понятная стартовая SKU, в которой сразу считываются польза, формат и отличие.`,
        "Roadmap:",
        "потом расширение через вкусы, сценарные версии, лимитки, функциональные модификации и дополнительные форм-факторы."
      ].join("\n"),
      [
        "Форматы:",
        "розница, наборы, подписка, лимитки.",
        "Цена:",
        "должна объясняться удобством, опытом и сценарной ценностью, а не только составом.",
        "Обоснование:",
        "если продукт даёт более зрелый сценарий потребления, это можно и нужно монетизировать."
      ].join("\n"),
      [
        "Этап запуска:",
        "точные каналы с высокой контекстной уместностью.",
        "Этап роста:",
        "расширение в места, где категория может стать повторяемой покупкой.",
        "Этап масштаба:",
        "ритейл, партнёрства, новые географии и каналы с более широким охватом."
      ].join("\n"),
      [
        "5 тактик продвижения:",
        "1) контент про новый сценарий;",
        "2) сэмплинг;",
        "3) UGC-механики;",
        "4) амбассадоры;",
        "5) лендинги и A/B-сообщения.",
        "KPI:",
        "конверсия из пробы в покупку, CTR, CAC, повторная покупка, LTV, доля UGC."
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
    "Технологическая логика продукта должна быть прозрачной для потребителя и убедительной для канала продаж.",
    `Ключевая инновация продукта: ${innovationText}. Она должна проявляться не только в обещании, но и в реальном опыте использования.`,
    "Состав, технология, контроль качества и стабильность восприятия должны поддерживать главный тезис бренда.",
    "Нужно заранее учитывать масштабирование, воспроизводимость и контроль качества между партиями."
  ];

  const packagingLines = [
    "Упаковка должна быть удобной в реальном использовании и визуально заметной на полке.",
    "Форм-фактор обязан усиливать главный сценарий потребления, а не мешать ему.",
    "На лицевой стороне нужна жёсткая иерархия: что это, зачем это, в чём отличие.",
    "Материалы, механика открытия и общий тактильный опыт должны усиливать ощущение качества."
  ];

  const starLines = [
    `Продукт ${nameText} закрывает конкретную боль: ${painText}.`,
    `Он перестраивает сценарий потребления в категории ${categoryLower}.`,
    `Его отличие не декоративное, а монетизируемое: ${innovationText}.`,
    "У него есть потенциал стать не просто SKU, а узнаваемым маркером новой логики категории."
  ];

  const conclusionText = `Продукт ${nameText} в категории ${categoryText} имеет потенциал не за счёт декоративной новизны, а за счёт точного попадания в реальную боль, сильной сценарной логики и ясного брендового ядра. Следующий шаг — быстро проверить формулировки, формат продукта, визуальный код и каналы первичного запуска на живой аудитории, чтобы зафиксировать наиболее сильную коммерческую версию.`;

  const result = { header, blocks: fallbackBlocks };
  if (inc.tech !== false) result.tech = techLines.join("\n");
  if (inc.packaging !== false) result.packaging = packagingLines.join("\n");
  if (inc.star !== false) result.star = starLines.join("\n");
  if (inc.conclusion !== false) result.conclusion = conclusionText;

  return result;
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

function buildUserMessage(input, include) {
  const parts = [
    "Ниже вводные пользователя. На их основе нужно собрать сильный стратегический паспорт продукта.",
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
      .filter(([_, value]) => value === "yes")
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

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

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
    return value
      .map((item) => sanitizeText(item))
      .filter(Boolean)
      .join("\n");
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

function normalizeMeaningfulText(text, fallback = "") {
  const cleaned = cleanupAnswer(text);
  if (!cleaned) return fallback;
  if (isBadPlaceholderText(cleaned)) return fallback;
  return cleaned;
}

function isBadPlaceholderText(text) {
  const value = String(text || "").toLowerCase();

  const badPatterns = [
    "нужно чётко описать",
    "нужно четко описать",
    "нужно уточнить",
    "нужно определить",
    "требуется уточнить",
    "требуется определить",
    "нужно содержательно раскрыть",
    "без вопроса",
    "новый продукт",
    "aurora sense",
    "boreal origin",
    "polar star",
    "frost peak"
  ];

  return badPatterns.some((p) => value.includes(p));
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

function matchesNo(entry, no) {
  if (!entry) return false;

  if (typeof entry === "object") {
    const candidate = entry.no || entry.code || entry.number;
    return candidate ? String(candidate).trim() === no : false;
  }

  return false;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function enforceRussianBrandName(name, category = "") {
  const cleaned = cleanBrandName(name);

  if (!cleaned) {
    return generateRussianBrandName(category);
  }

  if (containsLatin(cleaned)) {
    return generateRussianBrandName(category);
  }

  const finalName = cleaned.replace(/[^А-Яа-яЁё0-9\s\-]/g, "").trim();
  return finalName || generateRussianBrandName(category);
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

function generateRussianBrandName(category = "") {
  const seed = String(category || "").toLowerCase();
  const prefixIndex =
    Math.abs(hashCode(`${seed}::ru_prefix`)) % RUSSIAN_PREFIXES.length;
  const suffixIndex =
    Math.abs(hashCode(`${seed}::ru_suffix`)) % RUSSIAN_SUFFIXES.length;

  return `${RUSSIAN_PREFIXES[prefixIndex]} ${RUSSIAN_SUFFIXES[suffixIndex]}`;
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