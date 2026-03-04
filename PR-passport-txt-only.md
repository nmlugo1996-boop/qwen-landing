# fix(passport-txt): TXT-only passport route, diagnostics, client download and loader

## Что сделано

- Реализован **`/api/passport-txt`**: серверный маршрут получает `draft` (JSON), строит каноничный текст по строгому шаблону (или использует `draft.final_text`, если передан). Диагностические логи: `[passport-txt][reqId] start`, `preview=...`, `size=...`, `elapsed=...ms`. Ответ: `text/plain; charset=utf-8`, `Content-Disposition: attachment; filename="passport.txt"`, `Content-Length`. При ошибке — JSON с `error`, `message`, `stack`.
- **Клиент** `components/ResultPreview.jsx`: вызов заменён с `/api/passport-docx` на `/api/passport-txt`; функция `downloadTxt` получает текст через `res.text()`, создаёт `Blob` с `text/plain;charset=utf-8`, скачивает как `passport.txt`. Сохранены анимация загрузки (три точки), блокировка кнопки, обработка ошибок и задержка 450 ms в `finally`. Кнопка: «Скачать Docs» (скачивает TXT).
- Все обращения к скачиванию паспорта в UI переведены на **TXT** (единственный вызов был в ResultPreview — заменён).

## Как тестировать

```bash
npm ci
npm run build
```

После деплоя или локально (`npm run dev`):

```bash
curl -v -X POST "https://<URL>/api/passport-txt" \
  -H "Content-Type: application/json" \
  -d '{"draft":{"header":{"name":"Шоковсянка","category":"Функциональные снеки","audience":["18-24"],"pain":"Хочется полезно","uniqueness":"..."},"blocks":{}}}' \
  -o passport.txt

file passport.txt
head -n 80 passport.txt
```

В браузере: сгенерировать паспорт → нажать «Скачать Docs» → должен скачаться `passport.txt` с читаемым текстом.

## Vercel logs

Искать строки: `[passport-txt][<reqId>] start`, `preview=...`, `size=...`, `elapsed=...ms`. При ошибке: `[passport-txt][<reqId>] error` и stack.

## Чеклист

- [x] `next build` выполнен успешно
- [ ] curl POST тест пройден (passport.txt — текст)
- [ ] Vercel logs с `[passport-txt]` прикреплены
- [x] UI скачивания TXT с лоадером работает
- [x] Упоминания скачивания переведены на `/api/passport-txt` (ResultPreview)

## Примечание

PDF/DOCX из pipeline убраны для данного сценария — паспорт выдаётся только в TXT. Маршруты `/api/passport-docx` и `/api/passport-docx/test` в проекте остаются (не удаляются), но кнопка «Скачать Docs» теперь использует только `/api/passport-txt`.
