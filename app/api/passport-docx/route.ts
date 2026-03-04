import { draftToDocxBinary } from "../../../lib/passportDocx";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = await req.json();
    const draft = body?.draft ?? body;
    if (!draft || typeof draft !== "object") {
      return new Response(
        JSON.stringify({ error: "Требуется объект draft в теле запроса" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const reqId = Math.random().toString(36).slice(2, 9);
    console.log(`[passport-docx][${reqId}] start`, {
      keys: Object.keys(draft).length,
    });

    const docxBytes = await draftToDocxBinary(draft);
    console.log(
      `[passport-docx][${reqId}] got docxBytes typeof=${typeof docxBytes}`
    );

    let previewHex = "";
    let size = 0;
    try {
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

      console.log(
        `[passport-docx][${reqId}] isBuffer=${isBuffer} isUint8=${isUint8}`
      );

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
        previewHex = JSON.stringify(docxBytes).slice(0, 200);
      }
    } catch (e) {
      console.error(`[passport-docx][${reqId}] preview error:`, e);
    }

    console.log(
      `[passport-docx][${reqId}] previewHex=${previewHex} size=${size}`
    );

    let arrayBuffer: ArrayBuffer;
    const BufferCtor = Buffer as unknown as {
      isBuffer?: (x: unknown) => boolean;
    };
    if (
      typeof Buffer !== "undefined" &&
      BufferCtor?.isBuffer?.(docxBytes)
    ) {
      const buf = docxBytes as Buffer;
      arrayBuffer = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength
      ) as ArrayBuffer;
    } else if (docxBytes instanceof Uint8Array) {
      const u8 = docxBytes as Uint8Array;
      arrayBuffer = u8.buffer.slice(
        u8.byteOffset,
        u8.byteOffset + u8.byteLength
      ) as ArrayBuffer;
    } else {
      console.error(
        `[passport-docx][${reqId}] Unexpected type returned from draftToDocxBinary`
      );
      return new Response(
        JSON.stringify({
          error: "draftToDocxBinary returned unexpected type",
          preview: previewHex,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const length = size || arrayBuffer.byteLength || 0;
    console.log(
      `[passport-docx][${reqId}] sending response length=${length} elapsed=${Date.now() - start}ms`
    );

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="passport.docx"',
        "Content-Length": String(length),
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[passport-docx] fatal error:", message, stack);
    return new Response(
      JSON.stringify({ error: true, message, stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
