# PR: fix/passport-docx-logging-and-loader

## Что сделано

- Добавлены диагностические логи в `/api/passport-docx` (`previewHex` и `size`).
- Безопасная конвертация Buffer/Uint8Array → ArrayBuffer.
- Возврат бинарного Response с корректными заголовками и `Content-Length`.
- Клиент: улучшена кнопка «Скачать DOCX» — добавлена анимация загрузки (три точки) и корректная обработка blob/json.

## Как тестировать

1. Задеплойте ветку (Vercel автоматически подхватит).
2. Откройте страницу, нажмите **«Скачать DOCX»**.
3. **DevTools → Network** → найдите `POST /api/passport-docx` → проверьте Response headers:
   - `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - `Content-Length: > 0`
   - тело — бинарный .docx (или при ошибке — JSON).
4. **Vercel → Deployments → Logs** — найдите строки с `[passport-docx] previewHex=... size=...`.
   - `previewHex === "504b0304"` (hex) означает корректный DOCX (ZIP PK..).
   - если `previewHex` начинается с `7b22...` — это JSON (`{"...`) ⇒ ошибка на сервере, смотреть стек-трейс.
