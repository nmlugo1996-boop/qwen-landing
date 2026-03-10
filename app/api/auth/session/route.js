// app/api/auth/session/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ВРЕМЕННАЯ ЗАГЛУШКА — Supabase отключен
    // В будущем можно подключить другую систему аутентификации
    
    return NextResponse.json({
      session: null,
      message: "Аутентификация временно отключена"
    });
  } catch (error) {
    console.error("session route error", error);
    return NextResponse.json(
      { 
        session: null, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    );
  }
}