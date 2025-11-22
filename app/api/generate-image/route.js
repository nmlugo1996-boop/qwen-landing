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
  
  // Логируем полный ответ для отладки
  console.log("Gemini API response structure:", JSON.stringify(data, null, 2));
  
  // Проверяем разные возможные структуры ответа
  let imageUrl = null;
  let imageBase64 = null;
  let content = null;

  // Вариант 1: стандартный формат OpenRouter
  if (data?.choices?.[0]?.message?.content) {
    content = data.choices[0].message.content;
  }

  // Вариант 2: изображение может быть в отдельном поле
  if (data?.image_url) {
    imageUrl = data.image_url;
  }
  if (data?.image) {
    imageBase64 = data.image;
  }

  // Вариант 3: в choices может быть изображение
  if (data?.choices) {
    for (const choice of data.choices) {
      // Проверяем message.content
      if (choice.message?.content) {
        const msgContent = choice.message.content;
        
        // Если content - это массив (может содержать текст и изображения)
        if (Array.isArray(msgContent)) {
          for (const item of msgContent) {
            if (item.type === "image_url" && item.image_url?.url) {
              imageUrl = item.image_url.url;
            } else if (item.type === "image" && item.image) {
              imageBase64 = item.image;
            } else if (typeof item === "string") {
              content = item;
            }
          }
        } else if (typeof msgContent === "string") {
          content = msgContent;
        }
      }

      // Проверяем наличие изображения в других полях
      if (choice.message?.image_url) {
        imageUrl = choice.message.image_url;
      }
      if (choice.message?.image) {
        imageBase64 = choice.message.image;
      }
    }
  }

  // Если content есть, пытаемся извлечь изображение из текста
  if (content && !imageUrl && !imageBase64) {
    // Пытаемся найти URL в ответе
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif)/i);
    if (urlMatch) {
      imageUrl = urlMatch[0];
    }

    // Пытаемся найти base64 изображение
    const base64Match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      imageBase64 = base64Match[0];
    }

    // Пытаемся найти markdown изображение ![alt](url)
    const markdownMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    if (markdownMatch) {
      imageUrl = markdownMatch[1];
    }

    // Если это JSON ответ с изображением
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.image_url || parsed.imageUrl) {
          imageUrl = parsed.image_url || parsed.imageUrl;
        } else if (parsed.image) {
          imageBase64 = parsed.image;
        } else if (parsed.url) {
          imageUrl = parsed.url;
        }
      }
    } catch (e) {
      // Не JSON, продолжаем
    }
  }

  // Логируем результат парсинга
  console.log("Parsed result:", { 
    hasImageUrl: !!imageUrl, 
    hasImageBase64: !!imageBase64,
    contentLength: content?.length || 0 
  });

  if (!imageUrl && !imageBase64 && content) {
    // Если не нашли изображение, возвращаем content для отладки
    console.warn("Image not found in response. Content preview:", content.substring(0, 500));
  }

  return {
    imageUrl,
    imageBase64,
    rawContent: content || JSON.stringify(data, null, 2)
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

