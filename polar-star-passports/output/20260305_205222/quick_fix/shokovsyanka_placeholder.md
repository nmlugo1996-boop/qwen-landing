# PLACEHOLDER: shokovsyanka_march_2026.docx

> **Этот файл создан автоматически (quick_fix).** Оригинальный DOCX не был конвертирован — mammoth/pandoc не установлены.

## Статус

| Параметр | Значение |
|---|---|
| Исходный файл | `polar-star-passports/reference/shokovsyanka_march_2026.docx` |
| Размер | 237 188 байт |
| MD-конвертация | ❌ Не выполнена (mammoth не установлен) |
| Блокирует деплой | ❌ Да (docx_unparsed и нет MD-замены) |

## Команды для конвертации

Выполните локально одну из следующих команд:

### Вариант 1 — mammoth (Node.js)
```bash
npm install mammoth turndown --no-audit --no-fund
node -e "
const mammoth = require('mammoth');
const path = 'polar-star-passports/reference/shokovsyanka_march_2026.docx';
mammoth.extractRawText({path}).then(r =>
  require('fs').writeFileSync(
    'polar-star-passports/reference/shokovsyanka_march_2026.md',
    r.value
  )
);
"
```

### Вариант 2 — pandoc (CLI)
```bash
pandoc polar-star-passports/reference/shokovsyanka_march_2026.docx \
  -o polar-star-passports/reference/shokovsyanka_march_2026.md
```

### После конвертации

Добавьте в MD заголовки обязательных секций:
- `## 📋 КРАТКИЙ ПАСПОРТ`
- `## 🧠 КОГНИТИВНЫЙ БЛОК`
- `## 👁 СЕНСОРНЫЙ БЛОК`
- `## 🏷 БРЕНДИНГОВЫЙ БЛОК`
- `## 📊 МАРКЕТИНГОВЫЙ БЛОК`
- `## 🏭 ПРОИЗВОДСТВО`
- `## 💰 КОММЕРЦИЯ`
- `## ✅ ПЛАН ВАЛИДАЦИИ`
- `## 📎 ПРИЛОЖЕНИЯ`
- `## 📋 SIGN-OFF CHECKLIST`

> После создания MD-файла этот placeholder можно удалить.
