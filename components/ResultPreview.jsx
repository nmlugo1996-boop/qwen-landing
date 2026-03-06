"use client";

import { useEffect, useRef, useState } from "react";

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

  if (!response.ok) {
    let message = "Не удалось собрать DOCX";
    try {
      const data = await response.json();
      message = data?.message || data?.error || message;
    } catch (_) {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
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

export default function ResultPreview({
  draft,
  loading,
  celebration,
  autoDownloadDocx = false
}) {
  const [docxLoading, setDocxLoading] = useState(false);
  const autoDownloadedRef = useRef(false);

  const handleDownloadDocx = async () => {
    if (!draft) {
      alert("Сначала нужно сгенерировать паспорт.");
      return;
    }

    try {
      setDocxLoading(true);

      const safeName =
        (draft?.header?.name || "passport")
          .toString()
          .trim()
          .replace(/[\\/:*?"<>|]+/g, "_")
          .slice(0, 80) || "passport";

      await downloadDraftDocx(draft, `${safeName}.docx`);
    } catch (error) {
      console.error("DOCX download error", error);
      alert(error?.message || "Ошибка при скачивании DOCX");
    } finally {
      setDocxLoading(false);
    }
  };

  useEffect(() => {
    if (!autoDownloadDocx) return;
    if (!draft) return;
    if (autoDownloadedRef.current) return;

    autoDownloadedRef.current = true;
    handleDownloadDocx();
  }, [autoDownloadDocx, draft]);

  const header = draft?.header || {};
  const blocks = draft?.blocks || {};

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
              {docxLoading ? "Собираю DOCX..." : "Скачать DOCX"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white/70 p-6 text-black/60">
            Генерирую паспорт...
          </div>
        ) : null}

        {!loading && !draft ? (
          <div className="rounded-2xl bg-white/70 p-6 text-black/60 md:p-8">
            Здесь появится готовый паспорт после генерации.
          </div>
        ) : null}

        {!loading && draft ? (
          <>
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
                  {Array.isArray(header.audience)
                    ? header.audience.join(", ")
                    : header.audience || "—"}
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
                  {Array.isArray(draft.tech) ? draft.tech.join("\n") : draft.tech}
                </div>
              </div>
            ) : null}

            {draft?.packaging ? (
              <div className="mt-6 rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Форм-факторы и упаковка
                </div>
                <div className="mt-2 whitespace-pre-wrap text-lg text-black/80">
                  {Array.isArray(draft.packaging)
                    ? draft.packaging.join("\n")
                    : draft.packaging}
                </div>
              </div>
            ) : null}

            {draft?.star ? (
              <div className="mt-6 rounded-2xl bg-white/80 p-5">
                <div className="text-sm uppercase tracking-wide text-black/40">
                  Почему это звезда
                </div>
                <div className="mt-2 whitespace-pre-wrap text-lg text-black/80">
                  {Array.isArray(draft.star) ? draft.star.join("\n") : draft.star}
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
          </>
        ) : null}
      </section>
    </div>
  );
}