import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
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

const COLORS = {
  text: "111111",
  muted: "666666",
  line: "BFBFBF",
  lineSoft: "D9D9D9",
  black: "111111",
  headFill: "EDEDED",
  altFill: "F8F8F8"
};

function safeText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s === "" ? fallback : s;
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => safeText(item, "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((item) =>
        item
          .replace(/^[\-\u2022]\s*/, "")
          .replace(/^\d+[.)]\s*/, "")
          .trim()
      )
      .filter(Boolean);
  }

  return [];
}

const paragraph = (
  text: string,
  opts?: {
    bold?: boolean;
    italics?: boolean;
    size?: number;
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    before?: number;
    after?: number;
    allCaps?: boolean;
  }
): Paragraph =>
  new Paragraph({
    alignment: opts?.align,
    spacing: {
      before: opts?.before ?? 0,
      after: opts?.after ?? 120,
      line: 300
    },
    children: [
      new TextRun({
        text: safeText(text),
        bold: opts?.bold,
        italics: opts?.italics,
        size: opts?.size ?? 22,
        color: opts?.color ?? COLORS.text,
        allCaps: opts?.allCaps
      })
    ]
  });

const spacer = (after = 80): Paragraph =>
  new Paragraph({
    text: "",
    spacing: { after }
  });

const sectionHeading = (text: string): Paragraph =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 120, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: COLORS.black,
        allCaps: true
      })
    ]
  });

const sectionIntro = (text: string): Paragraph =>
  paragraph(text, {
    size: 20,
    color: COLORS.muted,
    after: 100
  });

const borders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
  insideHorizontal: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: COLORS.lineSoft
  },
  insideVertical: {
    style: BorderStyle.SINGLE,
    size: 1,
    color: COLORS.lineSoft
  }
};

const cell = (
  text: string,
  opts?: {
    bold?: boolean;
    fill?: string;
    width?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    vAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
  }
): TableCell =>
  new TableCell({
    width: opts?.width
      ? { size: opts.width, type: WidthType.DXA }
      : undefined,
    shading: opts?.fill
      ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" }
      : undefined,
    verticalAlign: opts?.vAlign ?? VerticalAlign.CENTER,
    margins: {
      top: 90,
      bottom: 90,
      left: 120,
      right: 120
    },
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 280 },
        children: [
          new TextRun({
            text: safeText(text),
            bold: opts?.bold,
            size: 21,
            color: COLORS.text
          })
        ]
      })
    ]
  });

const twoColTable = (rows: Array<[string, string]>): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell("Параметр", {
            bold: true,
            fill: COLORS.headFill,
            width: 2700
          }),
          cell("Значение", {
            bold: true,
            fill: COLORS.headFill,
            width: 7300
          })
        ]
      }),
      ...rows.map(
        ([left, right], index) =>
          new TableRow({
            children: [
              cell(left, {
                bold: true,
                width: 2700,
                fill: index % 2 === 0 ? COLORS.altFill : "FFFFFF"
              }),
              cell(right, {
                width: 7300,
                fill: index % 2 === 0 ? COLORS.altFill : "FFFFFF"
              })
            ]
          })
      )
    ]
  });

const threeColTable = (
  rows: Array<{ no: string; question: string; answer: string }>
): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell("№", {
            bold: true,
            fill: COLORS.headFill,
            width: 800,
            align: AlignmentType.CENTER
          }),
          cell("Вопрос", {
            bold: true,
            fill: COLORS.headFill,
            width: 3000
          }),
          cell("Ответ", {
            bold: true,
            fill: COLORS.headFill,
            width: 6200
          })
        ]
      }),
      ...rows.map(
        (row, index) =>
          new TableRow({
            children: [
              cell(row.no, {
                width: 800,
                align: AlignmentType.CENTER,
                fill: index % 2 === 0 ? COLORS.altFill : "FFFFFF"
              }),
              cell(row.question, {
                width: 3000,
                fill: index % 2 === 0 ? COLORS.altFill : "FFFFFF"
              }),
              cell(row.answer, {
                width: 6200,
                fill: index % 2 === 0 ? COLORS.altFill : "FFFFFF"
              })
            ]
          })
      )
    ]
  });

