"use client";

import { useEffect, useState } from "react";

interface LoadingAnimationProps {
  isVisible: boolean;
}

export default function LoadingAnimation({ isVisible }: LoadingAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState("");
  const [showFlash, setShowFlash] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; size: number; speed: number }>>([]);

  // Генерируем частицы
  useEffect(() => {
    if (!isVisible) {
      setParticles([]);
      return;
    }

    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 1.5 + 1
    }));
    setParticles(newParticles);
  }, [isVisible]);

  // Анимация прогресса
  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // Останавливаем на 95%, остальное заполнится при завершении
        return prev + Math.random() * 3;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Анимация точек
  useEffect(() => {
    if (!isVisible) {
      setDots("");
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Завершаем прогресс при скрытии
  useEffect(() => {
    if (!isVisible && progress > 0) {
      setProgress(100);
      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
        setProgress(0);
      }, 500);
    } else if (isVisible) {
      setShowFlash(false);
    }
  }, [isVisible, progress]);

  if (!isVisible && !showFlash) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Текст с эффектом печатающейся машинки */}
        <div className="text-center mb-4">
          <h2 className="text-xl md:text-2xl font-semibold text-neutral-900">
            Создаём ваш уникальный продукт{dots}
          </h2>
        </div>

        {/* Прогресс-бар с частицами */}
        <div className="relative h-2 bg-neutral-200 rounded-full overflow-visible">
          {/* Фон прогресс-бара */}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-100 to-neutral-200 rounded-full" />
          
          {/* Заполнение прогресс-бара */}
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#FF5B5B] to-[#FF7B5B] rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(255,91,91,0.5)]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            {/* Свечение на конце прогресс-бара */}
            <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-r from-transparent to-white/30 blur-sm" />
          </div>

          {/* Частицы вокруг прогресс-бара */}
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#FF5B5B] to-[#FF7B5B] opacity-70 shadow-[0_0_6px_rgba(255,91,91,0.6)] pointer-events-none"
              style={{
                left: `${particle.x}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDelay: `${particle.delay}s`,
                animation: `floatUp ${2 + particle.speed}s ease-out infinite`
              }}
            />
          ))}
        </div>

        {/* Вспышка при завершении */}
        {showFlash && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF5B5B]/30 to-[#FF7B5B]/30 animate-pulse rounded-lg" />
        )}
      </div>

      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-15px) translateX(5px) scale(1.3);
            opacity: 1;
          }
          60% {
            transform: translateY(-30px) translateX(15px) scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-50px) translateX(25px) scale(0.6);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

