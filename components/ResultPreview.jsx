"use client";

import { useCallback, useEffect, useState } from "react";

function formatAudience(audience) {
  if (Array.isArray(audience)) return audience.join(", ");
  if (typeof audience === "string") return audience;
  return "—";
}

export default function ResultPreview({ draft, loading, celebration = false }) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [prevDraft, setPrevDraft] = useState(null);
  const header = draft?.header ?? {};

  useEffect(() => {
    if (draft && !loading && draft !== prevDraft) {
      setShouldAnimate(true);
      setPrevDraft(draft);
    }
  }, [draft, loading, prevDraft]);

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
    <aside className="flex flex-col gap-4 md:gap-6 lg:sticky lg:top-32">
      {celebration ? (
        <div className="passport-ready-label rounded-xl md:rounded-3xl p-3 md:p-4 text-center text-xs md:text-sm shadow-sm md:shadow-lg">
          Поздравляем! Вы создали новый продукт!
        </div>
      ) : null}

      <section
        id="brief-passport"
        className={`floating-panel overflow-hidden border border-white/20 bg-white/95 rounded-xl md:rounded-3xl p-4 md:p-6 ${
          showPlaceholder
            ? "ring-1 ring-[#ffcc00]/30"
            : shouldAnimate
              ? "passport-appear shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
              : ""
        }`}
        aria-live="polite"
        style={shouldAnimate && !showPlaceholder ? { opacity: 0 } : {}}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.24em] text-[#ff4d4f]">Статус</span>
            <h2 className="mt-2 md:mt-3 text-xl md:text-2xl font-semibold text-neutral-900">Краткий паспорт продукта</h2>
          </div>
          {showPlaceholder && (
            <div className="pulse-lamp" aria-hidden="true">
              💡
            </div>
          )}
        </div>

        <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
          <div className="flex flex-col gap-1 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Категория</span>
            <strong className="text-base md:text-lg text-neutral-900 transition-opacity duration-300">
              {getValue("category")}
            </strong>
          </div>
          <div className="flex flex-col gap-1 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Название</span>
            <strong className="text-base md:text-lg text-neutral-900 transition-opacity duration-300">{getValue("name")}</strong>
          </div>
          <div className="flex flex-col gap-1 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Целевая аудитория</span>
            <strong className="text-base md:text-lg text-neutral-900 transition-opacity duration-300">
              {getValue("audience")}
            </strong>
          </div>
          <div className="flex flex-col gap-1 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Потребительская боль</span>
            <strong className="text-base md:text-lg text-neutral-900 transition-opacity duration-300">{getValue("pain")}</strong>
          </div>
          <div className="flex flex-col gap-1 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 shadow-inner">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Уникальность</span>
            <strong className="text-base md:text-lg text-neutral-900 transition-opacity duration-300">
              {getValue("innovation")}
            </strong>
          </div>
        </div>

        <p className="mt-4 md:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 text-xs md:text-sm text-neutral-600 shadow-inner">
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
        className="floating-panel border border-white/20 bg-white/95 shadow-sm md:shadow-lg transition-opacity duration-500 rounded-xl md:rounded-3xl p-4 md:p-6"
        aria-live="polite"
        style={{ opacity: draft && !loading ? 1 : 0.6 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl md:text-2xl font-semibold text-neutral-900">Полный паспорт</h2>
        </div>

        <div id="fp-content" className="mt-4 md:mt-6 flex flex-col gap-4 md:gap-6">
          <div className="rounded-xl md:rounded-3xl border border-neutral-200/70 bg-white/80 p-4 md:p-5 shadow-inner">
            <h3 className="text-base md:text-lg font-semibold text-neutral-800">
              Когнитивно-сенсорный маркетинговый паспорт
            </h3>
            <p className="mt-1 text-xs md:text-sm text-neutral-600">
              Полный паспорт продукта по методике «Полярная звезда»
            </p>
          </div>

          {blockOrder.map((block) => {
            const rows = Array.isArray(blocks[block.key]) ? blocks[block.key] : [];
            if (!rows.length) return null;
            return (
              <div key={block.key} className="rounded-xl md:rounded-3xl border border-neutral-200/70 bg-white/80 p-4 md:p-5 shadow-inner">
                <h3 className="text-base md:text-lg font-semibold text-neutral-800">{block.title}</h3>
                <div className="mt-3 md:mt-4 overflow-x-auto rounded-xl md:rounded-2xl border border-neutral-200/80">
                  <table className="w-full border-collapse text-xs md:text-sm text-neutral-700 min-w-[600px] md:min-w-0">
                    <thead className="bg-neutral-100/80 text-left uppercase tracking-wide text-neutral-500">
                      <tr>
                        <th className="px-2 md:px-4 py-2 md:py-3">№</th>
                        <th className="px-2 md:px-4 py-2 md:py-3">Вопрос</th>
                        <th className="px-2 md:px-4 py-2 md:py-3">Ответ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={`${block.key}-${index}`} className="odd:bg-white even:bg-neutral-50/70">
                          <td className="px-2 md:px-4 py-2 md:py-3 align-top font-semibold text-neutral-500">{row?.no ?? index + 1}</td>
                          <td className="px-2 md:px-4 py-2 md:py-3 align-top font-medium text-neutral-700">{row?.question || ""}</td>
                          <td className="px-2 md:px-4 py-2 md:py-3 align-top text-neutral-600">{row?.answer || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Дополнительные секции (текстовые) — заглушки, если пусто */}
          <div className="rounded-xl md:rounded-3xl border border-neutral-200/70 bg-white/80 p-4 md:p-5 shadow-inner">
            <h3 className="text-base md:text-lg font-semibold text-neutral-800">Технология и состав</h3>
            <p className="mt-2 text-sm whitespace-pre-line text-neutral-700">
              {draft?.technology || "—"}
            </p>
          </div>
          <div className="rounded-xl md:rounded-3xl border border-neutral-200/70 bg-white/80 p-4 md:p-5 shadow-inner">
            <h3 className="text-base md:text-lg font-semibold text-neutral-800">Почему это звезда?</h3>
            <p className="mt-2 text-sm whitespace-pre-line text-neutral-700">
              {draft?.starReason || "—"}
            </p>
          </div>
          <div className="rounded-xl md:rounded-3xl border border-neutral-200/70 bg-white/80 p-4 md:p-5 shadow-inner">
            <h3 className="text-base md:text-lg font-semibold text-neutral-800">Заключение</h3>
            <p className="mt-2 text-sm whitespace-pre-line text-neutral-700">
              {draft?.conclusion || "—"}
            </p>
          </div>
        </div>
      </section>
    </aside>
  );
}

