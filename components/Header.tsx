"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HowToUse } from "./HowToUse";

function Logo() {
  const [src, setSrc] = useState("/Logo.svg");
  const [fallbackText, setFallbackText] = useState(false);

  if (fallbackText) {
    return (
      <div className="inline-flex h-[6.75rem] w-[6.75rem] items-center justify-center rounded-2xl bg-white text-lg font-black uppercase text-[#121212] lg:h-[8.1rem] lg:w-[8.1rem]">
        PS
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt="Polar Star"
      width={162}
      height={162}
      priority
      onError={() => {
        if (src === "/Logo.svg") {
          setSrc("/polar-star.png");
        } else {
          setFallbackText(true);
        }
      }}
      className="h-[6.75rem] w-[6.75rem] select-none object-contain lg:h-[8.1rem] lg:w-[8.1rem]"
    />
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || !firstLinkRef.current) return;
    firstLinkRef.current.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  const overlayClasses = useMemo(
    () =>
      `absolute inset-0 bg-black/45 backdrop-blur-md transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`,
    [open]
  );

  const panelClasses = useMemo(
    () =>
      `ml-auto flex h-full w-[88%] max-w-sm flex-col border-l border-white/10 bg-[#121212] shadow-2xl transition-transform duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`,
    [open]
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#121212]/95 text-white backdrop-blur supports-[backdrop-filter]:bg-[#121212]/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-4 py-4 lg:py-5 lg:grid-cols-[1fr,auto] xl:grid-cols-[1fr,auto,auto]">
          <div className="flex min-w-0 items-start gap-4">
            <Link href="/" className="shrink-0" aria-label="На главную">
              <Logo />
            </Link>
            <div className="min-w-0 space-y-1">
              <Link href="/">
                <h1 className="text-[clamp(20px,2vw,32px)] font-extrabold leading-tight whitespace-normal break-words break-keep">
                  ГЕНЕРАТОР УНИКАЛЬНЫХ МЯСНЫХ ПРОДУКТОВ
                </h1>
              </Link>
              <p className="text-[clamp(12px,1.2vw,18px)] leading-snug text-white/80">
                По Методике Когнитивно-Сенсорного Маркетинга
              </p>
            </div>
          </div>

          <div className="hidden xl:block text-center">
            <div className="mx-auto max-w-[360px] rounded-xl px-4 py-2 text-[clamp(14px,1.2vw,18px)] font-semibold whitespace-normal break-words drop-shadow-[0_0_24px_rgba(255,91,91,0.35)]">
              СОЗДАЙ СВОЙ УНИКАЛЬНЫЙ ПРОДУКТ ЗА 2 МИНУТЫ
            </div>
          </div>

          <div className="hidden items-center justify-end gap-2 lg:flex">
            <HowToUse />
            <Link
              href="/dashboard"
              className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Кабинет
            </Link>
            <Link
              href="/api/auth/signin"
              className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Войти
            </Link>
          </div>

          <div className="lg:col-span-2 xl:hidden">
            <div className="mt-1 text-center text-[clamp(14px,1.4vw,18px)] font-semibold opacity-90 whitespace-normal break-words">
              СОЗДАЙ СВОЙ УНИКАЛЬНЫЙ ПРОДУКТ ЗА 2 МИНУТЫ
            </div>
          </div>

          <div className="flex items-center justify-end lg:hidden">
            <button
              type="button"
              aria-label={open ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={open}
              aria-controls={dialogId}
              onClick={toggle}
              className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 text-white transition hover:bg-white/10"
            >
              <span className="sr-only">Menu</span>
              <div className="relative h-5 w-5" aria-hidden="true">
                <span
                  className={`absolute inset-x-0 top-1 h-0.5 rounded bg-white transition-transform duration-200 ${
                    open ? "translate-y-1.5 rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute inset-x-0 top-2.5 h-0.5 rounded bg-white transition-opacity duration-200 ${
                    open ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute inset-x-0 bottom-1 h-0.5 rounded bg-white transition-transform duration-200 ${
                    open ? "-translate-y-1.5 -rotate-45" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div
        id={dialogId}
        role="dialog"
        aria-modal="true"
        className={`fixed inset-0 z-50 lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div className={overlayClasses} onClick={close} />
        <aside className={panelClasses}>
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <span className="text-sm font-semibold uppercase tracking-wide text-white/70">Навигация</span>
            <button
              type="button"
              onClick={close}
              aria-label="Закрыть меню"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-4 border-t border-white/10 px-5 py-6">
            <Link
              ref={firstLinkRef}
              href="#generator"
              onClick={close}
              className="relative select-none text-[0.98rem] font-bold uppercase tracking-wide text-white/90 transition hover:text-white after:absolute after:-inset-x-2 after:inset-y-1 after:-z-10 after:rounded-xl after:bg-[linear-gradient(90deg,#FF5B5B_0%,#ff7b7b_100%)] after:opacity-20 hover:after:opacity-35 drop-shadow-[0_0_12px_rgba(255,91,91,0.35)] hover:drop-shadow-[0_0_18px_rgба(255,91,91,0.55)]"
            >
              СОЗДАЙ СВОЙ УНИКАЛЬНЫЙ ПРОДУКТ ЗА 2 МИНУТЫ
            </Link>
            <HowToUse variant="drawer" onTrigger={close} />
            <div className="h-px bg-white/10" />
            <Link
              href="/dashboard"
              onClick={close}
              className="rounded-lg border border-white/10 px-3.5 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              Кабинет
            </Link>
            <Link
              href="/api/auth/signin"
              onClick={close}
              className="rounded-lg border border-white/10 px-3.5 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              Войти
            </Link>
          </div>
        </aside>
      </div>
    </header>
  );
}

