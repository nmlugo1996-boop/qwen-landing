// app/api/passport-docx/route.ts
import { draftToDocxBinary } from "../../../lib/passportDocx";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const draft = body?.draft ?? body;

    if (!draft || typeof draft !== "object") {
      return new Response(JSON.stringify({
        error: true,
        message: "В теле запроса не найден объект draft"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const u8 = await draftToDocxBinary(draft);

    // Передаём ArrayBuffer — это безопасно для BodyInit в TS
    const arrayBuffer = u8.buffer.slice(
      u8.byteOffset,
      u8.byteOffset + u8.byteLength
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="passport.docx"',
        "Content-Length": String(u8.byteLength),
        "Cache-Control": "no-store, must-revalidate"
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Не удалось обработать запрос на сборку DOCX";
    return new Response(JSON.stringify({ error: true, message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}