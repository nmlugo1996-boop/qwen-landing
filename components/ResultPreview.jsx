"use client";

import { useCallback } from "react";

function formatAudience(audience) {
  if (Array.isArray(audience)) return audience.join(", ");
  if (typeof audience === "string") return audience;
  return "—";
}

export default function ResultPreview({ draft, loading, onDownload, onSendToTelegram }) {
  const header = draft?.header ?? {};

  const getValue = useCallback(
    (key, fallback = "—") => {
      switch (key) {
        case "audience":
          return formatAudience(header.audience ?? draft?.audience);
        case "innovation":
          return header.innovation ?? header.unique ?? draft?.uniqueness ?? fallback;
        default:
          return header[key] ?? draft?.[key] ?? fallback;
      }
    },
    [draft, header]
  );

  const blocks = draft?.blocks ?? {};
  const blockOrder = [
    { key: "cognitive", title: "Когнитивный блок" },
    { key: "sensory", title: "Сенсорный блок" },
    { key: "branding", title: "Брендинговый блок" },
    { key: "marketing", title: "Маркетинговый блок" }
  ];

  const showPlaceholder = loading || !draft;

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-32">
      <section
        id="brief-passport"
        className={`floating-panel overflow-hidden border border-white/20 bg-white/95 shadow-lg transition-all duration-500 ${
          showPlaceholder ? "ring-1 ring-[#ffcc00]/30" : ""
        }`}
        aria-live="polite"
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.24em] text-[#ff4d4f]">Статус</span>
            <h2 className="mt-3 text-2xl font-semibold text-neutral-900">Краткий паспорт</h2>
          </div>
          {showPlaceholder && (
            <div className="pulse-lamp" aria-hidden="true">
              💡
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Категория</span>
            <strong className="text-lg text-neutral-900 transition-opacity duration-300">
              {getValue("category")}
            </strong>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Название</span>
            <strong className="text-lg text-neutral-900 transition-opacity duration-300">{getValue("name")}</strong>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Целевая аудитория</span>
            <strong className="text-lg text-neutral-900 transition-opacity duration-300">
              {getValue("audience")}
            </strong>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Потребительская боль</span>
            <strong className="text-lg text-neutral-900 transition-opacity duration-300">{getValue("pain")}</strong>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Уникальность</span>
            <strong className="text-lg text-neutral-900 transition-opacity duration-300">
              {getValue("innovation")}
            </strong>
          </div>
        </div>

        <p className="mt-6 flex items-center gap-3 rounded-2xl bg-white/70 p-4 text-sm text-neutral-600 shadow-inner">
          {showPlaceholder ? (
            <>
              <span className="font-semibold text-[#ff4d4f]">Ждём данные…</span>
              <span>Здесь появится краткая версия КСМ-паспорта продукта</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-[#23a26d]">Готово!</span>
              <span>Можно перейти к подробностям и сохранить результат</span>
            </>
          )}
        </p>
      </section>

      <section
        id="full-passport"
        className="floating-panel border border-white/20 bg-white/95 shadow-lg transition-opacity duration-500"
        aria-live="polite"
        style={{ opacity: draft && !loading ? 1 : 0.6 }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-neutral-900">Полный паспорт</h2>
          <button
            id="download-docx"
            className="btn-primary whitespace-nowrap px-5 py-2 text-sm font-semibold"
            type="button"
            onClick={onDownload}
            disabled={!draft || loading}
          >
            Скачать DOCX
          </button>
        </div>

        <div id="fp-content" className="mt-6 flex flex-col gap-6">
          {blockOrder.map((block) => {
            const rows = Array.isArray(blocks[block.key]) ? blocks[block.key] : [];
            if (!rows.length) return null;
            return (
              <div key={block.key} className="rounded-3xl border border-neutral-200/70 bg-white/80 p-5 shadow-inner">
                <h3 className="text-lg font-semibold text-neutral-800">{block.title}</h3>
                <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200/80">
                  <table className="w-full border-collapse text-sm text-neutral-700">
                    <thead className="bg-neutral-100/80 text-left uppercase tracking-wide text-neutral-500">
                      <tr>
                        <th className="px-4 py-3">№</th>
                        <th className="px-4 py-3">Вопрос</th>
                        <th className="px-4 py-3">Ответ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={`${block.key}-${index}`} className="odd:bg-white even:bg-neutral-50/70">
                          <td className="px-4 py-3 align-top font-semibold text-neutral-500">{row?.no ?? index + 1}</td>
                          <td className="px-4 py-3 align-top font-medium text-neutral-700">{row?.question || ""}</td>
                          <td className="px-4 py-3 align-top text-neutral-600">{row?.answer || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="flex flex-col gap-3 rounded-3xl border border-neutral-200/80 bg-white/80 p-6 text-sm text-neutral-600 shadow-inner">
            <p className="text-base font-semibold text-neutral-700">Нужно отправить команде?</p>
            <button
              type="button"
              className="btn-secondary justify-center px-5 py-3 text-sm font-semibold"
              onClick={onSendToTelegram}
              disabled={!draft || loading}
            >
              Отправить в Telegram
            </button>
          </div>
        </div>
      </section>
    </aside>
  );
}

