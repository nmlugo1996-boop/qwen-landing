import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const INPUT_SCHEMA = z.object({
  category: z.string().optional(),
  name: z.string().optional(),
  audience: z.string().optional(),
  pain: z.string().optional(),
  innovation: z.string().optional(),
  visualImage: z.string().optional(),
  packagingDescription: z.string().optional(),
  brandingCore: z.string().optional()
});

async function callGeminiImageGeneration(prompt) {
  const apiUrl =
    process.env.QWEN_API_URL || "https://openrouter.ai/api/v1/chat/completions";
  const apiKey = process.env.QWEN_API_KEY;
  const model =
    process.env.IMAGE_MODEL_NAME || "google/gemini-2.5-flash-image-preview";

  if (!apiKey) {
    throw new Error("QWEN_API_KEY is not configured");
  }

  if (!model) {
    throw new Error("IMAGE_MODEL_NAME is not configured");
  }

  const messages = [
    {
      role: "user",
      content: prompt
    }
  ];

  const body = {
    model,
    messages,
    temperature: 0.8
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Модель вернула пустой ответ");
  }

  // Gemini может вернуть изображение в разных форматах
  // Проверяем, есть ли URL изображения или base64
  let imageUrl = null;
  let imageBase64 = null;

  // Пытаемся найти URL в ответе
  const urlMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
  if (urlMatch) {
    imageUrl = urlMatch[0];
  }

  // Пытаемся найти base64 изображение
  const base64Match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
  if (base64Match) {
    imageBase64 = base64Match[0];
  }

  // Если это JSON ответ с изображением
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.image_url) {
        imageUrl = parsed.image_url;
      } else if (parsed.image) {
        imageBase64 = parsed.image;
      } else if (parsed.url) {
        imageUrl = parsed.url;
      }
    }
  } catch (e) {
    // Не JSON, продолжаем
  }

  return {
    imageUrl,
    imageBase64,
    rawContent: content
  };
}

function buildImagePrompt(input) {
  const parts = [];

  parts.push("Создай профессиональное изображение упаковки продукта для маркетинга.");

  if (input.name) {
    parts.push(`Название продукта: ${input.name}`);
  }

  if (input.category) {
    parts.push(`Категория продукта: ${input.category}`);
  }

  if (input.audience) {
    parts.push(`Целевая аудитория: ${input.audience}`);
  }

  if (input.visualImage) {
    parts.push(`Визуальный образ продукта: ${input.visualImage}`);
  }

  if (input.packagingDescription) {
    parts.push(`Описание упаковки: ${input.packagingDescription}`);
  }

  if (input.brandingCore) {
    parts.push(`Ядро бренда: ${input.brandingCore}`);
  }

  if (input.innovation) {
    parts.push(`Уникальность продукта: ${input.innovation}`);
  }

  parts.push("");
  parts.push("Требования к изображению:");
  parts.push("- Высокое качество, профессиональный дизайн");
  parts.push("- Упаковка должна быть привлекательной и современной");
  parts.push("- Учитывай целевую аудиторию и стиль бренда");
  parts.push("- Изображение должно быть готово для использования в маркетинге");
  parts.push("- Формат: реалистичная фотография или 3D-рендер упаковки");

  return parts.join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = INPUT_SCHEMA.parse(body);

    const prompt = buildImagePrompt(payload);
    const result = await callGeminiImageGeneration(prompt);

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      imageBase64: result.imageBase64,
      rawContent: result.rawContent
    });
  } catch (error) {
    console.error("Generate image API error", error);
    const message =
      error instanceof z.ZodError
        ? error.flatten()
        : { error: error.message || "Internal error" };
    return NextResponse.json(message, { status: 400 });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

