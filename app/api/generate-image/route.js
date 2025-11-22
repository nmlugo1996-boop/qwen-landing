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
  
  // Явно проверяем и используем IMAGE_MODEL_NAME
  let model = process.env.IMAGE_MODEL_NAME;
  
  // Если переменная не установлена или пустая, используем дефолт
  if (!model || model.trim() === "") {
    console.warn("IMAGE_MODEL_NAME not set, using default");
    model = "google/gemini-2.5-flash-image";
  }
  
  // Убираем пробелы и проверяем, что это не текстовая модель
  model = model.trim();
  
  // Логируем, какая модель используется
  console.log("=== IMAGE GENERATION DEBUG ===");
  console.log("IMAGE_MODEL_NAME from env (raw):", process.env.IMAGE_MODEL_NAME);
  console.log("IMAGE_MODEL_NAME from env (type):", typeof process.env.IMAGE_MODEL_NAME);
  console.log("TEXT_MODEL_NAME from env:", process.env.TEXT_MODEL_NAME);
  console.log("Selected model for image generation:", model);
  console.log("API URL:", apiUrl);
  
  // КРИТИЧЕСКАЯ ПРОВЕРКА: если модель содержит qwen и НЕ содержит image, это ошибка
  if (model.toLowerCase().includes("qwen") && !model.toLowerCase().includes("image")) {
    const errorMsg = `FATAL ERROR: Wrong model detected! Model="${model}". This is a TEXT model, not an IMAGE generation model. IMAGE_MODEL_NAME env var may be missing or incorrect.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!apiKey) {
    throw new Error("QWEN_API_KEY is not configured");
  }

  if (!model) {
    throw new Error("IMAGE_MODEL_NAME is not configured");
  }

  // Проверяем, что не используется текстовая модель по ошибке
  if (model.includes("qwen") && !model.includes("image")) {
    console.error("WARNING: Using text model for image generation! Model:", model);
    throw new Error(`Wrong model selected: ${model}. Should be an image generation model like google/gemini-2.5-flash-image`);
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
    // Для моделей генерации изображений не нужен response_format: json_object
    // Они возвращают изображения в специальном формате
  };

  console.log("Request body model:", body.model);
  console.log("Request body (without messages):", { model: body.model, temperature: body.temperature });

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
            // OpenRouter может возвращать изображения в разных форматах
            if (item.type === "image_url" && item.image_url?.url) {
              imageUrl = item.image_url.url;
            } else if (item.type === "image" && item.image) {
              // Может быть base64 или URL
              if (item.image.startsWith("data:")) {
                imageBase64 = item.image;
              } else if (item.image.startsWith("http")) {
                imageUrl = item.image;
              } else {
                imageBase64 = item.image;
              }
            } else if (item.type === "image" && item.url) {
              imageUrl = item.url;
            } else if (typeof item === "string") {
              content = item;
            }
          }
        } else if (typeof msgContent === "string") {
          content = msgContent;
        }
      }

      // Проверяем наличие изображения в других полях choice
      if (choice.image_url) {
        imageUrl = choice.image_url;
      }
      if (choice.image) {
        imageBase64 = choice.image;
      }
      if (choice.url) {
        imageUrl = choice.url;
      }

      // Проверяем наличие изображения в message
      if (choice.message?.image_url) {
        imageUrl = choice.message.image_url;
      }
      if (choice.message?.image) {
        imageBase64 = choice.message.image;
      }
      if (choice.message?.url) {
        imageUrl = choice.message.url;
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

  // Явно указываем, что нужна генерация изображения
  parts.push("ВАЖНО: Ты должен сгенерировать изображение упаковки продукта, а не текстовое описание.");
  parts.push("Верни изображение в формате URL или base64, а не текстовое описание.");
  parts.push("");
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
  parts.push("");
  parts.push("ВЕРНИ ИЗОБРАЖЕНИЕ, А НЕ ТЕКСТОВОЕ ОПИСАНИЕ!");

  return parts.join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = INPUT_SCHEMA.parse(body);

    const prompt = buildImagePrompt(payload);
    const result = await callGeminiImageGeneration(prompt);

  // Если изображение не найдено, возвращаем полный ответ для отладки
  if (!result.imageUrl && !result.imageBase64) {
    console.error("Image not found in response. Full response:", JSON.stringify(data, null, 2));
    return NextResponse.json({
      success: false,
      error: "Изображение не было найдено в ответе API",
      imageUrl: null,
      imageBase64: null,
      rawContent: result.rawContent,
      fullResponse: data, // Возвращаем полный ответ для диагностики
      debug: {
        hasChoices: !!data?.choices,
        choicesLength: data?.choices?.length || 0,
        firstChoiceContent: data?.choices?.[0]?.message?.content?.substring?.(0, 500) || "N/A"
      }
    });
  }

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

