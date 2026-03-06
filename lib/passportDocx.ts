import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
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
  tech?: string[] | string;
  packaging?: string[] | string;
  star?: string[] | string;
  conclusion?: string;
  [key: string]: unknown;
};

type BuildDocxOptions = {
  startedAt?: number;
};

const MAX_TEXT = 2500;
const MAX_LIST_ITEMS = 20;

function safeText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  if (text.length <= MAX_TEXT) return text;
  return `${text.slice(0, MAX_TEXT)}… [ПРЕДПОЛОЖЕНИЕ: текст усечён]`;
}

function safeMultilineText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  if (text.length <= MAX_TEXT) return text;
  return `${text.slice(0, MAX_TEXT)}…\n[ПРЕДПОЛОЖЕНИЕ: текст усечён]`;
}

function toLimitedList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_LIST_ITEMS)
      .map((item) => safeMultilineText(item))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_LIST_ITEMS)
      .map((item) => safeMultilineText(item));
  }

  return [];
}

function boldParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: safeText(text), bold: true })]
  });
}

function tableCellText(text: unknown): TableCell {
  return new TableCell({
    children: [new Paragraph(safeMultilineText(text))]
  });
}

function normalizeDraft(input: DraftData): DraftData {
  const header = input?.header ?? {};
  const blocks = input?.blocks ?? {};

  const normalizedBlocks: DraftBlocks = {};

  const allowedBlockKeys = ["cognitive", "sensory", "branding", "marketing"];

  for (const blockKey of allowedBlockKeys) {
    const rows = Array.isArray(blocks[blockKey]) ? blocks[blockKey] : [];
    normalizedBlocks[blockKey] = rows.slice(0, 20).map((row, index) => ({
      no: row?.no ?? index + 1,
      question: safeText(row?.question),
      answer: safeMultilineText(row?.answer)
    }));
  }

  return {
    header: {
      category: safeText(header.category),
      name: safeText(header.name, "КСМ-паспорт продукта"),
      audience: Array.isArray(header.audience)
        ? header.audience.slice(0, 10).map((item) => safeText(item))
        : safeText(header.audience),
      pain: safeMultilineText(header.pain),
      innovation: safeMultilineText(header.innovation),
      unique: safeMultilineText(header.unique),
      uniqueness: safeMultilineText(header.uniqueness)
    },
    blocks: normalizedBlocks,
    tech: toLimitedList(input?.tech),
    packaging: toLimitedList(input?.packaging),
    star: toLimitedList(input?.star),
    conclusion: safeMultilineText(input?.conclusion)
  };
}

