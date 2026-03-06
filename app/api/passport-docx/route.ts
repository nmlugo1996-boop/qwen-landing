// app/api/passport-docx/route.ts
import { buildDocxResponse, buildDocxErrorResponse } from "../../../lib/passportDocx";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const draft = body?.draft ?? body;

    if (!draft || typeof draft !== "object") {
      return buildDocxErrorResponse(
        "В теле запроса не найден объект draft",
        { elapsedMs: Date.now() - startedAt }
      );
    }

    return await buildDocxResponse(draft, {
      startedAt
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Не удалось обработать запрос на сборку DOCX";

    return buildDocxErrorResponse(message, {
      elapsedMs: Date.now() - startedAt
    });
  }
}