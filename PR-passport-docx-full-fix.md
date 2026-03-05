# fix(passport-docx): diagnostics, robust response and download loader

## Что сделано

- **Сервер** `app/api/passport-docx/route.ts` — диагностическое логирование (reqId, previewHex, size, elapsed ms), безопасная конвертация Buffer/Uint8Array → ArrayBuffer, явный `Response` с `Content-Length` и `Content-Disposition`.
- **Тестовый endpoint** `app/api/passport-docx/test/route.ts` — GET возвращает минимальный валидный DOCX для быстрой проверки.
- **Клиент** `components/ResultPreview.jsx` — кнопка «Скачать DOCX»: лоадер (три точки), блокировка, прогресс-симуляция, обработка ошибок и корректная загрузка blob; задержка 450 ms в `finally` для UX.
- **package.json** — `docx` уже в `dependencies`, изменений не требуется.

## Как тестировать локально

```bash
npm install && npm run dev
# Тест тестового endpoint:
curl -v -o test-docx.bin "http://localhost:3000/api/passport-docx/test"
file test-docx.bin
# Ожидаем: Zip archive data / Microsoft Word 2007+

# Тест POST с draft:
curl -v -X POST "http://localhost:3000/api/passport-docx" \
  -H "Content-Type: application/json" \
  -d '{"draft":{"header":{"name":"test","category":"Паштет","audience":"дети"},"blocks":{}}}' \
  -o passport.bin
file passport.bin
```

## Что смотреть в проде (после деплоя)

- **Vercel → Deployments → Logs**: строки `[passport-docx][reqId] start`, `previewHex=...`, `size=...`, `sending response length=...`, `elapsed=...ms`.
- **Браузер → DevTools → Network**: для `POST /api/passport-docx` проверить Response headers: `Content-Type`, `Content-Length` и что тело бинарное (не JSON).

## Ожидаемые результаты

- `previewHex` = `504b0304` (hex) → корректный DOCX (ZIP PK..).
- `Content-Type` = `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `Content-Length` > 0.
- При ошибке в логах: `[passport-docx] fatal error:` + message/stack; в ответе — JSON с полем `error`.

## Команды для тестов после деплоя (подставить свой URL)

```bash
# 1) Тест GET /api/passport-docx/test
curl -v -X GET "https://<YOUR_VERCEL_URL>/api/passport-docx/test" -o test-docx.bin
file test-docx.bin
# Windows (PowerShell): [System.BitConverter]::ToString((Get-Content test-docx.bin -Encoding Byte -TotalCount 8))

# 2) Тест POST с минимальным draft
curl -v -X POST "https://<YOUR_VERCEL_URL>/api/passport-docx" \
  -H "Content-Type: application/json" \
  -d "{\"draft\":{\"header\":{\"name\":\"test\",\"category\":\"Паштет\"},\"blocks\":{}}}" \
  -o passport.bin
file passport.bin
```

Если `passport.bin` — текст/JSON:
```bash
head -n 40 passport.bin
```

## Интерпретация

- **previewHex = 504b0304** → сервер отдаёт DOCX; если в браузере всё ещё ошибка — смотреть прокси/middleware или клиентский разбор ответа.
- **previewHex начинается с 7b22** (или ответ — JSON) → ошибка генерации; смотреть stack в логах Vercel и при необходимости править `lib/passportDocx.ts` или входные данные draft.
