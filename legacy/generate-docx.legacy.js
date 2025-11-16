const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType
} = require("docx");

const BLOCK_SCHEMAS = {
  cognitive: {
    title: "Когнитивный блок",
    rows: [
      { no: "1.1", question: "Какую потребительскую боль используем для создания дизрапта?" },
      { no: "1.2", question: "Изменение модели потребления: какой новый рынок открываем?" },
      { no: "1.3", question: "Изменение технологии потребления: какие новые привычки потребления внедряем?" },
      { no: "1.4", question: "Нарративы: как объясняем, что инновация нужна, полезна, выгодна?" },
      { no: "1.5", question: "На работе с какими когнитивными функциями потребителя фокусируемся?" }
    ]
  },
  sensory: {
    title: "Сенсорный блок",
    rows: [
      { no: "2.1", question: "Сильный визуальный образ" },
      { no: "2.2", question: "Сильный аудиальный образ" },
      { no: "2.3", question: "Сильный обонятельный образ" },
      { no: "2.4", question: "Сильный осязательный образ" },
      { no: "2.5", question: "Сильный вкусовой образ" }
    ]
  },
  branding: {
    title: "Брендинговый блок",
    rows: [
      { no: "3.1", question: "Как улучшаем личную историю и самоидентификацию потребителя?" },
      { no: "3.2", question: "Какой контекст поможет развить бренд? Какой помешает?" },
      { no: "3.3", question: "Сильное ядро бренда: название, логотип, слоган, суть, доп. элементы" },
      { no: "3.4", question: "Уникальный путь клиента с продуктом и брендом (опыт бренда)" },
      { no: "3.5", question: "Стратегия развития бренда на 3–5–10 лет" }
    ]
  },
  marketing: {
    title: "Маркетинговый блок",
    rows: [
      { no: "4.1", question: "Сегментация / Позиционирование" },
      { no: "4.2", question: "Описание базового продукта и его развитие во времени" },
      { no: "4.3", question: "Развитие ценообразования" },
      { no: "4.4", question: "Развитие каналов сбыта" },
      { no: "4.5", question: "Продвижение (с фокусом на безбюджетный маркетинг)" }
    ]
  }
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const draft = normaliseDraft(body.draft || body);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: buildDocument(draft)
        }
      ],
      styles: {
        default: {
          document: {
            run: {
              font: "Arial",
              size: 22
            }
          },
          paragraph: {
            spacing: { after: 200 }
          }
        },
        heading1: {
          run: {
            font: "Arial",
            size: 28,
            bold: true
          }
        },
        heading2: {
          run: {
            font: "Arial",
            size: 28,
            bold: true
          }
        },
        heading3: {
          run: {
            font: "Arial",
            size: 24,
            bold: true
          }
        }
      }
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=passport.docx");
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("[generate-docx]", error);
    res.status(500).json({ error: error.message || "Ошибка генерации DOCX" });
  }
};

function buildDocument(draft) {
  const children = [];

  children.push(
    new Paragraph({
      text: "Когнитивно-сенсорный маркетинговый паспорт",
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "📸 Место для 3D-прототипа/фото продукта",
          italics: true
        })
      ],
      spacing: { after: 200 }
    })
  );

  children.push(new Paragraph({ text: "Шапка продукта", heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 120 } }));
  children.push(makeHeaderTable(draft.header));

  Object.entries(BLOCK_SCHEMAS).forEach(([key, schema]) => {
    const blockRows = draft.blocks[key] || [];
    children.push(new Paragraph({ text: schema.title, heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 120 } }));
    children.push(makeBlockTable(blockRows, schema.rows));
  });

  children.push(new Paragraph({ text: "Технология и состав", heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 120 } }));
  draft.tech.forEach((item) => {
    children.push(new Paragraph({
      children: [new TextRun({ text: item })],
      bullet: { level: 0 },
      spacing: { after: 80 }
    }));
  });

  children.push(new Paragraph({ text: "Почему это звезда?", heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 120 } }));
  draft.star.forEach((item) => {
    children.push(new Paragraph({
      children: [new TextRun({ text: item })],
      bullet: { level: 0 },
      spacing: { after: 80 }
    }));
  });

  children.push(new Paragraph({ text: "Заключение", heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 120 } }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: draft.conclusion, italics: true })
    ]
  }));

  return children;
}

