"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function buildSafeFileName(draft) {
  const raw =
    (draft?.header?.name || "passport")
      .toString()
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "passport";

  return `${raw}.docx`;
}

async function downloadDraftDocx(draft, fileName = "passport.docx") {
  if (!draft || typeof draft !== "object") {
    throw new Error("Сначала нужно сгенерировать паспорт");
  }

  const response = await fetch("/api/passport-docx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ draft })
  });

  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (!response.ok) {
    let message = "Не удалось собрать DOCX";
    try {
      if (contentType.includes("application/json")) {
        const data = await response.json();
        message = data?.message || data?.error || message;
      } else {
        const text = await response.text();
        if (text?.trim()) message = text.slice(0, 250);
      }
    } catch (_) {
      // ignore
    }
    throw new Error(message);
  }

  if (contentType.includes("application/json")) {
    let message = "Сервер вернул JSON вместо DOCX";
    try {
      const data = await response.json();
      message = data?.message || data?.error || message;
    } catch (_) {
      // ignore
    }
    throw new Error(message);
  }

  if (
    !contentType.includes(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) &&
    !contentType.includes("application/octet-stream")
  ) {
    throw new Error(`Неожиданный тип ответа: ${contentType || "unknown"}`);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error("DOCX получился пустым");
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function renderBlock(title, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-3 text-lg font-semibold text-black">{title}</h3>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-2xl border border-black/5 bg-white/70 p-4"
          >
            <div className="mb-1 text-sm font-semibold text-black/60">
              {row?.no ? `${row.no}. ` : ""}
              {row?.question || "Без вопроса"}
            </div>
            <div className="whitespace-pre-wrap text-base text-black/80">
              {row?.answer || "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderListOrText(value) {
  if (Array.isArray(value)) return value.join("\n");
  return value || "—";
}

export default function ResultPreview({
  draft,
  loading,
  celebration,
  autoDownloadDocx = false
}) {
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxStatusText, setDocxStatusText] = useState("Собираю DOCX...");
  const autoDownloadedRef = useRef(false);

  const handleDownloadDocx = useCallback(async () => {
    if (!draft) {
      alert("Сначала нужно сгенерировать паспорт.");
      return;
    }

    try {
      setDocxLoading(true);
      setDocxStatusText("Собираю DOCX...");

      const safeName = buildSafeFileName(draft);

      const timer1 = window.setTimeout(() => {
        setDocxStatusText("Формирую таблицы и блоки...");
      }, 700);

      const timer2 = window.setTimeout(() => {
        setDocxStatusText("Упаковываю документ...");
      }, 1500);

      await downloadDraftDocx(draft, safeName);

      window.clearTimeout(timer1);
      window.clearTimeout(timer2);

      setDocxStatusText("DOCX готов");
    } catch (error) {
      console.error("DOCX download error", error);
      alert(error?.message || "Ошибка при скачивании DOCX");
    } finally {
      window.setTimeout(() => {
        setDocxLoading(false);
        setDocxStatusText("Собираю DOCX...");
      }, 500);
    }
  }, [draft]);

  useEffect(() => {
    if (!autoDownloadDocx) return;
    if (!draft) return;
    if (autoDownloadedRef.current) return;

    autoDownloadedRef.current = true;
    handleDownloadDocx();
  }, [autoDownloadDocx, draft, handleDownloadDocx]);

  const header = draft?.header || {};
  const blocks = draft?.blocks || {};
  const productCore = draft?.product_core || {};

  return (
    <div id="full-passport" className="space-y-4">
      {celebration ? (
        <div className="rounded-full bg-[#4b2b25]/80 px-6 py-4 text-center font-semibold text-white shadow">
          Поздравляем! Вы создали новый продукт!
        </div>
      ) : null}

      <section className="rounded-[32px] bg-[#f3ebea]/95 p-6 shadow-xl md:p-8">
        <div className="mb-6">
          <div>
            <h2 className="text-3xl font-semibold leading-tight text-black md:text-4xl">
              Паспорт уникального продукта
            </h2>
            <p className="mt-3 text-lg text-black/55 md:text-xl">
              Когнитивно-сенсорный маркетинговый паспорт по методике «Полярная звезда»
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={!draft || loading || docxLoading}
              className="flex min-h-[64px] w-full max-w-[420px] items-center justify-center rounded-full bg-[#ff5b47] px-8 py-4 text-xl font-semibold text-white shadow-[0_10px_30px_rgba(255,91,71,0.28)] transition hover:bg-[#ff6a57] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-[72px] md:max-w-[460px] md:text-2xl"
            >
              {docxLoading ? docxStatusText : "Скачать DOCX"}
            </button>
          </div>
        </div>

        {!loading && !draft ? (
          <div className="rounded-2xl bg-white/70 p-6 text-black/60 md:p-8">
            Здесь появится готовый паспорт после генерации.
          </div>
        ) : null}

        {!loading && draft ? (
          <div className="passport-appear">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Категория
                </div>
                <div className="mt-2 text-2xl font-semibold text-black">
                  {header.category || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Название
                </div>
                <div className="mt-2 text-2xl font-semibold text-black">
                  {header.name || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Целевая аудитория
                </div>
                <div className="mt-2 whitespace-pre-wrap text-lg text-black/80">
                  {renderListOrText(header.audience)}
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Потребительская боль
                </div>
                <div className="mt-2 whitespace-pre-wrap text-lg text-black/80">
                  {header.pain || "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Уникальность
                </div>
                <div className="mt-2 whitespace-pre-wrap text-lg text-black/80">
                  {header.uniqueness || header.innovation || header.unique || "—"}
                </div>
              </div>
            </div>

            {(productCore.one_liner ||
              productCore.physical_form ||
              productCore.appearance) ? (
              <div className="mt-6 rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Новый продукт
                </div>

                <div className="mt-4 grid gap-4">
                  <div>
                    <div className="text-sm font-semibold text-black/55">
                      One-liner
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-lg text-black/85">
                      {productCore.one_liner || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-black/55">
                      Физическая форма
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-lg text-black/85">
                      {productCore.physical_form || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-black/55">
                      Как выглядит
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-lg text-black/85">
                      {productCore.appearance || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-black/55">
                      Состав / устройство
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-lg text-black/85">
                      {productCore.composition || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-black/55">
                      Как используют
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-lg text-black/85">
                      {productCore.usage || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-black/55">
                      В чём новизна
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-lg text-black/85">
                      {productCore.novelty_mechanism || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-black/55">
                      Почему хочется попробовать
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-lg text-black/85">
                      {productCore.why_people_will_try_it || "—"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {renderBlock("Когнитивный блок", blocks.cognitive)}
            {renderBlock("Сенсорный блок", blocks.sensory)}
            {renderBlock("Брендинговый блок", blocks.branding)}
            {renderBlock("Маркетинговый блок", blocks.marketing)}

            {draft?.tech ? (
              <div className="mt-6 rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Технология и состав
                </div>
                <div className="mt-2 whitespace-pre-wrap text-lg text-black/80">
                  {renderListOrText(draft.tech)}
                </div>
              </div>
            ) : null}

            {draft?.packaging ? (
              <div className="mt-6 rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Форм-факторы и упаковка
                </div>
                <div className="mt-2 whitespace-pre-wrap text-lg text-black/80">
                  {renderListOrText(draft.packaging)}
                </div>
              </div>
            ) : null}

            {draft?.star ? (
              <div className="mt-6 rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Почему это звезда
                </div>
                <div className="mt-2 whitespace-pre-wrap text-lg text-black/80">
                  {renderListOrText(draft.star)}
                </div>
              </div>
            ) : null}

            {draft?.conclusion ? (
              <div className="mt-6 rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Заключение
                </div>
                <div className="mt-2 whitespace-pre-wrap text-lg text-black/80">
                  {draft.conclusion}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}