const listTable = (
  titleColumn: string,
  items: string[],
  noTitle = "№"
): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell(noTitle, {
            bold: true,
            fill: COLORS.headFill,
            width: 800,
            align: AlignmentType.CENTER
          }),
          cell(titleColumn, {
            bold: true,
            fill: COLORS.headFill,
            width: 9200
          })
        ]
      }),
      ...items.map(
        (item, index) =>
          new TableRow({
            children: [
              cell(String(index + 1), {
                width: 800,
                align: AlignmentType.CENTER,
                fill: index % 2 === 0 ? COLORS.altFill : "FFFFFF"
              }),
              cell(item, {
                width: 9200,
                fill: index % 2 === 0 ? COLORS.altFill : "FFFFFF"
              })
            ]
          })
      )
    ]
  });

const blockRows = (
  rows: DraftBlockRow[]
): Array<{ no: string; question: string; answer: string }> =>
  rows.map((row, index) => ({
    no: safeText(row?.no ?? String(index + 1)),
    question: safeText(row?.question),
    answer: safeText(row?.answer)
  }));

function normalizeDraft(input: DraftData): DraftData {
  const header = input?.header ?? {};
  const blocks = input?.blocks ?? {};

  return {
    header: {
      category: safeText(header.category),
      name: safeText(header.name, "Паспорт продукта"),
      audience: Array.isArray(header.audience)
        ? header.audience.map((item) => safeText(item))
        : safeText(header.audience),
      pain: safeText(header.pain),
      innovation: safeText(header.innovation),
      unique: safeText(header.unique),
      uniqueness: safeText(header.uniqueness)
    },
    blocks: {
      cognitive: Array.isArray(blocks.cognitive) ? blocks.cognitive : [],
      sensory: Array.isArray(blocks.sensory) ? blocks.sensory : [],
      branding: Array.isArray(blocks.branding) ? blocks.branding : [],
      marketing: Array.isArray(blocks.marketing) ? blocks.marketing : []
    },
    tech: normalizeList(input?.tech),
    packaging: normalizeList(input?.packaging),
    star: normalizeList(input?.star),
    conclusion: safeText(input?.conclusion, "")
  };
}

