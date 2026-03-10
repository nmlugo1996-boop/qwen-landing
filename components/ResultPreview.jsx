"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const LOADING_SCENES = [
  {
    stage: "⚙️ Генерирую продукт",
    title: "Собираю новый продуктовый объект",
    lines: [
      "Смотрю на категорию и ищу, где в ней реально можно изобрести новый предмет.",
      "Отсекаю банальные варианты и обычные SKU-переупаковки.",
      "Проверяю, чтобы продукт можно было показать на полке и объяснить одной фразой."
    ]
  },
  {
    stage: "🧠 Собираю маркетинговую логику",
    title: "Строю потребительскую механику",
    lines: [
      "Разворачиваю боль, мотивацию и повод попробовать именно этот продукт.",
      "Ищу новый ритуал потребления, а не просто удобное описание категории.",
      "Склеиваю продукт, выгоду, самоисторию и понятную монетизируемую ценность."
    ]
  },
  {
    stage: "📦 Формирую паспорт",
    title: "Упаковываю продукт в систему",
    lines: [
      "Заполняю когнитивный, сенсорный, брендинговый и маркетинговый блоки.",
      "Проверяю, чтобы все ответы держались на одном и том же продукте.",
      "Убираю пустые формулировки и слабые универсальные фразы."
    ]
  },
  {
    stage: "📄 Готовлю документ",
    title: "Финализирую результат",
    lines: [
      "Проверяю целостность структуры и связность блока за блоком.",
      "Собираю итог так, чтобы паспорт читался как продуктовый документ, а не как реферат.",
      "Готовлю выдачу для просмотра и скачивания."
    ]
  }
];

const STORY_TICKERS = [
  "Смотрю, где категория ломается и где можно создать новую вещь",
  "Отделяю новый продукт от просто удобного описания",
  "Подбираю форму, ритуал, упаковку и повод попробовать",
  "Собираю продукт, который можно представить в руке и на полке",
  "Строю вокруг него сильную рыночную логику",
  "Проверяю, чтобы паспорт не превратился в общие слова"
];

function useAnimatedLoadingState(isLoading) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [progress, setProgress] = useState(7);

  useEffect(() => {
    if (!isLoading) {
      setSceneIndex(0);
      setLineIndex(0);
      setTickerIndex(0);
      setProgress(7);
      return;
    }

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const step = prev < 35 ? 3 : prev < 65 ? 2 : 1;
        return Math.min(prev + step, 92);
      });
    }, 900);

    const sceneTimer = setInterval(() => {
      setSceneIndex((prev) => (prev + 1) % LOADING_SCENES.length);
      setLineIndex(0);
    }, 5200);

    const lineTimer = setInterval(() => {
      setLineIndex((prev) => {
        const currentScene = LOADING_SCENES[sceneIndex];
        return (prev + 1) % currentScene.lines.length;
      });
    }, 1700);

    const tickerTimer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % STORY_TICKERS.length);
    }, 2200);

    return () => {
      clearInterval(progressTimer);
      clearInterval(sceneTimer);
      clearInterval(lineTimer);
      clearInterval(tickerTimer);
    };
  }, [isLoading, sceneIndex]);

  const scene = LOADING_SCENES[sceneIndex];
  const ticker = STORY_TICKERS[tickerIndex];

  return {
    scene,
    line: scene.lines[lineIndex],
    ticker,
    progress
  };
}

