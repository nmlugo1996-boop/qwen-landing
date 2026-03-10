"use client";

import { useEffect, useState } from "react";

interface LoadingAnimationProps {
  isVisible: boolean;
}

export default function LoadingAnimation({ isVisible }: LoadingAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState("");
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; delay: number; size: number }>
  >([]);

  useEffect(() => {
    if (!isVisible) return;

    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      size: Math.random() * 4 + 2
    }));

    setParticles(newParticles);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 2;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev === "..." ? "" : prev + "."));
    }, 450);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">

      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-neutral-200 p-8">

        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-neutral-900">
            Создаём ваш уникальный продукт{dots}
          </h2>
          <p className="text-sm text-neutral-500 mt-2">
            Генерируем концепт и собираем маркетинговую логику
          </p>
        </div>

        <div className="relative h-3 bg-neutral-200 rounded-full overflow-hidden">

          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#FF5B5B] to-[#FF7B5B] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />

          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute top-1/2 -translate-y-1/2 rounded-full bg-[#FF5B5B] opacity-70"
              style={{
                left: `${p.x}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animation: `particleFloat 2s ease-out infinite`,
                animationDelay: `${p.delay}s`
              }}
            />
          ))}
        </div>

        <div className="flex justify-between text-xs text-neutral-500 mt-2">
          <span>Идёт генерация</span>
          <span>{Math.floor(progress)}%</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes particleFloat {
          0% {
            transform: translateY(0);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-12px);
            opacity: 1;
          }
          100% {
            transform: translateY(-20px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}