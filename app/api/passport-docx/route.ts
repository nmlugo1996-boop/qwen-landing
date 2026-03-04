import { draftToDocxBinary } from "../../../lib/passportDocx";

export const runtime = "nodejs";

export async function POST(req: Request) {
  console.log("[passport-docx] request start");
  try {
    const body = await req.json();
    const draft = body?.draft ?? body;
    if (!draft || typeof draft !== "object") {
      return new Response(
        JSON.stringify({ error: "Требуется объект draft в теле запроса" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log("[passport-docx] got draft");

    const docxBytes = await draftToDocxBinary(draft);
    console.log("[passport-docx] got docxBytes, typeof:", typeof docxBytes);

    const BufferAvailable =
      typeof Buffer !== "undefined" &&
      typeof (Buffer as unknown as { isBuffer?: (x: unknown) => boolean })
        .isBuffer === "function";
    const isBuffer =
      BufferAvailable &&
      (Buffer as unknown as { isBuffer: (x: unknown) => boolean }).isBuffer(
        docxBytes
      );
    const isUint8 = docxBytes instanceof Uint8Array;
    console.log("[passport-docx] isBuffer:", isBuffer, "isUint8:", isUint8);

    let size = 0;
    let previewHex = "";

    if (isBuffer) {
      const buf = docxBytes as Buffer;
      size = buf.length;
      previewHex = buf.slice(0, 8).toString("hex");
    } else if (isUint8) {
      const u8 = docxBytes as Uint8Array;
      size = u8.byteLength;
      previewHex = Array.from(u8.slice(0, 8))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } else {
      try {
        previewHex = JSON.stringify(docxBytes).slice(0, 200);
      } catch {
        previewHex = String(docxBytes).slice(0, 200);
      }
    }
    console.log(`[passport-docx] previewHex=${previewHex} size=${size}`);

    let arrayBuffer: ArrayBuffer;
    if (isBuffer) {
      const buf = docxBytes as Buffer;
      arrayBuffer = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength
      ) as ArrayBuffer;
    } else if (isUint8) {
      const u8 = docxBytes as Uint8Array;
      arrayBuffer = u8.buffer.slice(
        u8.byteOffset,
        u8.byteOffset + u8.byteLength
      ) as ArrayBuffer;
    } else {
      return new Response(
        JSON.stringify({ error: "docx_bytes_not_binary", preview: previewHex }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const contentLength = size || arrayBuffer.byteLength;
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="passport.docx"',
        "Content-Length": String(contentLength),
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown_error";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[passport-docx] error", stack || err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
