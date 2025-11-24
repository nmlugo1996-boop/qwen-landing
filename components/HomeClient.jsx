"use client";

import { useCallback, useEffect, useState } from "react";
import GeneratorForm from "./GeneratorForm";
import OnboardingTour from "./OnboardingTour";
import ResultPreview from "./ResultPreview";

const showToast = (message, kind = "info") => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  const palette = {
    error: "#d24b4b",
    ok: "#23a26d",
    warn: "#eab308",
    info: "#111827"
  };
  toast.textContent = message;
  toast.style.borderColor = palette[kind] || palette.info;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
};

export default function HomeClient({ initialDraft = null, projectId = null, autoDownloadDocx = false }) {
  const [draft, setDraft] = useState(initialDraft);
  const [loading, setLoading] = useState(false);
  const [celebration, setCelebration] = useState(Boolean(initialDraft));

  const scrollToPassport = () => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("full-passport");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    // Сначала мгновенная прокрутка для быстрого отклика
    window.scrollTo({ top: 0, behavior: "auto" });
    // Затем плавная прокрутка для лучшего UX
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 10);
  };

  // DOCX download removed: no route, no auto-download

  return (
    <>
      <div className="relative">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-[#FF5B5B]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-[#FFE6E6]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 rounded-full bg-[#FF5B5B]/5 blur-3xl pointer-events-none -translate-x-1/2" />
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10 relative z-10">
          <GeneratorForm
            onDraftGenerated={(newDraft) => {
              setDraft(newDraft);
              setCelebration(true);
              // После генерации плавно прокручиваем к паспорту
              setTimeout(scrollToPassport, 50);
            }}
            onLoadingChange={(state) => setLoading(state)}
            projectId={projectId}
            initialDraft={initialDraft}
            onSubmitStart={scrollToTop}
          />
          <ResultPreview
            draft={draft}
            loading={loading}
            celebration={celebration}
          />
        </div>
      </div>
      <OnboardingTour />
    </>
  );
}

