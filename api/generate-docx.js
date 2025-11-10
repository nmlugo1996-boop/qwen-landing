import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ImageRun } from "docx";

export default async function handler(req, res){
  try{
    if(req.method!=="POST") return res.status(405).end("Method Not Allowed");
    const { answers, packImageDataURL } = req.body||{};
    if(!answers) return res.status(400).end("No answers");

    const sections = [
      new Paragraph({ text: "Когнитивно-сенсорный паспорт", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: "Методика «Полярная звезда»", spacing:{ after: 200 }, alignment: AlignmentType.CENTER })
    ];

    if(packImageDataURL){
      sections.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children:[ new ImageRun({ data: dataUrlToBuffer(packImageDataURL), transformation:{ width: 480, height: 270 }}) ]
      }));
    }

    sections.push(
      new Paragraph({ text: "База", heading: HeadingLevel.HEADING_2, spacing:{ before: 300, after: 100 }}),
      tableKV([
        ["Категория", answers?.base?.category||""],
        ["Название", answers?.base?.name||""],
        ["Целевая аудитория", answers?.base?.audience||""],
        ["Потребительская боль", answers?.base?.pain||""],
        ["Уникальность / УТП", answers?.base?.uvp||""]
      ]),
      ...blockTable("Когнитивный блок", answers?.blocks?.cognitive),
      ...blockTable("Сенсорный блок", answers?.blocks?.sensory),
      ...blockTable("Брендинговый блок", answers?.blocks?.branding),
      ...blockTable("Маркетинговый блок", answers?.blocks?.marketing),
      new Paragraph({ text: "Дополнительно", heading: HeadingLevel.HEADING_2, spacing:{ before: 300, after: 100 }}),
      tableKV([
        ["Предложения по рецептурам", answers?.extra?.recipes||""],
        ["Предложения по упаковке", answers?.extra?.packaging||""],
        ["Другие предложения", answers?.extra?.other||""]
      ])
    );

    const doc = new Document({ sections:[{ children: sections }]});
    const b = await Packer.toBuffer(doc);
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition","attachment; filename=passport.docx");
    return res.send(Buffer.from(b));
  }catch(e){ res.status(500).end("docx_error: "+e.message); }
}

function tableKV(rows){
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k,v])=> new TableRow({
      children: [
        new TableCell({ children:[ new Paragraph({ children:[ new TextRun({ text: String(k||""), bold:true }) ]}) ]}),
        new TableCell({ children:[ new Paragraph({ children:[ new TextRun({ text: toText(v) }) ]}) ]})
      ]
    }))
  });
}

function blockTable(title, obj){
  const rows = [];
  if(obj){
    Object.keys(obj).sort().forEach(key=>{
      rows.push([key, obj[key]]);
    });
  }
  if(!rows.length) rows.push(["—","—"]);
  return [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_2, spacing:{ before: 300, after: 100 }}),
    tableKV(rows)
  ];
}

function toText(value){
  return value == null ? "" : String(value);
}

function dataUrlToBuffer(dataUrl){
  const b64 = dataUrl.split(",")[1]||"";
  return Buffer.from(b64, "base64");
}
