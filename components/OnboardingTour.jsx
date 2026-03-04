"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HOW_TO_STEPS } from "./instructions";

const STORAGE_KEY = "polar-star-onboarding-v2";

const STEP_SELECTORS = [
  "#category",
  "#audience-age",
  "#audience-gender",
  "#pain",
  "#comment",
  "#btn-generate"
];

function applyHighlight(selector) {
  document.querySelectorAll(".coachmark-highlight").forEach((el) => el.classList.remove("coachmark-highlight"));
  const element = document.querySelector(selector);
  if (!element) return;
  element.classList.add("coachmark-highlight");
  element.scrollIntoView({ block: "center", behavior: "smooth" });
}

export default function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () =>
      HOW_TO_STEPS.map((description, index) => ({
        description,
        selector: STEP_SELECTORS[index] || null,
        order: index + 1
      })),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (seen) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
      applyHighlight(steps[0]?.selector);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [steps]);

  useEffect(() => {
    if (!open) {
      document.querySelectorAll(".coachmark-highlight").forEach((el) => el.classList.remove("coachmark-highlight"));
      return;
    }
    const selector = steps[step]?.selector;
    if (selector) {
      applyHighlight(selector);
    }
  }, [open, step, steps]);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    // Плавно проскроллить к краткому паспорту после закрытия
    setTimeout(() => {
      const briefPassport = document.querySelector("#brief-passport");
      if (briefPassport) {
        briefPassport.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  }, []);

  const handleNext = useCallback(() => {
    setStep((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        handleClose();
        return prev;
      }
      return next;
    });
  }, [handleClose, steps.length]);

  const handlePrev = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 0));
  }, []);

  if (!open) return null;

  return createPortal(
    <div className="onboarding-overlay pointer-events-none fixed inset-0 z-40 flex flex-col justify-end">
      <div className="pointer-events-auto mx-auto mb-10 w-full max-w-2xl rounded-3xl bg-white/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#ff4d4f]">Онбординг</p>
          <button
            type="button"
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
            onClick={handleClose}
          >
            Пропустить
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          {steps.map((item, index) => (
            <span
              key={item.order}
              className={`h-1 flex-1 rounded-full transition-all ${
                index <= step ? "bg-[#ff4d4f]" : "bg-neutral-200"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold text-neutral-900">
            Шаг {step + 1} из {steps.length}
          </h3>
          <p className="text-base text-neutral-700">{steps[step]?.description}</p>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"
            onClick={handlePrev}
            disabled={step === 0}
          >
            Назад
          </button>
          <button type="button" className="btn-primary px-5 py-2 text-sm" onClick={handleNext}>
            {step === steps.length - 1 ? "Готово" : "Далее"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
