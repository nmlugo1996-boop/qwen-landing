"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GeneratorForm from "./GeneratorForm";
import OnboardingTour from "./OnboardingTour";
import ResultPreview from "./ResultPreview";

const LOADING_SCENES = [
  {
    stage: "⚙️ Генерирую продукт",
    title: "Собираю новый продуктовый объект",
    lines: [
      "Ищу форму, которая не сводится к обычному SKU внутри категории.",
      "Проверяю, чтобы продукт можно было показать на полке и объяснить одной фразой.",
      "Отсекаю банальные решения и оставляю только предметную новизну."
    ]
  },
  {
    stage: "🧠 Собираю маркетинговую логику",
    title: "Строю потребительскую механику",
    lines: [
      "Разворачиваю боль, мотивацию и повод попробовать именно этот продукт.",
      "Ищу новый ритуал потребления, а не просто удобное описание категории.",
      "Связываю продукт, выгоду, самоисторию и понятную монетизируемую ценность."
    ]
  },
  {
    stage: "📦 Формирую паспорт",
    title: "Упаковываю продукт в систему",
    lines: [
      "Заполняю когнитивный, сенсорный, брендинговый и маркетинговый блоки.",
      "Проверяю, чтобы все ответы держались на одном и том же продукте.",
      "Убираю пустые формулировки и универсальную воду."
    ]
  },
  {
    stage: "📄 Готовлю документ",
    title: "Финализирую результат",
    lines: [
      "Проверяю связность паспорта от продукта до go-to-market.",
      "Собираю итог так, чтобы документ читался как продуктовый, а не как реферат.",
      "Подготавливаю результат к просмотру и скачиванию."
    ]
  }
];

const STORY_TICKERS = [
  "Ищу точку, где категория реально ломается и может родиться новый продукт",
  "Подбираю форму, ритуал, упаковку и повод попробовать",
  "Проверяю, чтобы продукт можно было представить в руке и на полке",
  "Собираю логику, чтобы паспорт не превратился в общие слова",
  "Сшиваю продукт, бренд, сенсорику и рыночную механику"
];

function useAnimatedLoadingState(isLoading) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    if (!isLoading) {
      setSceneIndex(0);
      setLineIndex(0);
      setTickerIndex(0);
      setProgress(8);
      return;
    }

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 93) return prev;
        const step = prev < 30 ? 3 : prev < 60 ? 2 : 1;
        return Math.min(prev + step, 93);
      });
    }, 850);

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

function GenerationOverlay({ visible }) {
  const { scene, line, ticker, progress } = useAnimatedLoadingState(visible);
  const ringDots = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(250,247,245,0.88)] px-4 backdrop-blur-[6px]">
      <div className="w-full max-w-5xl overflow-hidden rounded-[36px] border border-[#ead6d0] bg-white/95 shadow-[0_30px_90px_rgba(60,25,18,0.18)]">
        <div className="grid gap-0 lg:grid-cols-[360px_1fr]">
          <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#fff8f6_0%,#fff1ed_100%)] px-6 py-10">
            <div className="absolute inset-0 opacity-60">
              {Array.from({ length: 18 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute h-2.5 w-2.5 rounded-full bg-[#ffb4a9]"
                  style={{
                    left: `${8 + ((i * 17) % 84)}%`,
                    top: `${10 + ((i * 29) % 76)}%`,
                    opacity: 0.18 + ((i % 5) * 0.08)
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-5 rounded-full bg-[#ffe8e2] px-4 py-2 text-sm font-semibold text-[#6d3b33]">
                {scene.stage}
              </div>

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
                      transform: `rotate(${dot * 30}deg) translateY(-88px)`
                    }}
                  />
                ))}

                <div className="loader-comet loader-comet-a" />
                <div className="loader-comet loader-comet-b" />
              </div>
            </div>
          </div>

          <div className="flex min-h-[360px] flex-col justify-center px-6 py-8 md:px-8 md:py-10">
            <div className="text-3xl font-semibold leading-tight text-[#181312] md:text-4xl">
              {scene.title}
            </div>

            <div className="mt-4 min-h-[72px] text-lg leading-8 text-[#5d5552]">
              {line}
            </div>

            <div className="mt-6 overflow-hidden rounded-full bg-[#f2dfdb]">
              <div
                className="loader-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-[#7d726f]">
              <span>Идёт генерация</span>
              <span>{progress}%</span>
            </div>

            <div className="mt-5 rounded-[22px] bg-[#fff6f3] p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-[#b19a93]">
                Сейчас происходит
              </div>
              <div className="mt-2 min-h-[56px] text-base font-medium leading-7 text-[#4f4744]">
                {ticker}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {LOADING_SCENES.map((item, index) => {
                const isActive = item.stage === scene.stage;

                return (
                  <div
                    key={item.stage}
                    className={`rounded-[20px] border px-4 py-3 transition ${
                      isActive
                        ? "border-[#ffb2a5] bg-[#fff1ed] shadow-[0_8px_24px_rgba(255,91,71,0.08)]"
                        : "border-[#efe7e4] bg-white"
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wide text-[#b7aaa5]">
                      Этап {index + 1}
                    </div>
                    <div className="mt-1 text-sm font-medium text-[#463d3a]">
                      {item.stage}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
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
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(4px);
        }

        .loader-orbit-ring {
          position: absolute;
          border-radius: 9999px;
          border: 1px solid rgba(255, 91, 71, 0.16);
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
          background: rgba(255, 91, 71, 0.32);
          transform-origin: center 88px;
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
          box-shadow: 0 0 22px rgba(255, 91, 71, 0.42);
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
            transform-origin: center 88px;
          }
          50% {
            opacity: 0.8;
            transform-origin: center 88px;
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

export default function HomeClient({
  initialDraft = null,
  projectId = null,
  autoDownloadDocx = false
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [loading, setLoading] = useState(false);
  const [celebration, setCelebration] = useState(Boolean(initialDraft));

  const scrollToPassport = useCallback(() => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("full-passport");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const scrollToTop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 10);
  }, []);

  const handleSubmitStart = useCallback(() => {
    scrollToTop();
    setDraft(null);
    setCelebration(false);
    setLoading(true);
  }, [scrollToTop]);

  const handleDraftGenerated = useCallback(
    (newDraft) => {
      setDraft(newDraft);
      setCelebration(true);
      setLoading(false);
      setTimeout(scrollToPassport, 50);
    },
    [scrollToPassport]
  );

  const handleLoadingChange = useCallback((state) => {
    setLoading(state);
  }, []);

  return (
    <>
      <GenerationOverlay visible={loading} />

      <div className="relative">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#FF5B5B]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-[#FFE6E6]/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FF5B5B]/5 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
          <GeneratorForm
            onDraftGenerated={handleDraftGenerated}
            onLoadingChange={handleLoadingChange}
            projectId={projectId}
            initialDraft={initialDraft}
            onSubmitStart={handleSubmitStart}
          />

          <ResultPreview
            draft={draft}
            loading={loading}
            celebration={celebration}
            autoDownloadDocx={autoDownloadDocx}
          />
        </div>
      </div>

      <OnboardingTour />
    </>
  );
}