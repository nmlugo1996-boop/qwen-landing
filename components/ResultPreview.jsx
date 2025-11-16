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
        id="full-passport"
        className="floating-panel border border-white/20 bg-white/95 shadow-sm md:shadow-lg transition-opacity duration-500 rounded-xl md:rounded-3xl p-4 md:p-6"
        aria-live="polite"
        style={{ opacity: draft && !loading ? 1 : 0.6 }}
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-xl md:text-2xl font-semibold text-neutral-900">
            Паспорт уникального продукта
          </h2>
          <p className="text-xs md:text-sm text-neutral-600">
            Когнитивно-сенсорный маркетинговый паспорт по методике «Полярная звезда»
          </p>
        </div>

        <div id="fp-content" className="mt-4 md:mt-6 flex flex-col gap-4 md:gap-6">
          {/* Шапка продукта (бывший краткий паспорт) */}
          <div className="space-y-3 md:space-y-4">
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
              {Array.isArray(draft?.tech) ? draft.tech.join("\n") : (draft?.tech || "—")}
            </p>
          </div>
          <div className="rounded-xl md:rounded-3xl border border-neutral-200/70 bg-white/80 p-4 md:p-5 shadow-inner">
            <h3 className="text-base md:text-lg font-semibold text-neutral-800">Почему это звезда?</h3>
            <p className="mt-2 text-sm whitespace-pre-line text-neutral-700">
              {Array.isArray(draft?.star) ? draft.star.join("\n") : (draft?.star || "—")}
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

