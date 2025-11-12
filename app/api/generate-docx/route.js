import { NextResponse } from "next/server";
import { z } from "zod";
import { draftToDocxBuffer } from "../../../lib/passportDocx";

export const runtime = "nodejs";

const INPUT_SCHEMA = z.object({
  draft: z.record(z.any())
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { draft } = INPUT_SCHEMA.parse(body);

    const buffer = await draftToDocxBuffer(draft);
    const filename =
      (draft?.header?.name || draft?.header?.category || "passport").replace(/[\\/:*?"<>|]+/g, "_") + ".docx";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("generate-docx error", error);
    return NextResponse.json({ error: error.message || "DOCX generation failed" }, { status: 400 });
  }
}

