// api/generate-docx.js — Полная форма паспорта (CommonJS)
const {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType,
  AlignmentType, HeadingLevel
} = require("docx");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const draft = body.draft || {};

    const doc = new Document({
      sections: [{ children: buildDoc(draft) }],
      creator: "Polar Star",
      description: "Когнитивно-сенсорный маркетинговый паспорт (Полярная звезда)"
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", "attachment; filename=passport.docx");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Ошибка генерации DOCX" });
  }
};

function buildDoc(draft) {
  const { category, title, audience, pain, uvp } = draft;
  const cog = norm5(draft.cognitive);
  const sen = norm5(draft.sensory);
  const br  = norm5(draft.branding);
  const mrk = norm5(draft.marketing);

  const children = [];

  children.push(
    para("Когнитивно-сенсорный маркетинговый паспорт нового продукта", HeadingLevel.TITLE, { align: AlignmentType.CENTER }),
    para("(по методике «Полярная звезда»)", HeadingLevel.HEADING_3, { align: AlignmentType.CENTER, after: 300 })
  );

  children.push(para("База", HeadingLevel.HEADING_2, { before: 200, after: 100 }));
  children.push(kvTable([
    ["Категория продукта", category || "—"],
    ["Название продукта", title || "—"],
    ["Целевая аудитория", audience || "—"],
    ["Потребительская боль", pain || "—"],
    ["Уникальное предложение (УТП)", uvp || "—"]
  ]));

  children.push(para("20 задач методики «Полярная звезда»", HeadingLevel.HEADING_2, { before: 300, after: 150 }));

  children.push(para("Когнитивный блок", HeadingLevel.HEADING_3, { before: 100, after: 50 }));
  children.push(qTable([
    ["1.1", "Какую потребительскую боль используем для дизрапта?", cog[0]],
    ["1.2", "Какую новую модель потребления открываем?", cog[1]],
    ["1.3", "Какую новую технологию потребления создаём?", cog[2]],
    ["1.4", "Какие нарративы объясняют ценность?", cog[3]],
    ["1.5", "На какие когнитивные функции опираемся?", cog[4]]
  ]));

  children.push(para("Сенсорный блок", HeadingLevel.HEADING_3, { before: 150, after: 50 }));
  children.push(qTable([
    ["2.1", "Сильный визуальный образ", sen[0]],
    ["2.2", "Сильный аудиальный образ", sen[1]],
    ["2.3", "Сильный обонятельный образ", sen[2]],
    ["2.4", "Сильный осязательный образ", sen[3]],
    ["2.5", "Сильный вкусовой образ", sen[4]]
  ]));

  children.push(para("Брендинговый блок", HeadingLevel.HEADING_3, { before: 150, after: 50 }));
  children.push(qTable([
    ["3.1", "Как улучшаем личную историю потребителя?", br[0]],
    ["3.2", "Какой контекст помогает бренду?", br[1]],
    ["3.3", "Сильное ядро бренда (название, логотип, слоган)", br[2]],
    ["3.4", "Путь клиента с продуктом", br[3]],
    ["3.5", "Стратегия развития бренда", br[4]]
  ]));

  children.push(para("Маркетинговый блок", HeadingLevel.HEADING_3, { before: 150, after: 50 }));
  children.push(qTable([
    ["4.1", "Сегментация / позиционирование", mrk[0]],
    ["4.2", "Развитие продукта во времени", mrk[1]],
    ["4.3", "Ценообразование", mrk[2]],
    ["4.4", "Каналы сбыта", mrk[3]],
    ["4.5", "Продвижение (фокус на безбюджетный маркетинг)", mrk[4]]
  ]));

  return children;
}

// ---------- utils ----------
function para(text, level, { align, after, before } = {}) {
  return new Paragraph({
    text: String(text || ""),
    heading: level || undefined,
    alignment: align || undefined,
    spacing: { after: after || 0, before: before || 0 }
  });
}

function kvTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) =>
      new TableRow({
        children: [
          new TableCell({ children: [ new Paragraph({ children: [ new TextRun({ text: String(k), bold: true }) ] }) ] }),
          new TableCell({ children: [ new Paragraph(String(v ?? "—")) ] })
        ]
      })
    )
  });
}

function qTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          thCell("№"), thCell("Вопрос"), thCell("Ответ")
        ]
      }),
      ...rows.map(([n, q, a]) =>
        new TableRow({
          children: [
            new TableCell({ children: [ new Paragraph(String(n)) ] }),
            new TableCell({ children: [ new Paragraph(String(q)) ] }),
            new TableCell({ children: [ new Paragraph(String(a || "—")) ] })
          ]
        })
      )
    ]
  });
}

function thCell(text) {
  return new TableCell({
    children: [ new Paragraph({ children: [ new TextRun({ text, bold: true }) ] }) ]
  });
}

function norm5(arr) {
  const a = Array.isArray(arr) ? arr.slice(0, 5) : [];
  while (a.length < 5) a.push("—");
  return a;
}
