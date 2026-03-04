export const runtime = "nodejs";

function safeText(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s === "" ? fallback : s;
}

function formatAudience(aud: unknown): string {
  if (Array.isArray(aud)) return aud.map(String).join(", ");
  if (typeof aud === "string") return aud;
  return safeText(aud);
}

function buildPassportText(draft: Record<string, unknown>): string {
  const header = (draft.header ?? {}) as Record<string, unknown>;
  const blocks = (draft.blocks ?? {}) as Record<string, unknown[]>;
  const lines: string[] = [];

  lines.push("Краткий паспорт");
  lines.push("");
  lines.push(`Категория: ${safeText(header.category)}`);
  lines.push(`Название: ${safeText(header.name)}`);
  lines.push(`Целевая аудитория: ${formatAudience(header.audience)}`);
  lines.push(`Потребительская боль: ${safeText(header.pain)}`);
  lines.push(
    `Уникальность: ${safeText(header.uniqueness ?? header.innovation ?? header.unique)}`
  );
  lines.push("");

  const blockOrder = [
    { key: "cognitive", title: "=== Когнитивный блок ===" },
    { key: "sensory", title: "=== Сенсорный блок ===" },
    { key: "branding", title: "=== Брендинговый блок ===" },
    { key: "marketing", title: "=== Маркетинговый блок ===" },
  ];

  for (const b of blockOrder) {
    const rows = Array.isArray(blocks[b.key]) ? blocks[b.key] : [];
    if (!rows.length) continue;
    lines.push(b.title);
    lines.push("");
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const no = r?.no ?? "";
      const question = safeText(r?.question ?? "");
      const answer = safeText(r?.answer ?? "");
      if (no !== "") lines.push(`${no}. ${question}`);
      else lines.push(question);
      lines.push(answer);
      lines.push("");
    }
  }

  if (draft?.tech) {
    lines.push("=== Технология и состав ===");
    lines.push("");
    if (Array.isArray(draft.tech)) {
      for (const item of draft.tech) {
        lines.push(safeText(item));
      }
    } else {
      lines.push(safeText(draft.tech));
    }
    lines.push("");
  }

  if (draft?.packaging) {
    lines.push("=== Форм-фактор и упаковка ===");
    lines.push("");
    lines.push(safeText(draft.packaging));
    lines.push("");
  }

  if (draft?.star) {
    lines.push("=== Почему это звезда? ===");
    lines.push("");
    if (Array.isArray(draft.star)) {
      for (const item of draft.star) lines.push(safeText(item));
    } else {
      lines.push(safeText(draft.star));
    }
    lines.push("");
  }

  lines.push("=== Заключение ===");
  lines.push("");
  lines.push(safeText(draft.conclusion ?? ""));

  return lines.join("\n");
}

export async function POST(req: Request) {
  const start = Date.now();
  const reqId = Math.random().toString(36).slice(2, 9);
  try {
    const body = await req.json();
    const draft = body?.draft ?? body;
    if (!draft || typeof draft !== "object") {
      return new Response(
        JSON.stringify({ error: "Требуется объект draft в теле запроса" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[passport-txt][${reqId}] start`, {
      keys: Object.keys(draft).length,
    });

    const finalText =
      draft.final_text && typeof draft.final_text === "string"
        ? draft.final_text
        : buildPassportText(draft as Record<string, unknown>);

    const buf = Buffer.from(finalText, "utf8");
    const size = buf.length;
    const preview = buf
      .slice(0, 200)
      .toString("utf8")
      .replace(/\n/g, "\\n");
    console.log(`[passport-txt][${reqId}] preview=${preview} size=${size}`);

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="passport.txt"',
        "Content-Length": String(size),
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error(`[passport-txt][${reqId}] error`, err);
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return new Response(
      JSON.stringify({ error: true, message, stack }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    console.log(`[passport-txt][${reqId}] elapsed=${Date.now() - start}ms`);
  }
}
