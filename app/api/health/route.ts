import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const buildSha = process.env.VERCEL_GIT_COMMIT_SHA || "local";

  return NextResponse.json({
    ok: true,
    build: buildSha.slice(0, 7),
    timestamp: new Date().toISOString()
  });
}
