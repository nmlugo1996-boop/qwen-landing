// lib/passportDocx.ts
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType
} from "docx";

export type DraftHeader = {
  category?: string;
  name?: string;
  audience?: string[] | string | null;
  pain?: string;
  innovation?: string;
  unique?: string;
  uniqueness?: string;
};

export type DraftBlockRow = {
  no?: number | string;
  question?: string;
  answer?: string;
};

export type DraftBlocks = Record<string, DraftBlockRow[]>;

export type DraftData = {
  header?: DraftHeader;
  blocks?: DraftBlocks;
  // Дополнительные текстовые разделы полного паспорта
  tech?: string[]; // «Технология и состав» — как список пунктов
  star?: string[]; // «Почему это звезда?» — как список пунктов
  conclusion?: string; // «Заключение» — как один абзац
  // возможны и другие поля — мы будем их санитизировать
  [key: string]: unknown;
};

// ----------------- ХЕЛПЕРЫ -----------------
const safeText = (value: unknown, fallback = "—"): string => {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
};

const boldParagraph = (text: string): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: safeText(text), bold: true })]
  });

// ----------------- Сборка документа -----------------
export function buildPassportDoc(draft: DraftData): Document {
  const header = (draft.header ?? {}) as DraftHeader;
  const blocks = (draft.blocks ?? {}) as DraftBlocks;

  const children: (Paragraph | Table)[] = [];

  // Заголовок документа
  children.push(
    new Paragraph({
      text: safeText(header.name, "КСМ-паспорт продукта"),
      heading: HeadingLevel.HEADING_1
    })
  );

  // Подзаголовок с категорией
  if (header.category) {
    children.push(
      new Paragraph({
        text: safeText(header.category),
        heading: HeadingLevel.HEADING_2
      })
    );
  }

  children.push(new Paragraph({ text: "" }));

  // Краткий паспорт
  children.push(
    new Paragraph({
      text: "Краткий паспорт продукта",
      heading: HeadingLevel.HEADING_3
    })
  );

  const audienceText = Array.isArray(header.audience)
    ? header.audience.map((x) => safeText(x)).join(", ")
    : safeText(header.audience);

  const shortTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2000, 8000],
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Категория")] }),
          new TableCell({
            children: [new Paragraph(safeText(header.category))]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Название")] }),
          new TableCell({
            children: [new Paragraph(safeText(header.name))]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Целевая аудитория")] }),
          new TableCell({ children: [new Paragraph(audienceText)] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Потребительская боль")] }),
          new TableCell({
            children: [new Paragraph(safeText(header.pain))]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Уникальность")] }),
          new TableCell({
            children: [
              new Paragraph(
                safeText(header.uniqueness ?? header.innovation ?? header.unique)
              )
            ]
          })
        ]
      })
    ]
  });

  children.push(shortTable);
  children.push(new Paragraph({ text: "" }));

  // Полные блоки
  const blockOrder: { key: keyof DraftBlocks | string; title: string }[] = [
    { key: "cognitive", title: "Когнитивный блок" },
    { key: "sensory", title: "Сенсорный блок" },
    { key: "branding", title: "Брендинговый блок" },
    { key: "marketing", title: "Маркетинговый блок" }
  ];

  blockOrder.forEach((block) => {
    const rawRows = (blocks as any)?.[block.key];
    const rows: DraftBlockRow[] = Array.isArray(rawRows) ? rawRows : [];
    if (!rows.length) return;

    children.push(
      new Paragraph({
        text: block.title,
        heading: HeadingLevel.HEADING_3
      })
    );

    const blockTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [1000, 4500, 4500],
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [boldParagraph("№")] }),
            new TableCell({ children: [boldParagraph("Вопрос")] }),
            new TableCell({ children: [boldParagraph("Ответ")] })
          ]
        }),
        ...rows.map((row, index) => {
          const num = row?.no ?? index + 1;
          return new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(String(num))]
              }),
              new TableCell({
                children: [new Paragraph(safeText(row?.question))]
              }),
              new TableCell({
                children: [new Paragraph(safeText(row?.answer))]
              })
            ]
          });
        })
      ]
    });

    children.push(blockTable);
    children.push(new Paragraph({ text: "" }));
  });

  // Технология и состав — таблица
  const techList = draft.tech;
  if (techList && (Array.isArray(techList) ? techList.length : 0) > 0) {
    const techItems = Array.isArray(techList) ? techList : [String(techList)];
    children.push(
      new Paragraph({
        text: "Технология и состав",
        heading: HeadingLevel.HEADING_3
      })
    );
    const techTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [1000, 9000],
      rows: [
        new TableRow({
          children: [new TableCell({ children: [boldParagraph("№")] }), new TableCell({ children: [boldParagraph("Пункт")] })]
        }),
        ...techItems.map((item, i) =>
          new TableRow({
            children: [new TableCell({ children: [new Paragraph(String(i + 1))] }), new TableCell({ children: [new Paragraph(safeText(item))] })]
          })
        )
      ]
    });
    children.push(techTable);
    children.push(new Paragraph({ text: "" }));
  }

  // Почему это звезда? — таблица
  const starList = draft.star;
  if (starList && (Array.isArray(starList) ? starList.length : 0) > 0) {
    const starItems = Array.isArray(starList) ? starList : [String(starList)];
    children.push(
      new Paragraph({
        text: "Почему это звезда?",
        heading: HeadingLevel.HEADING_3
      })
    );
    const starTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [1000, 9000],
      rows: [
        new TableRow({
          children: [new TableCell({ children: [boldParagraph("№")] }), new TableCell({ children: [boldParagraph("Тезис")] })]
        }),
        ...starItems.map((item, i) =>
          new TableRow({
            children: [new TableCell({ children: [new Paragraph(String(i + 1))] }), new TableCell({ children: [new Paragraph(safeText(item))] })]
          })
        )
      ]
    });
    children.push(starTable);
    children.push(new Paragraph({ text: "" }));
  }

  // Заключение — таблица (одна строка: поле | текст)
  if (draft.conclusion != null && String(draft.conclusion).trim() !== "") {
    children.push(
      new Paragraph({
        text: "Заключение",
        heading: HeadingLevel.HEADING_3
      })
    );
    const conclusionTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [2500, 7500],
      rows: [
        new TableRow({
          children: [new TableCell({ children: [boldParagraph("Текст")] }), new TableCell({ children: [new Paragraph(safeText(draft.conclusion))] })]
        })
      ]
    });
    children.push(conclusionTable);
    children.push(new Paragraph({ text: "" }));
  }

  // Рекомендации — таблица (фиксированные рекомендации, если нужно)
  const recommendations = [
    "Проведите тестирование продукта с целевой аудиторией для валидации концепции",
    "Разработайте детальную стратегию позиционирования на основе уникальности продукта",
    "Подготовьте маркетинговые материалы, подчеркивающие эмоциональную ценность",
    "Проанализируйте конкурентное окружение и выделите ключевые преимущества",
    "Создайте план коммуникации, который расскажет историю продукта"
  ];

  children.push(
    new Paragraph({
      text: "Рекомендации",
      heading: HeadingLevel.HEADING_3
    })
  );

  const recTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1000, 9000],
    rows: [
      new TableRow({
        children: [new TableCell({ children: [boldParagraph("№")] }), new TableCell({ children: [boldParagraph("Рекомендация")] })]
      }),
      ...recommendations.map((item, i) =>
        new TableRow({
          children: [new TableCell({ children: [new Paragraph(String(i + 1))] }), new TableCell({ children: [new Paragraph(item)] })]
        })
      )
    ]
  });
  children.push(recTable);
  children.push(new Paragraph({ text: "" }));

  // Футер с датой
  const date = new Date().toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Polar Star Passport · версия 1.0 · ${date}`,
          italics: true
        })
      ]
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return doc;
}

// ----------------- САНИТИЗАЦИЯ DRAFT (защита от слишком длинных полей) -----------------
const MAX_STRING = 5000; // если строка длиннее — обрежем
const MAX_ARRAY_ITEMS = 200; // если массив длиннее — усечём
const MAX_OBJECT_KEYS = 500; // допустимый максимум ключей в объекте (защитное)
const PREVIEW_SUFFIX = " [ПРЕДПОЛОЖЕНИЕ: усечено]";

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    if (value.length > MAX_STRING) {
      return value.slice(0, MAX_STRING) + PREVIEW_SUFFIX;
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let i = 0; i < Math.min(value.length, MAX_ARRAY_ITEMS); i += 1) {
      out.push(sanitizeValue(value[i]));
    }
    if (value.length > MAX_ARRAY_ITEMS) {
      out.push(`[ПРЕДПОЛОЖЕНИЕ: массив усечён, всего ${value.length} элементов]`);
    }
    return out;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    const out: Record<string, unknown> = {};
    for (let i = 0; i < Math.min(keys.length, MAX_OBJECT_KEYS); i += 1) {
      const k = keys[i];
      // избегаем сериализации больших вложенных бинарных/функциональных полей
      try {
        out[k] = sanitizeValue(obj[k]);
      } catch (e) {
        out[k] = "[ПРЕДПОЛОЖЕНИЕ: невозможно санитизировать]";
      }
    }
    if (keys.length > MAX_OBJECT_KEYS) {
      out.__truncated_keys_note = `[ПРЕДПОЛОЖЕНИЕ: набора ключей усечено, всего ${keys.length}]`;
    }
    return out;
  }

  // функции, символы, прочее
  return String(value);
}

function sanitizeDraft(draft: DraftData): DraftData {
  try {
    // глубокая копия с санитизацией
    const copy = sanitizeValue(draft);
    // TypeScript: приводим обратно
    return (copy as unknown) as DraftData;
  } catch (err) {
    // если санитизация по какой-то причине упала — вернуть минимальную оболочку
    return {
      header: {
        name: draft?.header?.name ?? "passport",
        category: draft?.header?.category ?? "Новая категория",
        audience: draft?.header?.audience ?? "—",
        pain: draft?.header?.pain ?? "—"
      },
      blocks: draft?.blocks ?? {}
    };
  }
}

// ----------------- Создание минимального диагностического DOCX с ошибкой -----------------
async function buildErrorDocx(errorMessage: string, draftPreview?: string): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "Ошибка при сборке DOCX",
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph({
            text: "",
          }),
          new Paragraph({
            children: [new TextRun({ text: "Серверная ошибка при упаковке документа:", bold: true })]
          }),
          new Paragraph({
            text: errorMessage
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ children: [new TextRun({ text: "Превью входных данных (усечено):", bold: true })] }),
          new Paragraph({ text: draftPreview ?? "—" })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

// ----------------- Экспорт функции преобразования в Uint8Array -----------------
export async function draftToDocxBinary(draft: DraftData): Promise<Uint8Array> {
  // Санитизируем вход
  const safeDraft = sanitizeDraft(draft);

  try {
    const doc = buildPassportDoc(safeDraft);
    const buffer = await Packer.toBuffer(doc);
    return new Uint8Array(buffer);
  } catch (err) {
    // Логируем ошибку сервера. Не выбрасываем — возвращаем диагностический docx.
    try {
      const emsg = err instanceof Error ? err.message : String(err);
      const preview = (() => {
        try {
          const s = JSON.stringify(safeDraft);
          return s.length > 800 ? s.slice(0, 800) + "..." : s;
        } catch {
          return "[не удалось сериализовать preview]";
        }
      })();
      console.error("[passportDocx] build error:", emsg);
      console.error("[passportDocx] draft preview (sanitized):", preview);
      return await buildErrorDocx(emsg, preview);
    } catch (fatal) {
      // В крайнем случае вернём минимальный тестовый документ
      console.error("[passportDocx] fatal fallback:", fatal);
      const fallbackDoc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({ text: "TEST DOCX (fallback)", heading: HeadingLevel.HEADING_1 })
            ]
          }
        ]
      });
      const buff = await Packer.toBuffer(fallbackDoc);
      return new Uint8Array(buff);
    }
  }
}

// Тестовый документ, если нужно для диагностики
export async function buildMinimalTestDocx(): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "TEST DOCX OK",
            heading: HeadingLevel.HEADING_1
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}