function makeHeaderTable(header) {
  const rows = [
    ["Категория", header.category],
    ["Название", header.name],
    ["Целевая аудитория", header.audience],
    ["Потребительская боль", header.pain],
    ["Суть инновации/уникальность", header.innovation]
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          tableCell(label, { bold: true }),
          tableCell(value)
        ]
      })
    )
  });
}

function makeBlockTable(blockRows, schemaRows) {
  const headerRow = new TableRow({
    children: [
      tableCell("№", { bold: true }),
      tableCell("Вопрос", { bold: true }),
      tableCell("Ответ", { bold: true })
    ]
  });

  const rows = schemaRows.map((row, index) => {
    const entry = blockRows.find((item) => matchesNo(item, row.no)) || blockRows[index] || {};
    return new TableRow({
      children: [
        tableCell(row.no),
        tableCell(row.question),
        tableCell(pick(entry.answer, "Требуется уточнение"))
      ]
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows]
  });
}

function tableCell(text, options = {}) {
  const value = pick(text, "—");
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: value, bold: Boolean(options.bold) })
        ],
        spacing: { after: 80 }
      })
    ]
  });
}

function matchesNo(entry, no) {
  if (!entry) return false;
  if (typeof entry === "object") {
    const candidate = entry.no || entry.code || entry.number;
    return candidate ? String(candidate).trim() === no : false;
  }
  return false;
}

function normaliseDraft(raw) {
  const header = {
    category: pick(raw?.header?.category || raw?.category),
    name: pick(raw?.header?.name || raw?.name),
    audience: pick(raw?.header?.audience || raw?.audience),
    pain: pick(raw?.header?.pain || raw?.pain),
    innovation: pick(raw?.header?.innovation || raw?.innovation)
  };

  const blocks = {};
  Object.entries(BLOCK_SCHEMAS).forEach(([key, schema]) => {
    const answerList = Array.isArray(raw?.blocks?.[key]) ? raw.blocks[key] : [];
    blocks[key] = schema.rows.map((row, index) => {
      const entry = findBlockEntry(answerList, row.no, index);
      return {
        no: row.no,
        question: row.question,
        answer: pick(entry, "Требуется уточнение")
      };
    });
  });

  const tech = normaliseList(raw?.tech, ["Уточните технологию и состав продукта."]);
  const star = normaliseList(raw?.star, ["Раскройте, почему продукт может стать звездой рынка."]);
  const conclusion = pick(raw?.conclusion, "Подготовьте выводы и следующий шаг.");

  return { header, blocks, tech, star, conclusion };
}

function findBlockEntry(list, no, index) {
  if (!Array.isArray(list)) return null;
  const byNo = list.find((item) => matchesNo(item, no));
  if (byNo) return extractBlockAnswer(byNo);
  const fallback = list[index];
  return extractBlockAnswer(fallback);
}

function extractBlockAnswer(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry.trim();
  if (typeof entry === "object") {
    if (typeof entry.answer === "string" && entry.answer.trim()) return entry.answer.trim();
    if (typeof entry.value === "string" && entry.value.trim()) return entry.value.trim();
    if (typeof entry.text === "string" && entry.text.trim()) return entry.text.trim();
  }
  return null;
}

function pick(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text ? text : fallback;
}

function normaliseList(value, fallback) {
  if (Array.isArray(value)) {
    const list = value.map((item) => String(item || "").trim()).filter(Boolean);
    if (list.length) return list;
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }
  return fallback;
}
