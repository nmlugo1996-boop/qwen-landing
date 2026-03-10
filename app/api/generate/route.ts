// app/api/generate/route.ts
import { NextResponse } from "next/server";
import runGenerate from "../../../lib/generatePassport";

// ⚡ Разрешаем функции работать до 60 секунд (лимит Vercel)
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }

    // Запускаем генерацию напрямую (без очереди и Supabase)
    const result = await runGenerate(body);

    // Возвращаем результат сразу
    return NextResponse.json(
      { ok: true, draft: result },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'Pragma': 'no-cache'
        }
      }
    );

  } catch (error) {
    console.error("Generate API error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}