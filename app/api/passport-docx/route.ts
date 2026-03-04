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
    const buffer = await draftToDocxBinary(draft);
    const filename = "passport.docx";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
