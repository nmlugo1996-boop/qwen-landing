export default async function handler(req, res){
  try{
    if(req.method!=="POST") return res.status(405).json({error:"Method Not Allowed"});
    const { category, productName, audience, pain, uniqueness } = req.body||{};
    if(!category || !audience) return res.status(400).json({error:"category и audience обязательны"});

    const SYSTEM = `Ты — бренд-стратег по мясным продуктам. Методика «Полярная звезда»: 4 блока × 5 пунктов (1.1–4.5). Пиши кратко, конкретно, сенсорно. Если имя/боль/УТП не заданы — предложи сам. JSON строго.`;
    const USER = `
ВХОД:
- Категория: ${category}
- Название: ${productName||"null"}
- ЦА (возраст): ${(audience?.ages||[]).join(", ")||"не указано"}
- ЦА (пол/группа): ${(audience?.genders||[]).join(", ")||"не указано"}
- Боль: ${pain||"null"}
- Уникальность/УТП: ${uniqueness||"null"}

ВЫХОД (СТРОГО JSON):
{
  "base": {
    "category": "...",
    "name": "...",
    "audience": "...",
    "pain": "...",
    "uvp": "..."
  },
  "blocks": {
    "cognitive":  {"1.1":"...","1.2":"...","1.3":"...","1.4":"...","1.5":"..."},
    "sensory":    {"2.1":"...","2.2":"...","2.3":"...","2.4":"...","2.5":"..."},
    "branding":   {"3.1":"...","3.2":"...","3.3":"...","3.4":"...","3.5":"..."},
    "marketing":  {"4.1":"...","4.2":"...","4.3":"...","4.4":"...","4.5":"..."}
  },
  "extra": {"recipes":"...","packaging":"...","other":"..."},
  "previewText": "2–4 предложения резюме"
}
`;

    const r = await fetch(process.env.QWEN_API_URL, {
      method:"POST",
      headers:{ "Authorization":`Bearer ${process.env.QWEN_API_KEY}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        model: process.env.QWEN_MODEL || "qwen/qwen2.5-72b-instruct",
        temperature: 0.5,
        messages: [{role:"system",content:SYSTEM},{role:"user",content:USER}]
      })
    });
    if(!r.ok){ const detail = await r.text().catch(()=> ""); return res.status(502).json({error:"upstream_error", detail}); }
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || data.output_text || "";
    let json; try{ json = JSON.parse(text); }catch{ const m=text.match(/{[\s\S]*}/); if(!m) return res.status(500).json({error:"invalid_json"}); json=JSON.parse(m[0]); }
    return res.json({ base: json.base, blocks: json.blocks, extra: json.extra, previewText: json.previewText });
  }catch(e){ return res.status(500).json({error:"server_error", detail:e.message}); }
}
