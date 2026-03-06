"use client";

import { useState } from "react";
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

  const scrollToPassport = () => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("full-passport");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 10);
  };

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
            autoDownloadDocx={autoDownloadDocx}
          />
        </div>
      </div>

      <OnboardingTour />
    </>
  );
}