// app/api/generate/passport/route.js
import fs from "fs";
import path from "path";
import Ajv from "ajv";
import { NextResponse } from "next/server";

const QWEN_API_URL = process.env.QWEN_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const TEXT_MODEL_NAME = process.env.TEXT_MODEL_NAME || "qwen/qwen3.5-plus-02-15";

// env-configurable defaults for tokens/temperature
const DRAFT_TEMPERATURE = parseFloat(process.env.DRAFT_TEMPERATURE ?? "0.7");
const DRAFT_MAX_TOKENS = parseInt(process.env.DRAFT_MAX_TOKENS ?? "3000", 10);
const REFINE_TEMPERATURE = parseFloat(process.env.REFINE_TEMPERATURE ?? "0.2");
const REFINE_MAX_TOKENS = parseInt(process.env.REFINE_MAX_TOKENS ?? "2000", 10);

/**
 * Send request to OpenRouter / Qwen
 * returns { text, raw } where text is assistant text
 */
async function requestModel(messages, opts = { temperature: 0.7, max_tokens: 2000 }, apiKey = "") {
  const body = {
    model: TEXT_MODEL_NAME,
    messages,
    temperature: opts.temperature,
    max_tokens: opts.max_tokens,
  };

  const res = await fetch(QWEN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => null);
  // Common shapes: choices[0].message.content or choices[0].text
  const text = raw?.choices?.[0]?.message?.content ?? raw?.choices?.[0]?.text ?? "";
  return { text, raw };
}

/** extract string between markers ---BEGIN_JSON--- and ---END_JSON--- */
function extractBetweenMarkers(text = "", start = "---BEGIN_JSON---", end = "---END_JSON---") {
  if (!text) return null;
  const re = new RegExp(`${start}[\\s\\S]*?${end}`, "m");
  const m = text.match(re);
  if (!m) return null;
  const inner = m[0].replace(start, "").replace(end, "").trim();
  return inner;
}

/** Utility: safe JSON.parse that returns {ok, parsed, error} */
function safeParseJson(s) {
  try {
    return { ok: true, parsed: JSON.parse(s), error: null };
  } catch (err) {
    return { ok: false, parsed: null, error: String(err?.message ?? err) };
  }
}

