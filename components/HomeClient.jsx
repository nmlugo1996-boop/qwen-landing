"use client";

import { useCallback, useState } from "react";
import GeneratorForm from "./GeneratorForm";
import OnboardingTour from "./OnboardingTour";
import ResultPreview from "./ResultPreview";

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

    // Критично: очищаем старый draft и старое "празднование",
    // чтобы UI не выглядел как будто всё уже готово / сбросилось.
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