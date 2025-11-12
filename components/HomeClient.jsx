"use client";

import { useCallback, useEffect, useState } from "react";
import GeneratorForm from "./GeneratorForm";
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

  const handleDownloadDocx = useCallback(async () => {
    if (!draft) return;
    try {
      setLoading(true);
      const response = await fetch("/api/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft })
      });
      if (!response.ok) {
        throw new Error(`DOCX ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename =
        (draft?.header?.name || draft?.header?.category || "Паспорт").replace(/[\\/:*?"<>|]+/g, "_") + ".docx";
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast("DOCX скачан", "ok");
    } catch (error) {
      console.error(error);
      showToast(error.message || "Ошибка при сборке DOCX", "error");
    } finally {
      setLoading(false);
    }
  }, [draft]);

  const handleSendToTelegram = useCallback(async () => {
    if (!draft) return;
    try {
      setLoading(true);
      const response = await fetch("/api/send-to-tg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, projectId })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || `Telegram ${response.status}`);
      }
      showToast("Отправлено в Telegram", "ok");
    } catch (error) {
      console.error(error);
      showToast(error.message || "Не удалось отправить в Telegram", "error");
    } finally {
      setLoading(false);
    }
  }, [draft, projectId]);

  useEffect(() => {
    if (autoDownloadDocx && initialDraft) {
      handleDownloadDocx();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownloadDocx, initialDraft]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
      <GeneratorForm
        onDraftGenerated={(newDraft) => setDraft(newDraft)}
        onLoadingChange={(state) => setLoading(state)}
        projectId={projectId}
        initialDraft={initialDraft}
      />
      <ResultPreview
        draft={draft}
        loading={loading}
        onDownload={handleDownloadDocx}
        onSendToTelegram={handleSendToTelegram}
      />
    </div>
  );
}

