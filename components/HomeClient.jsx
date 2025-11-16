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

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadDocx = useCallback(async () => {
    if (!draft) return;
    setIsDownloading(true);
    try {
      const res = await fetch("/api/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft })
      });

      const contentType = res.headers.get("Content-Type") || "";
      const contentLength = res.headers.get("Content-Length") || "";

      console.log("DOCX_DOWNLOAD_HEADERS", {
        status: res.status,
        contentType,
        contentLength
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || "Не удалось собрать DOCX");
      }

      if (!contentType.includes("officedocument.wordprocessingml.document")) {
        const text = await res.text().catch(() => "");
        console.error("NOT_DOCX_RESPONSE", contentType, text?.slice(0, 200));
        throw new Error("Сервер вернул не DOCX-файл");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Паспорт_${draft.header?.name || "продукт"}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
      showToast("DOCX скачан", "ok");
    } catch (error) {
      console.error(error);
      showToast(error.message || "Ошибка при сборке DOCX", "error");
    } finally {
      setIsDownloading(false);
    }
  }, [draft]);


  useEffect(() => {
    if (autoDownloadDocx && initialDraft) {
      handleDownloadDocx();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownloadDocx, initialDraft]);

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
            }}
            onLoadingChange={(state) => setLoading(state)}
            projectId={projectId}
            initialDraft={initialDraft}
          />
          <ResultPreview
            draft={draft}
            loading={loading}
            celebration={celebration}
            onDownload={handleDownloadDocx}
          />
        </div>
      </div>
      <OnboardingTour />
    </>
  );
}

