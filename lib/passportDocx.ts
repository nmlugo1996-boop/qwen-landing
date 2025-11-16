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
};

export type DraftBlockRow = {
  no?: number;
  question?: string;
  answer?: string;
};

export type DraftBlocks = Record<string, DraftBlockRow[]>;

export type DraftData = {
  header?: DraftHeader;
  blocks?: DraftBlocks;
};

// --------- ХЕЛПЕРЫ БЕЗОПАСНОСТИ ---------

const safeText = (value: unknown, fallback = "—"): string => {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
};

const boldParagraph = (text: string): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: safeText(text), bold: true })]
  });

// ---------------------------------------

export function buildPassportDoc(draft: DraftData): Document {
  const header = draft.header ?? {};
  const blocks = draft.blocks ?? {};

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

  // Таблица краткого паспорта
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
          new TableCell({
            children: [new Paragraph("Потребительская боль")]
          }),
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
                safeText(header.innovation ?? header.unique)
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

  // Блок рекомендаций
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

  recommendations.forEach((item, index) => {
    children.push(
      new Paragraph({
        text: `${index + 1}. ${item}`
      })
    );
  });

  children.push(new Paragraph({ text: "" }));

  // Футер
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

export async function draftToDocxBinary(draft: DraftData): Promise<Uint8Array> {
  const doc = buildPassportDoc(draft);
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
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
