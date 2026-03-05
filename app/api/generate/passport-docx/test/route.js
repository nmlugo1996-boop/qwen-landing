// app/api/generate/passport-docx/test/route.js
import { buildMinimalTestDocx } from "../../../../../lib/passportDocx.js";

export async function GET() {
  const buf = await buildMinimalTestDocx();
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Response(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="test-passport.docx"',
      "Content-Length": String(arrayBuffer.byteLength),
      "Cache-Control": "no-store, must-revalidate"
    }
  });
}
