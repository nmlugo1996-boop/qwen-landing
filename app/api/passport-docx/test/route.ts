import { buildMinimalTestDocx } from "../../../lib/passportDocx";

export const runtime = "nodejs";

export async function GET() {
  try {
    const u8 = await buildMinimalTestDocx();
    const arrayBuffer = u8.buffer.slice(
      u8.byteOffset,
      u8.byteOffset + u8.byteLength
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="test-passport.docx"',
        "Content-Length": String(u8.byteLength),
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: true, message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
