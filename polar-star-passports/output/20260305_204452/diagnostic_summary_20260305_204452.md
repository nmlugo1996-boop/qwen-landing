# DIAGNOSTIC SUMMARY — 20260305_204452
**Статус: 🔴 DEPLOY ЗАБЛОКИРОВАН**

## Обзор

| Параметр | Значение |
|---|---|
| Timestamp | 20260305_204452 |
| Ветка | deploy/diag-20260305_204452 |
| BLOCK_DEPLOY | **true** |
| json_errors_count | 2 (good + bad) |
| md_critical_issues | 1 (meatcode.md — 5 секций из 10 отсутствуют) |
| docx_unparsed_count | 1 (shokovsyanka, MD не создан) |
| npm test | Скипнут (скрипт отсутствует) |
| npm build | Скипнут (деплой заблокирован) |

---

## ТОП-5 ПРОБЛЕМ

### 🔴 КРИТИЧЕСКАЯ 1: `good_passport.json` не валиден по новой схеме (21 ошибка)
**Причина:** Схема `passport_schema.json` была существенно расширена. Добавлены обязательные (required) поля верхнего уровня: `production`, `regulatory`, `commerce`, `validation_plan`, `appendices`, `sign_off_checklist`. Кроме того, `cognitive_block` теперь требует плоских массивов (`consumption_change`, `rituals`, `narratives`, `desired_model`, `education`), а `sensory_block` — объектов с sub-полями вместо массивов строк.

**Текущий формат (старый):** `"1.a_consumption_change": { "replacements": [...] }`
**Требуемый формат (новый):** `"consumption_change": [...]`

**Fix:** Обновить `good_passport.json` под новую схему — добавить недостающие разделы (production, regulatory и т.д.) с данными из `meatcode.md`.

### 🔴 КРИТИЧЕСКАЯ 2: `bad_passport.json` — неверные типы данных (17 ошибок)
**Причина:** Поля `thoughts`, `behaviors` — строки вместо массивов; `education` — строка вместо массива; `sensory_block.visual/audio/smell/tactile/taste` — массивы строк вместо объектов; отсутствует `sign_off_checklist`.

**Fix:** `bad_passport.json` — намеренно «плохой» пример, но JSON-типы должны быть корректными (иначе Ajv не различает «плохое содержание» от «невалидный JSON»). Исправить типы: `thoughts/behaviors` → `[]`, `sensory.*` → `{}`, добавить `sign_off_checklist: []`.

### 🟡 ВАЖНАЯ 3: `meatcode.md` — неполный (MEDIUM, не FULL)
**Причина:** Присутствуют 5 из 10 обязательных секций. Отсутствуют: **Производство**, **Коммерция**, **План валидации**, **Приложения**, **SIGN-OFF CHECKLIST**.

**Fix:** Дописать недостающие секции (данные для Производства и Коммерции могут браться из `shokovsyanka_march_2026.docx` после конвертации) или явно пометить файл как MEDIUM.

### 🟡 ВАЖНАЯ 4: `shokovsyanka_march_2026.docx` — не конвертирован
**Причина:** `mammoth` и `turndown` не установлены; соответствующего `.md` файла нет.

**Fix:**
```bash
npm install mammoth turndown --no-audit --no-fund
node -e "const mammoth=require('mammoth');const td=new (require('turndown'))();mammoth.extractRawText({path:'polar-star-passports/reference/shokovsyanka_march_2026.docx'}).then(r=>require('fs').writeFileSync('polar-star-passports/reference/shokovsyanka_march_2026.md',r.value))"
```

### 🔵 ИНФОРМАЦИОННАЯ 5: Схема обновлена, API-роут не проверялся
**Причина:** `app/api/generate/passport/route.js` использует `passport_schema.json` (Ajv). После расширения схемы старые ответы от LLM будут проваливать валидацию (нет `production`, `regulatory` и т.д.). Промпт `passport_prompt.txt` также обновлён, но необходимо убедиться, что LLM генерирует все новые обязательные блоки.

**Fix:** Проверить промпт — добавить явные инструкции генерировать `production`, `regulatory`, `commerce`, `validation_plan`, `appendices`, `sign_off_checklist`.

---

## Пути к артефактам

```
polar-star-passports/output/20260305_204452/
  ├── run_info.txt
  ├── discovery.json
  ├── validate.js
  ├── json_validation_good_passport.json   ← 21 ошибка
  ├── json_validation_bad_passport.json    ← 17 ошибок
  ├── md_check_meatcode.json               ← 5 секций из 10
  ├── docx_report.json                     ← unparsed
  ├── code_survey.txt
  ├── deploy_decision.json                 ← BLOCK_DEPLOY=true
  └── diagnostic_summary_20260305_204452.md ← этот файл
```

---

## Sign-off Checklist

| Критерий | Статус | Комментарий |
|---|---|---|
| good_passport.json валиден по passport_schema.json | **No** | 21 ошибка — старый формат + нет новых required полей |
| bad_passport.json имеет корректные JSON-типы | **No** | 17 ошибок — типы строк/массивов/объектов неверны |
| meatcode.md содержит все 10 обязательных секций | **No** | 5/10 — нет Производства, Коммерции, Валидации и т.д. |
| shokovsyanka.docx сконвертирован в MD | **No** | mammoth не установлен |
| npm test проходит (exit 0) | **N/A** | Скрипт test не определён |
| npm build проходит (exit 0) | **N/A** | Не запущен — деплой заблокирован |
| DEPLOY выполнен | **No** | BLOCK_DEPLOY=true |
| Git ветка создана | **Yes** | deploy/diag-20260305_204452 |
| Артефакты сохранены в output/ | **Yes** | 9 файлов в output/20260305_204452/ |
| Промпт содержит все новые блоки | **Нужна проверка** | Требует ревью passport_prompt.txt |

---

## Git

```
branch: deploy/diag-20260305_204452
commit: chore(deploy): add methodology reference and archive old references — diagnostica run 20260305_204452
push:   git push -u origin deploy/diag-20260305_204452
```
