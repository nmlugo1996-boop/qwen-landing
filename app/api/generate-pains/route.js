import { NextResponse } from "next/server";

const API_URL =
  process.env.QWEN_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const MODEL =
  process.env.TEXT_MODEL_NAME || "qwen/qwen3-next-80b-a3b-instruct";
const API_KEY = process.env.QWEN_API_KEY;

export async function POST(req) {
  if (!API_KEY) {
    console.error("QWEN_API_KEY is not set");
    return NextResponse.json(
      { error: "Server config error" },
      { status: 500 }
    );
  }
  try {
    const body = await req.json();
    const {
      category,
      audience,
      pain,
      uniqueness,
      tech,
      wishes,
      innovation
    } = body || {};
    const prompt = `
Ты — эксперт по продуктовой аналитике и когнитивно-сенсорному маркетингу.
ЗАДАЧА:
На основе входных данных сгенерируй 10 наиболее релевантных, чётких и не пересекающихся между собой потребительских болей для продукта. Боли должны быть сформулированы так, чтобы по ним можно было строить сильный дизрапт и продуктовый паспорт.

Исходные данные:
Категория продукта: ${category || "-"}
Целевая аудитория: ${audience || "-"}
Текущая формулировка боли (если есть): ${pain || "-"}
Уникальность продукта: ${uniqueness || "-"}
Технология и состав: ${tech || "-"}
Пожелания к новому продукту: ${wishes || "-"}
Ключевая инновация / идея продукта: ${innovation || "-"}

ТРЕБОВАНИЯ К БОЛЯМ:
- Каждая боль описывает конкретный внутренний конфликт, страх, неудобство или фрустрацию потребителя.
- Не описывай свойства продукта, только боль / проблему потребителя.
- Не дублируй смыслы: каждая формулировка должна добавлять новый угол зрения.
- Пиши человеческим языком, без канцелярита и маркетингового пафоса.
- Не используй внутри болей слова "боль", "pain", "целевой", "УТП" и т.п. — только реальные формулировки от лица потребителя.

ТРЕБОВАНИЯ К ФОРМАТУ ОТВЕТА:
- Ответ должен быть строго в виде JSON-массива строк.
- Никакого текста до или после массива.
- Никаких комментариев, нумерации, маркеров, переносов с дефисами и т.п. — только чистый массив строк.

ПРИМЕР ФОРМАТА (СТРУКТУРА, НЕ СОДЕРЖАНИЕ):
[
  "Родители боятся, что ребёнок ест слишком много сахара, но не знают, чем заменить сладости",
  "Детям не нравится вкус 'полезных' продуктов, и каждый перекус превращается в борьбу",
  "У родителей нет времени и сил каждый день придумывать новый полезный перекус"
]
    `.trim();

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8
      })
    });
    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || "[]";
    let pains;
    try {
      pains = JSON.parse(content);
      if (!Array.isArray(pains)) {
        pains = [];
      }
    } catch (e) {
      console.error("Failed to parse pains JSON:", e, content);
      pains = [];
    }
    pains = pains
      .filter((p) => typeof p === "string")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    return NextResponse.json({ pains });
  } catch (error) {
    console.error("generate-pains error:", error);
    return NextResponse.json(
      { error: "Failed to generate pains" },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
