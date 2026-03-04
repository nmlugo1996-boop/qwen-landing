import { NextResponse } from "next/server";
import { draftToDocxBinary } from "../../../lib/passportDocx";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const draft = body?.draft ?? body;
    if (!draft || typeof draft !== "object") {
      return NextResponse.json(
        { error: "Требуется объект draft в теле запроса" },
        { status: 400 }
      );
    }
    const docxBytes = await draftToDocxBinary(draft);
    const arrayBuffer = docxBytes.buffer.slice(
      docxBytes.byteOffset,
      docxBytes.byteOffset + docxBytes.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    return new NextResponse(blob, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="passport.docx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("passport-docx API error", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Ошибка генерации DOCX" },
      { status: 500 }
    );
  }
}
