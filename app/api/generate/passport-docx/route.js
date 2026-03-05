// app/api/generate/passport-docx/route.js
import { NextResponse } from "next/server";
import { draftToDocxBinary } from "../../../../lib/passportDocx.js";

function toArrayBufferFromPossible(docxBytes) {
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(docxBytes)) {
    const buf = docxBytes;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  if (docxBytes instanceof Uint8Array) {
    const u8 = docxBytes;
    return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  }
  if (docxBytes instanceof ArrayBuffer) {
    return docxBytes;
  }
  if (typeof docxBytes === "string") {
    try {
      const b = Buffer.from(docxBytes, "base64");
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    } catch (e) {}
  }
  throw new Error("draftToDocxBinary returned unexpected type");
}

export async function POST(req) {
  const reqId = Math.random().toString(36).slice(2, 9);
  const start = Date.now();
  try {
    const body = await req.json();
    const draft = body?.draft ?? body;
    if (!draft || typeof draft !== "object") {
      return NextResponse.json({ error: "Requires draft object in request body" }, { status: 400 });
    }

    console.log(`[passport-docx][${reqId}] start keys=${Object.keys(draft).length}`);

    const docxBytes = await draftToDocxBinary(draft);

    // compute size
    let size = 0;
    try {
      if (typeof Buffer !== "undefined" && Buffer.isBuffer(docxBytes)) size = docxBytes.length;
      else if (docxBytes instanceof Uint8Array) size = docxBytes.byteLength;
      else if (docxBytes instanceof ArrayBuffer) size = docxBytes.byteLength;
      else if (typeof docxBytes === "string") size = Buffer.from(docxBytes, "base64").length;
    } catch (e) { console.warn(e); }

    let arrayBuffer;
    try {
      arrayBuffer = toArrayBufferFromPossible(docxBytes);
    } catch (err) {
      console.error(`[passport-docx][${reqId}] invalid type:`, err);
      return NextResponse.json({ error: "draftToDocxBinary returned unexpected type" }, { status: 500 });
    }

    const length = arrayBuffer.byteLength || 0;
    const headers = {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="passport.docx"',
      "Content-Length": String(length),
      "Cache-Control": "no-store, must-revalidate"
    };

    console.log(`[passport-docx][${reqId}] sending length=${length} elapsed=${Date.now() - start}ms`);
    return new Response(arrayBuffer, { status: 200, headers });

  } catch (err) {
    console.error(`[passport-docx][${reqId}] fatal error`, err);
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ error: true, message, stack }, { status: 500 });
  }
}
