import { NextResponse } from "next/server";
import generateApi from "../../../api/generate.js";

export const runtime = "nodejs";

const runGenerate = generateApi.runGenerate;

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
