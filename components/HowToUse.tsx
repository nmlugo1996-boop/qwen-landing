"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const STEPS = [
  "В правой части экрана введите первичные данные в соответствующие поля.",
  "Свои идеи и запросы оставьте в поле «Комментарий».",
  "Нажмите «Создать уникальный продукт».",
  "Сверху справа появится краткая версия паспорта.",
  "Ниже — полная версия КСМ-паспорта, доступная для скачивания .docx.",
  "Меняйте результат слайдером «Креативность».",
  "После генерации можно задать вопросы в чате поддержки."
];

type HowToUseProps = {
  variant?: "default" | "drawer";
  onTrigger?: () => void;
};

export function HowToUse({ variant = "default", onTrigger }: HowToUseProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const triggerClassName = useMemo(() => {
    if (variant === "drawer") {
      return "rounded-lg border border-white/10 px-3.5 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white text-left";
    }
    return "rounded-lg bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10";
  }, [variant]);

  const handleOpen = () => {
    onTrigger?.();
    setOpen(true);
  };

  const modal = !mounted || !open
    ? null
    : createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#151515] p-6 text-white shadow-2xl">
            <h2 className="text-lg font-bold">Как пользоваться генератором</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-white/85">
              {STEPS.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
            <p className="mt-4 font-semibold text-[#FF5B5B]">Удачной генерации!</p>
            <div className="mt-6 text-right">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>,
        document.body
      );

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={triggerClassName}
      >
        Как пользоваться?
      </button>
      {modal}
    </>
  );
}

