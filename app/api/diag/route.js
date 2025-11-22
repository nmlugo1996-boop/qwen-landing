import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const present = (k) => Boolean(process.env[k] && String(process.env[k]).trim());

  return NextResponse.json({
    ok: true,
    env: {
      QWEN_API_URL: process.env.QWEN_API_URL || null,
      QWEN_API_KEY: present('QWEN_API_KEY') ? '***HIDDEN***' : null,
      TEXT_MODEL_NAME: process.env.TEXT_MODEL_NAME || null,
      IMAGE_MODEL_NAME: process.env.IMAGE_MODEL_NAME || null,
      RUNTIME: process.env.VERCEL ? 'vercel' : 'local',
      VERCEL_ENV: process.env.VERCEL_ENV || null,
      // Дополнительная диагностика
      IMAGE_MODEL_NAME_RAW: process.env.IMAGE_MODEL_NAME,
      IMAGE_MODEL_NAME_TYPE: typeof process.env.IMAGE_MODEL_NAME,
      IMAGE_MODEL_NAME_LENGTH: process.env.IMAGE_MODEL_NAME?.length || 0,
      // Проверка на Qwen
      IS_IMAGE_MODEL_QWEN: process.env.IMAGE_MODEL_NAME?.toLowerCase().includes('qwen') || false,
      IS_IMAGE_MODEL_GEMINI: process.env.IMAGE_MODEL_NAME?.toLowerCase().includes('gemini') || false,
    }
  });
}

