// api/generate-docx.js
const { Document, Packer, Paragraph, TextRun } = require("docx");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const draft = body.draft || {};
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "Паспорт продукта — Полярная звезда", bold: true, size: 28 }),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: `Категория: ${draft.category || "—"}` }),
            new Paragraph({ text: `Название: ${draft.title || "—"}` }),
            new Paragraph({ text: `Аудитория: ${draft.audience || "—"}` }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Когнитивный блок:" }),
            ...(draft.cognitive || []).map(t => new Paragraph({ text: `• ${t}` })),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Сенсорный блок:" }),
            ...(draft.sensory || []).map(t => new Paragraph({ text: `• ${t}` })),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Брендинговый блок:" }),
            ...(draft.branding || []).map(t => new Paragraph({ text: `• ${t}` })),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "Маркетинговый блок:" }),
            ...(draft.marketing || []).map(t => new Paragraph({ text: `• ${t}` })),
            new Paragraph({ text: "" }),
            new Paragraph({ text: draft.summary || "—" }),
          ],
        },
      ],
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
