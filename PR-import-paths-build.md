# fix(passport-docx): correct import paths and ensure project builds

## Что сделано

- **Исправлен импорт** в `app/api/passport-docx/test/route.ts`: путь к `lib/passportDocx` заменён с `../../../lib/passportDocx` (3 уровня вверх) на **`../../../../lib/passportDocx`** (4 уровня вверх), так как файл лежит в `app/api/passport-docx/test/route.ts` и до корня проекта нужно подняться на 4 уровня.
- Для типа `Response(arrayBuffer, ...)` добавлено приведение **`as ArrayBuffer`** (slice возвращает `ArrayBuffer | SharedArrayBuffer`), чтобы сборка TypeScript проходила без ошибок.
- Остальные импорты в `app/api/` проверены: в `app/api/passport-docx/route.ts` используется `../../../lib/passportDocx` (3 уровня — корректно для файла в `app/api/passport-docx/`); в `app/api/auth/session/route.js` — `../../../../lib/...` (4 уровня — корректно для вложенности).

## Результат сборки

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (12/12)
✓ Finalizing page optimization
```

Маршруты в сборке: `ƒ /api/passport-docx`, `○ /api/passport-docx/test`.

## Как тестировать локально

```bash
npm ci
npm run build
```

После деплоя (или локально `npm run dev`):

**GET (минимальный docx):**
```bash
curl -v -X GET "https://<ТВОЙ_URL>/api/passport-docx/test" -o test-docx.bin
file test-docx.bin
# Ожидаем: Zip archive / Microsoft Word; hexdump -n 16 -C test-docx.bin → 50 4b 03 04
```

**POST (генерация паспорта):**
```bash
curl -v -X POST "https://<ТВОЙ_URL>/api/passport-docx" \
  -H "Content-Type: application/json" \
  -d "{\"draft\":{\"header\":{\"name\":\"test\",\"category\":\"Паштет\"},\"blocks\":{}}}" \
  -o passport.bin
file passport.bin
```

## Изменённые файлы

- `app/api/passport-docx/test/route.ts` — исправлен путь импорта и тип для `arrayBuffer`.

## Логи и результаты

- **Build:** успешно (см. вывод выше).
- **file / hexdump** для `test-docx.bin` и `passport.bin`: выполнить после деплоя и вставить сюда.
- **Vercel logs:** в Vercel → Deployments → Logs найти строки `[passport-docx] previewHex=`, `sending response length=` и приложить сюда или в комментарий.

## Следующий шаг

После мержа в `main` задеплоить, прогнать curl-тесты и при необходимости добавить в PR вывод `file`/`hexdump` и фрагменты логов Vercel.
