"use client";

import Image from "next/image";
import Link from "next/link";
import AuthButton from "./AuthButton";

export default function Header() {
  return (
    <header className="relative border-b border-white/10 bg-[#111111]/95 py-8 shadow-2xl shadow-black/40 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-1 items-center gap-6">
          <Link href="/" className="flex items-center" aria-label="На главную">
            <Image
              src="/polar-star.png"
              alt="Polar Star"
              width={260}
              height={260}
              className="h-20 w-auto drop-shadow-[0_0_18px_rgba(255,255,255,0.18)] sm:h-24 lg:h-28"
              priority
            />
          </Link>
          <div className="space-y-3">
            <h1 className="text-glow text-2xl font-semibold text-white sm:text-3xl lg:text-[2.6rem]">
              Генератор уникальных Мясных продуктов
            </h1>
            <p className="max-w-xl text-sm font-medium text-white/80 sm:text-base">
              По методике Когнитивно-Сенсорного Маркетинга (“Полярная звезда”)
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/"
            className="w-full rounded-xl bg-gradient-to-r from-[#ff4d4f] to-[#ff7875] px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-[#ff4d4f]/40 transition-all duration-300 hover:shadow-glow sm:w-auto"
          >
            Создай свой уникальный продукт за 2 минуты
          </Link>
          <div className="flex w-full justify-end gap-3 sm:w-auto">
            <Link
              href="/dashboard"
              className="btn-ghost w-full justify-center border-white/15 bg-white/10 text-white sm:w-auto"
            >
              Кабинет
            </Link>
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}

