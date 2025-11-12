import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

export function draftToDocxBuffer(draft) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: draft?.header?.name || "КСМ-паспорт продукта",
            heading: HeadingLevel.HEADING1
          }),
          new Paragraph({
            text: "Краткий паспорт",
            heading: HeadingLevel.HEADING3
          }),
          createBriefTable(draft?.header),
          new Paragraph({ text: "" }),
          ...createBlockTables(draft?.blocks)
        ]
      }
    ]
  });

  return Packer.toBuffer(doc);
}

function createBriefTable(header) {
  const rows = [
    ["Категория", header?.category ?? "—"],
    ["Название", header?.name ?? "—"],
    ["Целевая аудитория", Array.isArray(header?.audience) ? header.audience.join(", ") : header?.audience ?? "—"],
    ["Потребительская боль", header?.pain ?? "—"],
    ["Уникальность", header?.innovation ?? "—"]
  ].map(([label, value]) =>
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: label, bold: true })] }),
        new TableCell({ children: [new Paragraph({ text: String(value ?? "—") })] })
      ]
    })
  );

  return new Table({
    columnWidths: [3500, 6500],
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows
  });
}

function createBlockTables(blocks = {}) {
  const order = [
    { key: "cognitive", title: "Когнитивный блок" },
    { key: "sensory", title: "Сенсорный блок" },
    { key: "branding", title: "Брендинговый блок" },
    { key: "marketing", title: "Маркетинговый блок" }
  ];

  const children = [];

  for (const block of order) {
    const rows = (blocks[block.key] ?? []).map((row, index) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(String(row?.no ?? index + 1))] }),
          new TableCell({ children: [new Paragraph(String(row?.question ?? ""))] }),
          new TableCell({ children: [new Paragraph(String(row?.answer ?? ""))] })
        ]
      })
    );

    if (!rows.length) continue;

    children.push(
      new Paragraph({
        text: block.title,
        heading: HeadingLevel.HEADING3
      }),
      new Table({
        columnWidths: [1000, 4500, 4500],
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "№", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Вопрос", bold: true })] }),
              new TableCell({ children: [new Paragraph({ text: "Ответ", bold: true })] })
            ]
          }),
          ...rows
        ]
      }),
      new Paragraph({ text: "" })
    );
  }

  return children;
}