export function buildPassportDoc(draft: DraftData): Document {
  const safeDraft = normalizeDraft(draft);
  const header = safeDraft.header ?? {};
  const blocks = safeDraft.blocks ?? {};

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      text: safeText(header.name, "КСМ-паспорт продукта"),
      heading: HeadingLevel.HEADING_1
    })
  );

  if (header.category) {
    children.push(
      new Paragraph({
        text: safeText(header.category),
        heading: HeadingLevel.HEADING_2
      })
    );
  }

  children.push(new Paragraph({ text: "" }));

  children.push(
    new Paragraph({
      text: "Краткий паспорт продукта",
      heading: HeadingLevel.HEADING_3
    })
  );

  const audienceText = Array.isArray(header.audience)
    ? header.audience.join(", ")
    : safeText(header.audience);

  const shortTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [tableCellText("Категория"), tableCellText(header.category)]
      }),
      new TableRow({
        children: [tableCellText("Название"), tableCellText(header.name)]
      }),
      new TableRow({
        children: [tableCellText("Целевая аудитория"), tableCellText(audienceText)]
      }),
      new TableRow({
        children: [tableCellText("Потребительская боль"), tableCellText(header.pain)]
      }),
      new TableRow({
        children: [
          tableCellText("Уникальность"),
          tableCellText(header.uniqueness || header.innovation || header.unique)
        ]
      })
    ]
  });

  children.push(shortTable);
  children.push(new Paragraph({ text: "" }));

  const blockOrder: { key: keyof DraftBlocks; title: string }[] = [
    { key: "cognitive", title: "Когнитивный блок" },
    { key: "sensory", title: "Сенсорный блок" },
    { key: "branding", title: "Брендинговый блок" },
    { key: "marketing", title: "Маркетинговый блок" }
  ];

  for (const block of blockOrder) {
    const rows = Array.isArray(blocks[block.key]) ? blocks[block.key] : [];
    if (!rows.length) continue;

    children.push(
      new Paragraph({
        text: block.title,
        heading: HeadingLevel.HEADING_3
      })
    );

    const blockTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [boldParagraph("№")] }),
            new TableCell({ children: [boldParagraph("Вопрос")] }),
            new TableCell({ children: [boldParagraph("Ответ")] })
          ]
        }),
        ...rows.map((row, index) => {
          const no = row?.no ?? index + 1;
          return new TableRow({
            children: [
              tableCellText(String(no)),
              tableCellText(row?.question),
              tableCellText(row?.answer)
            ]
          });
        })
      ]
    });

    children.push(blockTable);
    children.push(new Paragraph({ text: "" }));
  }

  const techList = toLimitedList(safeDraft.tech);
  if (techList.length) {
    children.push(
      new Paragraph({
        text: "Технология и состав",
        heading: HeadingLevel.HEADING_3
      })
    );

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [boldParagraph("№")] }),
            new TableCell({ children: [boldParagraph("Пункт")] })
          ]
        }),
        ...techList.map((item, index) => {
          return new TableRow({
            children: [tableCellText(index + 1), tableCellText(item)]
          });
        })
      ]
    });

    children.push(table);
    children.push(new Paragraph({ text: "" }));
  }

  const packagingList = toLimitedList(safeDraft.packaging);
  if (packagingList.length) {
    children.push(
      new Paragraph({
        text: "Форм-факторы и упаковка",
        heading: HeadingLevel.HEADING_3
      })
    );

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [boldParagraph("№")] }),
            new TableCell({ children: [boldParagraph("Пункт")] })
          ]
        }),
        ...packagingList.map((item, index) => {
          return new TableRow({
            children: [tableCellText(index + 1), tableCellText(item)]
          });
        })
      ]
    });

    children.push(table);
    children.push(new Paragraph({ text: "" }));
  }

  const starList = toLimitedList(safeDraft.star);
  if (starList.length) {
    children.push(
      new Paragraph({
        text: "Почему это звезда",
        heading: HeadingLevel.HEADING_3
      })
    );

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [boldParagraph("№")] }),
            new TableCell({ children: [boldParagraph("Тезис")] })
          ]
        }),
        ...starList.map((item, index) => {
          return new TableRow({
            children: [tableCellText(index + 1), tableCellText(item)]
          });
        })
      ]
    });

    children.push(table);
    children.push(new Paragraph({ text: "" }));
  }

  if (safeDraft.conclusion && safeDraft.conclusion !== "—") {
    children.push(
      new Paragraph({
        text: "Заключение",
        heading: HeadingLevel.HEADING_3
      })
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [boldParagraph("Итоговый вывод")] }),
              tableCellText(safeDraft.conclusion)
            ]
          })
        ]
      })
    );

    children.push(new Paragraph({ text: "" }));
  }

  const date = new Date().toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Polar Star Passport · ${date}`,
          italics: true
        })
      ]
    })
  );

  return new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });
}

export async function draftToDocxBinary(draft: DraftData): Promise<Uint8Array> {
  const doc = buildPassportDoc(draft);
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export async function buildMinimalTestDocx(): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "ТЕСТОВЫЙ DOCX",
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph({
            text: "Этот документ собран через buildMinimalTestDocx()."
          }),
          new Paragraph({
            text: ""
          }),
          new Paragraph({
            text: "Маршрут: /api/passport-docx/test"
          }),
          new Paragraph({
            text: "Назначение: Проверка сборки DOCX"
          }),
          new Paragraph({
            text: "Статус: OK"
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export async function buildDocxErrorBinary(
  message: string,
  extra?: Record<string, unknown>
): Promise<Uint8Array> {
  const details = extra ? JSON.stringify(extra, null, 2) : "";

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
            text: safeMultilineText(message)
          }),
          ...(details
            ? [
                new Paragraph({ text: "" }),
                new Paragraph({
                  text: "Технические детали:",
                  heading: HeadingLevel.HEADING_3
                }),
                new Paragraph({
                  text: safeMultilineText(details)
                })
              ]
            : [])
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export async function buildDocxResponse(
  draft: DraftData,
  options?: BuildDocxOptions
): Promise<Response> {
  try {
    const binary = await draftToDocxBinary(draft);
    const arrayBuffer = binary.buffer.slice(
      binary.byteOffset,
      binary.byteOffset + binary.byteLength
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="passport.docx"',
        "Content-Length": String(binary.byteLength),
        "Cache-Control": "no-store, must-revalidate"
      }
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Не удалось собрать DOCX";

    const errorBinary = await buildDocxErrorBinary(message, {
      elapsedMs:
        typeof options?.startedAt === "number"
          ? Date.now() - options.startedAt
          : undefined
    });

    const arrayBuffer = errorBinary.buffer.slice(
      errorBinary.byteOffset,
      errorBinary.byteOffset + errorBinary.byteLength
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="passport-error.docx"',
        "Content-Length": String(errorBinary.byteLength),
        "Cache-Control": "no-store, must-revalidate"
      }
    });
  }
}

export function buildDocxErrorResponse(
  message: string,
  extra?: Record<string, unknown>
): Promise<Response> {
  return buildDocxErrorBinary(message, extra).then((binary) => {
    const arrayBuffer = binary.buffer.slice(
      binary.byteOffset,
      binary.byteOffset + binary.byteLength
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="passport-error.docx"',
        "Content-Length": String(binary.byteLength),
        "Cache-Control": "no-store, must-revalidate"
      }
    });
  });
}