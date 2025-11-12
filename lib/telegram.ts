const TELEGRAM_API = "https://api.telegram.org";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function requestTelegram(method: string, body: FormData | URLSearchParams | Record<string, unknown>) {
  if (!BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  let payload: BodyInit | undefined;
  let headers: HeadersInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body instanceof URLSearchParams) {
    payload = body;
    headers = { "Content-Type": "application/x-www-form-urlencoded" };
  } else {
    headers = { "Content-Type": "application/json" };
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers,
    body: payload
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Telegram API error ${response.status}: ${text}`);
  }

  return response.json();
}

export async function sendPassportBrief(chatId: string | number, markdown: string) {
  const params = new URLSearchParams();
  params.append("chat_id", String(chatId));
  params.append("text", markdown);
  params.append("parse_mode", "Markdown");
  return requestTelegram("sendMessage", params);
}

export async function sendPassportDoc(chatId: string | number, buffer: Buffer, filename: string) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  form.append("document", new Blob([arrayBuffer as unknown as BlobPart]), filename);
  return requestTelegram("sendDocument", form);
}