export async function POST(req) {
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not set. Please add it to .env.local" }, { status: 500 });
    }

    const input = await req.json().catch(() => ({}));
    const { industry, idea, pain, audience, extra } = input;

    // per-request overrides for draft/refine (optional)
    const draftOverrides = (input && input.draft) || {};
    const refineOverrides = (input && input.refine) || {};

    // resolve effective draft/refine settings (request overrides take priority over env defaults)
    const draftTemperature = (typeof draftOverrides.temperature === "number")
      ? draftOverrides.temperature
      : DRAFT_TEMPERATURE;
    const draftMaxTokens = (draftOverrides.max_tokens !== undefined)
      ? parseInt(draftOverrides.max_tokens, 10)
      : DRAFT_MAX_TOKENS;

    const refineTemperature = (typeof refineOverrides.temperature === "number")
      ? refineOverrides.temperature
      : REFINE_TEMPERATURE;
    const refineMaxTokens = (refineOverrides.max_tokens !== undefined)
      ? parseInt(refineOverrides.max_tokens, 10)
      : REFINE_MAX_TOKENS;

    // load system prompt
    const baseDir = process.cwd();
    const promptPath = path.join(baseDir, "polar-star-passports", "passport_prompt.txt");
    if (!fs.existsSync(promptPath)) {
      return NextResponse.json({ error: "passport_prompt.txt not found in polar-star-passports" }, { status: 500 });
    }
    const systemPrompt = fs.readFileSync(promptPath, "utf8");

    // load few-shot examples (optional)
    const examplesDir = path.join(baseDir, "polar-star-passports", "examples");
    const goodExamplePath = path.join(examplesDir, "good_passport.json");
    const badExamplePath = path.join(examplesDir, "bad_passport.json");
    const goodExample = fs.existsSync(goodExamplePath) ? fs.readFileSync(goodExamplePath, "utf8") : "";
    const badExample = fs.existsSync(badExamplePath) ? fs.readFileSync(badExamplePath, "utf8") : "";

    const userInstruction = `Создай КСП (когнитивно-сенсорный паспорт) для продукта:
industry: ${industry || "не указано"}
idea: ${idea || ""}
pain: ${pain || ""}
audience: ${audience || ""}
extra: ${extra || ""}

Важное требование:
1) Сначала выдай ТОЛЬКО JSON между маркерами ---BEGIN_JSON--- и ---END_JSON--- (этот JSON должен соответствовать схеме passport_schema.json).
2) Затем, после маркера, выдай человеко-читаемый КСП в Markdown.
Если каких-то полей не хватает — логично дополни их или задай уточняющие вопросы.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(goodExample ? [{ role: "assistant", content: `Пример хорошего JSON (эталон):\n${goodExample}` }] : []),
      ...(badExample ? [{ role: "assistant", content: `Пример плохого JSON (чего избегать):\n${badExample}` }] : []),
      { role: "user", content: userInstruction },
    ];

    // 1) Draft — creative phase
    const draft = await requestModel(messages, { temperature: draftTemperature, max_tokens: draftMaxTokens }, OPENROUTER_API_KEY);
    console.log("draft raw:", draft.raw);
    // попытка извлечь json
    let rawJson = extractBetweenMarkers(draft.text);

    if (!rawJson) {
      // попросим модель повторить и выдать только JSON
      const fixPrompt = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `В предыдущем ответе не найден JSON между маркерами. Повтори и выдай ТОЛЬКО JSON между ---BEGIN_JSON--- и ---END_JSON---. Предыдущий ответ:\n${draft.text}` }
      ];
      const repaired = await requestModel(fixPrompt, { temperature: refineTemperature, max_tokens: refineMaxTokens }, OPENROUTER_API_KEY);
      console.log("repaired (no markers) raw:", repaired.raw);
      rawJson = extractBetweenMarkers(repaired.text);
      if (!rawJson) {
        return NextResponse.json({ error: "Не удалось извлечь JSON из ответа модели (нет маркеров)" }, { status: 500 });
      }
      return await validateAndRefine(rawJson, draft.text, systemPrompt, OPENROUTER_API_KEY, refineTemperature, refineMaxTokens);
    }

    // Proceed to validation/refine
    return await validateAndRefine(rawJson, draft.text, systemPrompt, OPENROUTER_API_KEY, refineTemperature, refineMaxTokens);

  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}

async function validateAndRefine(rawJson, draftText, systemPrompt, apiKey = "", refineTemperature = REFINE_TEMPERATURE, refineMaxTokens = REFINE_MAX_TOKENS) {
  const baseDir = process.cwd();
  const schemaPath = path.join(baseDir, "polar-star-passports", "passport_schema.json");
  if (!fs.existsSync(schemaPath)) {
    return NextResponse.json({ error: "passport_schema.json not found in polar-star-passports" }, { status: 500 });
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);

  // 1) try parse rawJson
  let parsed;
  const parsedAttempt = safeParseJson(rawJson);
  if (!parsedAttempt.ok) {
    // ask model to repair JSON syntax
    const repairPrompt = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `JSON ниже некорректен (синтаксическая ошибка). Исправь его и выдай ТОЛЬКО исправный JSON между маркерами ---BEGIN_JSON--- и ---END_JSON---.\n\n${rawJson}` }
    ];
    const repaired = await requestModel(repairPrompt, { temperature: refineTemperature, max_tokens: refineMaxTokens }, apiKey);
    console.log("repair raw:", repaired.raw);
    const fixed = extractBetweenMarkers(repaired.text);
    if (!fixed) {
      return NextResponse.json({ error: "Модель не вернула исправленный JSON (repair)" }, { status: 500 });
    }
    const parsedFixed = safeParseJson(fixed);
    if (!parsedFixed.ok) {
      return NextResponse.json({ error: "Не удалось распарсить JSON после исправления: " + parsedFixed.error }, { status: 500 });
    }
    parsed = parsedFixed.parsed;
  } else {
    parsed = parsedAttempt.parsed;
  }

  // 2) validate against schema
  let ok = validate(parsed);
  if (!ok) {
    const errors = (validate.errors || []).map(e => `${e.instancePath || "/"} ${e.message}`).join("; ");
    console.log("Ajv errors:", errors);
    // ask model to refine and fill missing required fields
    const refinePrompt = [
      { role: "system", content: systemPrompt },
      { role: "assistant", content: `Черновик (markdown):\n${draftText}` },
      { role: "user", content: `JSON ниже не проходит валидацию по схеме: ${errors}. Исправь и дополни JSON, чтобы он соответствовал схеме. Выдай ТОЛЬКО JSON между маркерами ---BEGIN_JSON--- и ---END_JSON---.` }
    ];
    const refined = await requestModel(refinePrompt, { temperature: refineTemperature, max_tokens: refineMaxTokens }, apiKey);
    console.log("refined raw:", refined.raw);
    const refinedRaw = extractBetweenMarkers(refined.text);
    if (!refinedRaw) {
      return NextResponse.json({ error: "Refine: модель не вернула JSON" }, { status: 500 });
    }
    const parsedRefined = safeParseJson(refinedRaw);
    if (!parsedRefined.ok) {
      return NextResponse.json({ error: "Refine: JSON всё ещё некорректен: " + parsedRefined.error }, { status: 500 });
    }
    parsed = parsedRefined.parsed;
    const ok2 = validate(parsed);
    if (!ok2) {
      const errStr = (validate.errors || []).map(e => `${e.instancePath || "/"} ${e.message}`).join("; ");
      return NextResponse.json({ error: "После refine JSON не валиден: " + errStr }, { status: 500 });
    }
  }

  // 3) final: produce human-readable Markdown (and include JSON again)
  const toMarkdownPrompt = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `На основе этого JSON сгенерируй человеко-читаемый КСП в Markdown (заголовки, таблицы). Сначала повтори JSON между маркерами ---BEGIN_JSON--- и ---END_JSON---, затем Markdown.\nJSON:\n${JSON.stringify(parsed, null, 2)}` }
  ];
  const final = await requestModel(toMarkdownPrompt, { temperature: refineTemperature, max_tokens: refineMaxTokens }, apiKey);
  console.log("final raw:", final.raw);

  // extract again final JSON if present, else use parsed
  const finalJsonRaw = extractBetweenMarkers(final.text);
  const markdown = final.text.replace(/[\s\S]*---END_JSON---\s*/m, "").trim();
  let resultJson;
  if (finalJsonRaw) {
    const parsedFinal = safeParseJson(finalJsonRaw);
    resultJson = parsedFinal.ok ? parsedFinal.parsed : parsed;
  } else {
    resultJson = parsed;
  }

  return NextResponse.json({ json: resultJson, markdown }, { status: 200 });
}
