"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { HOW_TO_STEPS, HOW_TO_TITLE, HOW_TO_FOOTER } from "./instructions";

export default function UsageModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usage-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full border border-neutral-200 bg-white p-2 text-sm font-semibold text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-800"
          aria-label="Закрыть подсказку"
        >
          ✕
        </button>
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#ff4d4f]">Подсказка</p>
            <h2 id="usage-modal-title" className="mt-2 text-2xl font-semibold text-neutral-900">
              {HOW_TO_TITLE}
            </h2>
          </div>
          <ol className="space-y-3 text-base text-neutral-700">
            {HOW_TO_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ff4d4f] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-2xl bg-neutral-100 px-5 py-4 text-sm text-neutral-600">
            {HOW_TO_FOOTER}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