function CinematicLoadingCard() {
  const { scene, line, ticker, progress } = useAnimatedLoadingState(true);

  const ringDots = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  return (
    <div className="rounded-[32px] border border-black/5 bg-white/80 p-6 shadow-inner md:p-8">
      <div className="grid gap-6 md:grid-cols-[260px_1fr] md:items-center">
        <div className="flex flex-col items-center justify-center">
          <div className="loader-stage-chip">{scene.stage}</div>

          <div className="loader-orbit-wrap">
            <div className="loader-orbit-core">
              <div className="loader-orbit-core-inner" />
            </div>

            <div className="loader-orbit-ring loader-orbit-ring-a" />
            <div className="loader-orbit-ring loader-orbit-ring-b" />

            {ringDots.map((dot) => (
              <span
                key={dot}
                className="loader-orbit-dot"
                style={{
                  transform: `rotate(${dot * 30}deg) translateY(-86px)`
                }}
              />
            ))}

            <div className="loader-comet loader-comet-a" />
            <div className="loader-comet loader-comet-b" />
          </div>
        </div>

        <div>
          <div className="text-2xl font-semibold leading-tight text-black md:text-3xl">
            {scene.title}
          </div>

          <div className="mt-3 min-h-[52px] text-base text-black/65 md:text-lg">
            {line}
          </div>

          <div className="mt-5 overflow-hidden rounded-full bg-[#f2dfdb]">
            <div
              className="loader-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-black/45">
            <span>Идёт генерация</span>
            <span>{progress}%</span>
          </div>

          <div className="mt-5 rounded-2xl bg-[#fff5f3] p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-black/35">
              Сейчас происходит
            </div>
            <div className="mt-2 min-h-[28px] text-sm font-medium text-black/75 md:text-base">
              {ticker}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {LOADING_SCENES.map((item, index) => {
              const isActive = item.stage === scene.stage;
              return (
                <div
                  key={item.stage}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    isActive
                      ? "border-[#ff8d80]/50 bg-[#fff1ed] shadow-sm"
                      : "border-black/5 bg-white/60"
                  }`}
                >
                  <div className="text-xs uppercase tracking-wide text-black/35">
                    Этап {index + 1}
                  </div>
                  <div className="mt-1 text-sm font-medium text-black/80">
                    {item.stage}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .loader-stage-chip {
          margin-bottom: 18px;
          border-radius: 9999px;
          background: rgba(255, 91, 71, 0.1);
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 700;
          color: #4b2b25;
        }

        .loader-orbit-wrap {
          position: relative;
          height: 220px;
          width: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loader-orbit-core {
          position: relative;
          z-index: 4;
          height: 82px;
          width: 82px;
          border-radius: 9999px;
          background: radial-gradient(circle at 30% 30%, #ffd3cc, #ff6f5d 62%, #ff5b47 100%);
          box-shadow:
            0 0 0 12px rgba(255, 91, 71, 0.08),
            0 0 60px rgba(255, 91, 71, 0.28);
          animation: pulseCore 2.6s ease-in-out infinite;
        }

        .loader-orbit-core-inner {
          position: absolute;
          inset: 18px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(4px);
        }

        .loader-orbit-ring {
          position: absolute;
          border-radius: 9999px;
          border: 1px solid rgba(255, 91, 71, 0.18);
        }

        .loader-orbit-ring-a {
          height: 150px;
          width: 150px;
          animation: rotateSlow 10s linear infinite;
        }

        .loader-orbit-ring-b {
          height: 190px;
          width: 190px;
          animation: rotateSlowReverse 14s linear infinite;
        }

        .loader-orbit-dot {
          position: absolute;
          left: calc(50% - 5px);
          top: calc(50% - 5px);
          height: 10px;
          width: 10px;
          border-radius: 9999px;
          background: rgba(255, 91, 71, 0.35);
          transform-origin: center 86px;
          animation: dotPulse 2.1s ease-in-out infinite;
        }

        .loader-comet {
          position: absolute;
          left: 50%;
          top: 50%;
          height: 16px;
          width: 16px;
          margin-left: -8px;
          margin-top: -8px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #ffffff, #ff8d80);
          box-shadow: 0 0 22px rgba(255, 91, 71, 0.45);
        }

        .loader-comet-a {
          animation: orbitA 3.4s linear infinite;
        }

        .loader-comet-b {
          height: 11px;
          width: 11px;
          margin-left: -5.5px;
          margin-top: -5.5px;
          background: linear-gradient(135deg, #ffe5df, #ff5b47);
          animation: orbitB 5.2s linear infinite;
        }

        .loader-progress-bar {
          height: 12px;
          border-radius: 9999px;
          background: linear-gradient(90deg, #ff5b47 0%, #ff8d80 50%, #ff5b47 100%);
          background-size: 200% 100%;
          animation: shimmerBar 2s linear infinite;
          transition: width 0.8s ease;
        }

        @keyframes pulseCore {
          0%,
          100% {
            transform: scale(1);
            box-shadow:
              0 0 0 12px rgba(255, 91, 71, 0.08),
              0 0 60px rgba(255, 91, 71, 0.28);
          }
          50% {
            transform: scale(1.08);
            box-shadow:
              0 0 0 18px rgba(255, 91, 71, 0.12),
              0 0 82px rgba(255, 91, 71, 0.34);
          }
        }

        @keyframes rotateSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes rotateSlowReverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes orbitA {
          from {
            transform: rotate(0deg) translateY(-75px) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateY(-75px) rotate(-360deg);
          }
        }

        @keyframes orbitB {
          from {
            transform: rotate(0deg) translateY(-95px) rotate(0deg);
          }
          to {
            transform: rotate(-360deg) translateY(-95px) rotate(360deg);
          }
        }

        @keyframes dotPulse {
          0%,
          100% {
            opacity: 0.35;
            transform-origin: center 86px;
          }
          50% {
            opacity: 0.8;
            transform-origin: center 86px;
          }
        }

        @keyframes shimmerBar {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
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

        {loading ? <CinematicLoadingCard /> : null}

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