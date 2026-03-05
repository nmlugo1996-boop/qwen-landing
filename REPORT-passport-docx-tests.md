# Отчёт тестов passport-docx (заполнить после деплоя)

## 1. Вывод команд

### GET /api/passport-docx/test
```
# Вставить вывод:
# curl -v ... (первые строки)
# file test-docx.bin
# hexdump / PowerShell: первые 8 байт в hex
```

### POST /api/passport-docx
```
# Вставить вывод:
# curl -v ... (первые строки)
# file passport.bin
# hexdump / PowerShell: первые 8 байт в hex
```

## 2. Логи Vercel

Скопировать блоки с `[passport-docx]` (включая reqId, previewHex, size, sending response length, elapsed или fatal error).

```
# Вставить сюда
```

## 3. Network (браузер)

- URL: `POST /api/passport-docx`
- Response headers: Content-Type, Content-Length
- Статус: 200 / 5xx

## 4. Заключение

- [ ] success — DOCX скачивается, previewHex=504b0304
- [ ] fail — причина (JSON вместо binary / ошибка в логах / другое)

Дальнейшие шаги: ...