export function buildPassportDoc(draft: DraftData): Document {
  const safeDraft = normalizeDraft(draft);
  const header = safeDraft.header ?? {};
  const blocks = safeDraft.blocks ?? {};

  const audienceText = Array.isArray(header.audience)
    ? header.audience.map((x) => safeText(x)).join(", ")
    : safeText(header.audience);

  const title = safeText(header.name, "Паспорт продукта");
  const category = safeText(header.category);
  const pain = safeText(header.pain);
  const uniqueness = safeText(
    header.uniqueness ?? header.innovation ?? header.unique
  );

  const children: Array<Paragraph | Table> = [];

  children.push(
    paragraph("КОГНИТИВНО-СЕНСОРНЫЙ ПАСПОРТ ПРОДУКТА", {
      bold: true,
      size: 28,
      align: AlignmentType.CENTER,
      after: 80,
      allCaps: true
    })
  );

  children.push(
    paragraph(`«${title}»`, {
      bold: true,
      size: 34,
      align: AlignmentType.CENTER,
      after: 180
    })
  );

  children.push(sectionHeading("КРАТКИЙ ПАСПОРТ"));
  children.push(
    twoColTable([
      ["Категория", category],
      ["Название", title],
      ["Целевая аудитория", audienceText],
      ["Потребительская боль", pain],
      ["Уникальность", uniqueness]
    ])
  );

  children.push(spacer(140));

  const blockOrder: Array<{ key: string; title: string; intro: string }> = [
    {
      key: "cognitive",
      title: "КОГНИТИВНЫЙ БЛОК",
      intro:
        "Блок фиксирует, какую боль продукт атакует, какой новый сценарий потребления создаёт и как должен перестроиться способ мышления потребителя."
    },
    {
      key: "sensory",
      title: "СЕНСОРНЫЙ БЛОК",
      intro:
        "Блок описывает визуальные, звуковые, обонятельные, тактильные и вкусовые маркеры, через которые продукт должен запоминаться и подтверждать своё обещание."
    },
    {
      key: "branding",
      title: "БРЕНДИНГОВЫЙ БЛОК",
      intro:
        "Блок фиксирует смысл бренда, контекст роста, ядро идентичности, путь клиента и долгую стратегию развития."
    },
    {
      key: "marketing",
      title: "МАРКЕТИНГОВЫЙ БЛОК",
      intro:
        "Блок собирает сегментацию, продуктовую логику, цену, каналы сбыта и механику продвижения в единую коммерческую систему."
    }
  ];

  for (const block of blockOrder) {
    const rawRows = Array.isArray(blocks[block.key]) ? blocks[block.key] : [];
    if (!rawRows.length) continue;

    children.push(sectionHeading(block.title));
    children.push(sectionIntro(block.intro));
    children.push(threeColTable(blockRows(rawRows)));
    children.push(spacer(140));
  }

  const techItems = normalizeList(safeDraft.tech);
  if (techItems.length) {
    children.push(sectionHeading("ТЕХНОЛОГИЯ И СОСТАВ"));
    children.push(
      sectionIntro(
        "Здесь собраны опоры, которые подтверждают реальность продукта: технологичность, производственная логика, состав и воспроизводимость качества."
      )
    );
    children.push(listTable("Пункт", techItems));
    children.push(spacer(140));
  }

  const packagingItems = normalizeList(safeDraft.packaging);
  if (packagingItems.length) {
    children.push(sectionHeading("ФОРМ-ФАКТОРЫ И УПАКОВКА"));
    children.push(
      sectionIntro(
        "Этот блок фиксирует, как продукт должен быть упакован и подан, чтобы форм-фактор усиливал сценарий потребления и повышал воспринимаемую ценность."
      )
    );
    children.push(listTable("Пункт", packagingItems));
    children.push(spacer(140));
  }

  const starItems = normalizeList(safeDraft.star);
  if (starItems.length) {
    children.push(sectionHeading("ПОЧЕМУ ЭТО ЗВЕЗДА"));
    children.push(
      sectionIntro(
        "Здесь собраны тезисы, которые объясняют, почему продукт способен выделиться в категории и стать сильным коммерческим предложением."
      )
    );
    children.push(listTable("Тезис", starItems));
    children.push(spacer(140));
  }

  if (safeText(safeDraft.conclusion, "") !== "") {
    children.push(sectionHeading("ЗАКЛЮЧЕНИЕ"));
    children.push(
      twoColTable([["Итоговый вывод", safeText(safeDraft.conclusion)]])
    );
    children.push(spacer(140));
  }

  children.push(
    paragraph(`Polar Star Passport · ${new Date().toLocaleDateString("ru-RU")}`, {
      italics: true,
      size: 18,
      color: COLORS.muted,
      align: AlignmentType.CENTER,
      before: 180,
      after: 0
    })
  );

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 900,
              right: 700,
              bottom: 900,
              left: 700
            },
            size: {
              orientation: PageOrientation.PORTRAIT
            }
          }
        },
        children
      }
    ]
  });
}

export async function draftToDocxBinary(
  draft: DraftData
): Promise<Uint8Array> {
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
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Маршрут: /api/passport-docx/test" }),
          new Paragraph({ text: "Назначение: Проверка сборки DOCX" }),
          new Paragraph({ text: "Статус: OK" })
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
            text: safeText(message)
          }),
          ...(details
            ? [
                new Paragraph({ text: "" }),
                new Paragraph({
                  text: "Технические детали:",
                  heading: HeadingLevel.HEADING_3
                }),
                new Paragraph({
                  text: safeText(details)
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