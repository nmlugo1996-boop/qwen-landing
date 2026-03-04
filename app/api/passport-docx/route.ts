import { NextResponse } from "next/server";
import { draftToDocxBinary } from "../../../lib/passportDocx";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const draft = body?.draft ?? body;
    if (!draft || typeof draft !== "object") {
      return NextResponse.json(
        { error: "Требуется объект draft в теле запроса" },
        { status: 400 }
      );
    }

    console.log("[passport-docx] start", {
      size: typeof draft === "object" ? Object.keys(draft).length : 0,
    });

    const docxBytes = await draftToDocxBinary(draft);

    let arrayBuffer: ArrayBuffer;
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(docxBytes)) {
      const buf = docxBytes as Buffer;
      arrayBuffer = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength
      ) as ArrayBuffer;
    } else if (docxBytes instanceof Uint8Array) {
      const u8 = docxBytes;
      arrayBuffer = u8.buffer.slice(
        u8.byteOffset,
        u8.byteOffset + u8.byteLength
      ) as ArrayBuffer;
    } else {
      throw new Error("draftToDocxBinary returned unexpected type");
    }

    console.log("[passport-docx] done");

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="passport.docx"',
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("[passport-docx] error:", err);
    return NextResponse.json(
      {
        error: true,
        message: String(
          err instanceof Error ? err.message : "Ошибка генерации DOCX"
        ),
      },
      { status: 500 }
    );
  }
}
