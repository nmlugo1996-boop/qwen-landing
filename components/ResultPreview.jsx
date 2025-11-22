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
  const [imageUrl, setImageUrl] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState(null);
  const header = draft?.header ?? {};
  const blocks = draft?.blocks ?? {};

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

  const blockOrder = [
    { key: "cognitive", title: "Когнитивный блок" },
    { key: "sensory", title: "Сенсорный блок" },
    { key: "branding", title: "Брендинговый блок" },
    { key: "marketing", title: "Маркетинговый блок" }
  ];

  const showPlaceholder = loading || !draft;

  // Собираем читаемый текст паспорта для копирования
  const buildPassportText = useCallback(() => {
    if (!draft) return "";
    const lines = [];

    lines.push("Паспорт уникального продукта");
    lines.push("");
    lines.push(`Категория: ${getValue("category")}`);
    lines.push(`Название: ${getValue("name")}`);
    lines.push(`Целевая аудитория: ${getValue("audience")}`);
    lines.push(`Потребительская боль: ${getValue("pain")}`);
    lines.push(`Уникальность: ${getValue("innovation")}`);
    lines.push("");

    blockOrder.forEach((block) => {
      const rows = Array.isArray(blocks[block.key]) ? blocks[block.key] : [];
      if (!rows.length) return;
      lines.push(`=== ${block.title} ===`);
      rows.forEach((row) => {
        const no = row?.no ? String(row.no).trim() : "";
        const question = row?.question || "";
        const answer = row?.answer || "";
        lines.push("");
        if (no) {
          lines.push(`${no}. ${question}`);
        } else {
          lines.push(question);
        }
        lines.push(answer);
      });
      lines.push("");
    });

    // Технология и состав
    if (draft?.tech) {
      lines.push("=== Технология и состав ===");
      if (Array.isArray(draft.tech)) {
        lines.push(draft.tech.join("\n"));
      } else {
        lines.push(draft.tech);
      }
      lines.push("");
    }

    // Почему это звезда?
    if (draft?.star) {
      lines.push("=== Почему это звезда? ===");
      if (Array.isArray(draft.star)) {
        lines.push(draft.star.join("\n"));
      } else {
        lines.push(draft.star);
      }
      lines.push("");
    }

    // Заключение
    if (draft?.conclusion) {
      lines.push("=== Заключение ===");
      lines.push(draft.conclusion);
      lines.push("");
    }

    return lines.join("\n");
  }, [draft, blocks, blockOrder, getValue]);

  const handleCopy = useCallback(() => {
    const text = buildPassportText();
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
  }, [buildPassportText]);

  // Извлекаем данные для генерации изображения
  const getImageGenerationData = useCallback(() => {
    if (!draft) return null;

    // Визуальный образ из сенсорного блока
    const sensoryBlock = blocks?.sensory;
    let visualImage = null;
    if (Array.isArray(sensoryBlock) && sensoryBlock.length > 0) {
      const visualRow = sensoryBlock.find((row) => 
        row?.question?.toLowerCase().includes("визуальный") || 
        row?.no === "2.1"
      );
      if (visualRow?.answer) {
        visualImage = visualRow.answer;
      }
    }

    // Описание упаковки из дополнительных секций
    let packagingDescription = null;
    if (draft?.tech && Array.isArray(draft.tech)) {
      const packagingText = draft.tech.find((text) => 
        typeof text === "string" && text.toLowerCase().includes("упаковк")
      );
      if (packagingText) {
        packagingDescription = packagingText;
      }
    }

    // Ядро бренда из брендингового блока
    const brandingBlock = blocks?.branding;
    let brandingCore = null;
    if (Array.isArray(brandingBlock) && brandingBlock.length > 0) {
      const coreRow = brandingBlock.find((row) => 
        row?.question?.toLowerCase().includes("ядро") || 
        row?.no === "3.3"
      );
      if (coreRow?.answer) {
        brandingCore = coreRow.answer;
      }
    }

    return {
      category: getValue("category"),
      name: getValue("name"),
      audience: getValue("audience"),
      pain: getValue("pain"),
      innovation: getValue("innovation"),
      visualImage,
      packagingDescription,
      brandingCore
    };
  }, [draft, blocks, getValue]);

  const handleGenerateImage = useCallback(async () => {
    if (!draft) return;

    setIsGeneratingImage(true);
    setImageError(null);
    setImageUrl(null);
    setImageBase64(null);

    try {
      const imageData = getImageGenerationData();
      if (!imageData) {
        throw new Error("Недостаточно данных для генерации изображения");
      }

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(imageData)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || `API ${response.status}`);
      }

      const result = await response.json();

      console.log("Image generation result:", result);

      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
        setImageBase64(null);
      } else if (result.imageBase64) {
        setImageBase64(result.imageBase64);
        setImageUrl(null);
      } else {
        // Если есть rawContent, показываем его для отладки
        const errorMsg = result.rawContent 
          ? `Изображение не было сгенерировано. Ответ API: ${result.rawContent.substring(0, 200)}...`
          : "Изображение не было сгенерировано. Проверьте логи сервера.";
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Image generation error:", error);
      setImageError(
        error instanceof Error
          ? error.message
          : "Не удалось сгенерировать изображение"
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }, [draft, getImageGenerationData]);

  return (
    <aside className="flex flex-col gap-4 md:gap-6 lg:sticky lg:top-32">
      <div className="rounded-xl md:rounded-3xl border border-neutral-200/70 bg-white/80 p-6 shadow-inner flex flex-col items-center justify-center text-center gap-4 mb-6">
        <div className="w-full aspect-video bg-neutral-200/70 rounded-lg flex items-center justify-center text-neutral-500 text-sm md:text-base overflow-hidden relative">
          {imageUrl || imageBase64 ? (
            <img
              src={imageUrl || imageBase64}
              alt={`Упаковка продукта ${getValue("name")}`}
              className="w-full h-full object-contain rounded-lg"
            />
          ) : isGeneratingImage ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF5B5B]"></div>
              <span className="text-xs">Генерируем изображение...</span>
            </div>
          ) : imageError ? (
            <div className="flex flex-col items-center gap-2 text-red-500">
              <span className="text-xs">Ошибка: {imageError}</span>
            </div>
          ) : (
            <span>Здесь появится изображение упаковки продукта</span>
          )}
        </div>
        <button
          onClick={handleGenerateImage}
          disabled={isGeneratingImage || !draft}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
            isGeneratingImage || !draft
              ? "bg-neutral-300 text-neutral-600 cursor-not-allowed"
              : "bg-[#FF5B5B] text-white hover:bg-[#FF7171] shadow-md"
          }`}
        >
          {isGeneratingImage ? "Генерация..." : "Сгенерировать упаковку"}
        </button>
      </div>

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
          {/* Шапка продукта */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col gap-1 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 shadow-inner">
              <span className="text-xs uppercase tracking-wide text-neutral-500">Категория</span>
              <strong className="text-base md:text-lg text-neutral-900 transition-opacity duration-300">
                {getValue("category")}
              </strong>
            </div>
            <div className="flex flex-col gap-1 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 shadow-inner">
              <span className="text-xs uppercase tracking-wide text-neutral-500">Название</span>
              <strong className="text-base md:text-lg text-neutral-900 transition-opacity duration-300">
                {getValue("name")}
              </strong>
            </div>
            <div className="flex flex-col gap-1 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 shadow-inner">
              <span className="text-xs uppercase tracking-wide text-neutral-500">Целевая аудитория</span>
              <strong className="text-base md:text-lg text-neutral-900 transition-opacity duration-300">
                {getValue("audience")}
              </strong>
            </div>
            <div className="flex flex-col gap-1 rounded-xl md:rounded-2xl bg-white/70 p-3 md:p-4 shadow-inner">
              <span className="text-xs uppercase tracking-wide text-neutral-500">Потребительская боль</span>
              <strong className="text-base md:text-lg text-neutral-900 transition-opacity duration-300">
                {getValue("pain")}
              </strong>
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
              <div
                key={block.key}
                className="rounded-xl md:rounded-3xl border border-neutral-200/70 bg-white/80 p-4 md:p-5 shadow-inner"
              >
                <h3 className="text-base md:text-lg font-semibold text-neutral-800">
                  {block.title}
                </h3>
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
                        <tr
                          key={`${block.key}-${index}`}
                          className="odd:bg-white even:bg-neutral-50/70"
                        >
                          <td className="px-2 md:px-4 py-2 md:py-3 align-top font-semibold text-neutral-500">
                            {row?.no ?? index + 1}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 align-top font-medium text-neutral-700">
                            {row?.question || ""}
                          </td>
                          <td className="px-2 md:px-4 py-2 md:py-3 align-top text-neutral-600">
                            {row?.answer || ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

        {/* Дополнительные секции */}
        <div className="rounded-xl md:rounded-3xl border border-neutral-200/70 bg-white/80 p-4 md:p-5 shadow-inner">
          <h3 className="text-base md:text-lg font-semibold text-neutral-800">
            Технология и состав
          </h3>
          <p className="mt-2 text-sm whitespace-pre-line text-neutral-700">
            {Array.isArray(draft?.tech) ? draft.tech.join("\n") : draft?.tech || "—"}
          </p>
        </div>

          {/* Кнопка копирования паспорта */}
          <div className="flex justify-center mt-4 md:mt-5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!draft}
              className="px-6 py-3 rounded-full bg-[#ff5b5b] text-white text-sm md:text-base font-semibold shadow-md hover:bg-[#ff7171] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Скопировать паспорт
            </button>
          </div>
        </div>
      </section>
    </aside>
  );
}
