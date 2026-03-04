import { NextResponse } from "next/server";
import path from "node:path";
import { createRequire } from "node:module";

export const runtime = "nodejs";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { runGenerate } = require(path.join(process.cwd(), "api", "generate.js"));

export async function POST(request) {
  try {
    const body = await request.json();
    const draft = await runGenerate(body);
    return NextResponse.json(draft);
  } catch (error) {
    console.error("Generate passport API error", error);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
