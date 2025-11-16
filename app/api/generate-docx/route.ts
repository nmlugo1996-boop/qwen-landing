import { NextRequest, NextResponse } from "next/server";
import { draftToDocxBinary, DraftData } from "@/lib/passportDocx";

export const runtime = "nodejs";

// чистим имя файла от запрещённых символов
function sanitizeBaseName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || "passport";
}

// делаем ASCII-версию, чтобы заголовок не падал из-за кириллицы
function toAscii(name: string): string {
  return name.replace(/[^\x20-\x7E]/g, "_"); // всё не-ASCII → "_"
}

export async function POST(req: NextRequest) {
  try {
    console.log("DOCX ROUTE START");

    const json = await req.json();
    const draft: DraftData = (json as any).draft ?? (json as DraftData);

    const binary = await draftToDocxBinary(draft);
    console.log("DOCX FIRST BYTES:", Array.from(binary.slice(0, 16)));

    // базовое имя (может содержать кириллицу) БЕЗ .docx
    const rawBaseName = sanitizeBaseName(
      `Паспорт_${draft.header?.name || "продукт"}`
    );

    const asciiBaseName = toAscii(rawBaseName);
    const encodedBaseName = encodeURIComponent(rawBaseName);

    const mime =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // Content-Disposition в RFC-формате: и простой ASCII, и UTF-8 вариант
    const contentDisposition =
      `attachment; filename="${asciiBaseName}.docx"; ` +
      `filename*=UTF-8''${encodedBaseName}.docx`;

    return new Response(binary as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "no-store"
      }
    });
  } catch (err) {
    console.error("DOCX ROUTE ERROR:", err);
    return NextResponse.json(
      { error: "Failed to generate DOCX" },
      { status: 500 }
    );
  }
}
