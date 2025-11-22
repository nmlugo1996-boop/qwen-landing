import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { category, audience, uniqueness, tech, wishes, innovation } =
      body || {};

    const prompt = `
Ты — эксперт по продуктовой аналитике и когнитивно-сенсорному маркетингу.
Сгенерируй 10 самых релевантных потребительских болей на основе информации ниже.

Категория продукта: ${category}
Целевая аудитория: ${audience}
Уникальность: ${uniqueness}
Технология/состав: ${tech}
Пожелания пользователя: ${wishes}
Инновация: ${innovation}

Формат ответа — строго JSON-массив строк:
[
  "боль 1",
  "боль 2",
  ...
]
Без пояснений, без текста вокруг.
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen/qwen3-next-80b-a3b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8
      })
    });

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || "[]";
    let pains;

    try {
      pains = JSON.parse(content);
    } catch {
      pains = [];
    }

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
