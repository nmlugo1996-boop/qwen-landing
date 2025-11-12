"use client";

import { useState } from "react";

export default function SendToTelegramButton({ projectId }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/send-to-tg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || `Telegram ${response.status}`);
      }
      alert("Отправлено в Telegram");
    } catch (error) {
      console.error(error);
      alert(error.message || "Не удалось отправить в Telegram");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className="btn ghost" onClick={handleClick} disabled={loading}>
      Поделиться в TG
    </button>
  );
}

