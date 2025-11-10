/**
 * Vercel Serverless Function: POST /api/generate
 * При наличии MODEL_API_KEY зовёт внешнее LLM API.
 * Если ключа нет — генерирует локальный черновик паспорта.
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { category, name, audience = [], pains = [], imageDataUrl } = body;

    if (!category) {
      res.status(400).json({ error: 'Укажи категорию продукта' });
      return;
    }

    const hasLLM = !!process.env.MODEL_API_KEY;

    if (hasLLM) {
      const payload = {
        model: process.env.MODEL_NAME || 'qwen2.5-instruct',
        temperature: 0.7,
        max_tokens: 1400,
        input: buildPrompt({ category, name, audience, pains })
      };

      const resp = await fetch(process.env.MODEL_API_BASE || 'https://api.example.com/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MODEL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        res.status(502).json({ error: `LLM error ${resp.status}: ${text.substring(0, 400)}` });
        return;
      }

      const data = await resp.json();
      const draft = data.output || data.choices?.[0]?.message?.content || data.choices?.[0]?.text || data;
      res.status(200).json({ draft, mode: 'llm' });
      return;
    }

    const draft = localPassportDraft({ category, name, audience, pains });
    res.status(200).json({ draft, mode: 'local' });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Сбой генерации' });
  }
};

function buildPrompt({ category, name, audience, pains }) {
  return `
Ты — маркетолог. Собери когнитивно-сенсорный паспорт (4 блока × 20 задач)
Категория: ${category}
Название: ${name || 'придумай 3 варианта'}
Целевая аудитория: ${(audience || []).join(', ') || 'уточни сам'}
Боли: ${(pains || []).join(', ') || 'уточни сам'}

Структура ответа: 
{
 "cognitive": [5 пунктов],
 "sensory": [5 пунктов],
 "branding": [5 пунктов],
 "marketing": [5 пунктов],
 "summary": "коротко"
}
Ответ строго в JSON.
`;
}

function localPassportDraft({ category, name, audience, pains }) {
  const n = name && String(name).trim() ? name.trim() : null;
  const aud = (audience || []).length ? audience.join(', ') : 'семьи, 25–44';
  const ps = (pains || []).length ? pains : ['Недоверие к составу', 'Сложно выбрать на полке'];

  return {
    title: n || `Идеи названий: ${category} — "Полярный вкус", "Норд-Фреш", "Северная звезда"`,
    category,
    audience: aud,
    cognitive: [
      `Контекст потребления: ${category} в повседневных перекусах`,
      `Главные барьеры: ${ps.slice(0, 2).join(', ')}`,
      'Ожидаемая выгода: быстрый выбор без сомнений',
      'Сообщение на упаковке: честный состав, понятный вкус',
      'Точка контакта: полка + карточка товара онлайн'
    ],
    sensory: [
      'Визуал: светлая теплая гамма, крупный шрифт',
      'Графика: звезда/северный акцент, аккуратные пиктограммы',
      'Тактильно: матовая упаковка, мягкие углы',
      'Аромат/вкус: честно описать профиль, без «волшебства»',
      'Фото продукта крупно, без стилизаций'
    ],
    branding: [
      'Характер: честный, спокойный, заботливый',
      'Обещание: «понятный состав — уверенный выбор»',
      'Теги: family-friendly, daily, clean label',
      'Путь клиента: вижу → понимаю → беру → повторяю',
      'Голос: коротко, без жаргона'
    ],
    marketing: [
      'Полка: стоппер «Честный состав»',
      'E-com: карточка с инфографикой состава',
      'Промо: дегустация + буклет 1 страница',
      'UGC: рецепты/ритуалы дома',
      'Метрика: повторная покупка, сохранённые карточки'
    ],
    summary: 'Черновик паспорта готов: 4 блока × 5 пунктов.'
  };
}
