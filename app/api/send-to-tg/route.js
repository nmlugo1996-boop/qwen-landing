import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createServerClient } from "../../../lib/supabaseClient";
import { getUserById } from "../../../lib/db";
import { draftToDocxBuffer } from "../../../lib/passportDocx";
import { sendPassportBrief, sendPassportDoc } from "../../../lib/telegram";

const INPUT_SCHEMA = z.object({
  projectId: z.string().uuid().optional(),
  draft: z.record(z.any()).optional(),
  chatId: z.union([z.string(), z.number()]).optional()
});

function composeBriefMarkdown(draft) {
  const header = draft?.header ?? {};
  const lines = [
    `*${header.name || "Новый продукт"}*`,
    `Категория: ${header.category || "—"}`,
    `ЦА: ${Array.isArray(header.audience) ? header.audience.join(", ") : header.audience || "—"}`,
    `Боль: ${header.pain || "—"}`,
    `Уникальность: ${header.innovation || header.unique || "—"}`
  ];
  return lines.join("\n");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { draft, chatId } = INPUT_SCHEMA.parse(body);

    if (!draft) {
      throw new Error("draft обязателен в запросе");
    }

    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;

    let targetChatId = chatId;
    if (userId) {
      const profile = await getUserById(userId);
      if (profile?.tg_id) {
        targetChatId = profile.tg_id;
      }
    }

    if (!targetChatId) {
      throw new Error("chatId обязателен (отправка недоступна без привязанного Telegram)");
    }

    const brief = composeBriefMarkdown(draft);
    await sendPassportBrief(targetChatId, brief);

    const buffer = await draftToDocxBuffer(draft);
    const filename =
      (draft?.header?.name || draft?.header?.category || "passport").replace(/[\\/:*?"<>|]+/g, "_") + ".docx";
    await sendPassportDoc(targetChatId, buffer, filename);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("send-to-tg error", error);
    return NextResponse.json({ error: error.message || "Telegram delivery failed" }, { status: 400 });
  }
}

