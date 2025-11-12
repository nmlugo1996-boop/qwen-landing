"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const BASE_HINTS = {
  pains: [
    "Скучный вкус — нет эмоции",
    "Недоверие к составу/качеству",
    "Неудобно брать с собой",
    "Слишком острый или пресный вкус",
    "Нет ощущения натуральности",
    "Не ассоциируется с заботой/домашней едой",
    "Сложно для детей — не вызывает интереса",
    "Быстро надоедает вкус",
    "Непривлекательная упаковка",
    "Отсутствует визуальная идентичность бренда"
  ],
  uniq: [
    "Продукт которого нет на рынке",
    "Первый в категории с эмоциональной подачей",
    "Создан на основе когнитивно-сенсорной методики",
    "Мягкий формат — новый код продукта",
    "Еда как игра (вовлечение)",
    "Чистый состав без добавок",
    "Продукт-друг для детей",
    "Новый вкус в классической категории",
    "Формат перекуса, а не основного блюда",
    "Продукт, вызывающий привязанность"
  ]
};

const CATEGORY_HINTS = {
  Паштет: {
    pains: [
      "«Фу»-текстура у детей",
      "Нет эмоции/игры",
      "Пачкается",
      "Сложно открыть",
      "Страх нового вкуса",
      "Однообразно",
      "Не выглядит аппетитно",
      "Недостаточно мягкий",
      "Путают с «взрослым» продуктом",
      "Нет маленьких порций"
    ],
    uniq: [
      "Текстура нежнее йогурта",
      "Мини-порции",
      "Игровая подача",
      "Чистый состав",
      "Персонаж-друг",
      "Лёгкий сливочный профиль",
      "Удобная порционная упаковка",
      "Вкус-настроение",
      "Прозрачная история происхождения",
      "Формат перекуса"
    ]
  },
  Копчёности: {
    pains: [
      "Тяжесть/послевкусие",
      "Слишком солёно",
      "Однообразие",
      "Сомнения к копчению",
      "Долго готовить",
      "Неподходит на каждый день",
      "Злоупотребление специями",
      "Нет «лёгкой» альтернативы",
      "Нет апгрейда вкуса",
      "Сложно сочетать"
    ],
    uniq: [
      "Лёгкое копчение",
      "Сбалансированная соль/жир",
      "Новый маринад/дым",
      "Готово-к-перекусу",
      "Особая подача",
      "Премиальные специи",
      "Контроль происхождения",
      "Понятный профиль нутриентов",
      "Новые форм-факторы",
      "Линейка вкусов"
    ]
  }
};

const AUDIENCE_HINTS = {
  Дети: {
    pains: ["Страх нового вкуса", "Не вовлекает в игру"],
    uniq: ["Персонаж-друг", "Обучающая механика"]
  },
  Женщины: {
    pains: ["Сомнения в чистоте состава"],
    uniq: ["Чистый состав", "Лёгкие калории"]
  },
  Мужчины: {
    pains: ["Не сытно/неудобно"],
    uniq: ["Сытный формат", "Простые правила выбора"]
  }
};

const dedup = (arr) => Array.from(new Set(arr)).filter(Boolean);
const top10 = (arr) => dedup(arr).slice(0, 10);

function composeHints(category, groups) {
  const basePains = [...BASE_HINTS.pains];
  const baseUniq = [...BASE_HINTS.uniq];

  if (CATEGORY_HINTS[category]) {
    basePains.unshift(...CATEGORY_HINTS[category].pains);
    baseUniq.unshift(...CATEGORY_HINTS[category].uniq);
  }

  groups.forEach((group) => {
    if (AUDIENCE_HINTS[group]) {
      basePains.unshift(...AUDIENCE_HINTS[group].pains);
      baseUniq.unshift(...AUDIENCE_HINTS[group].uniq);
    }
  });

  return {
    pains: top10(basePains),
    uniq: top10(baseUniq)
  };
}

function showToast(message, kind = "info") {
  if (typeof window === "undefined") return;
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
}

const INITIAL_FORM = {
  category: "Колбаса варёная",
  categoryCustom: "",
  name: "",
  temperature: 0.7,
  pain: "",
  unique: "",
  audience: {
    age: new Set(),
    group: new Set()
  }
};

export default function GeneratorForm({ onDraftGenerated, onLoadingChange, projectId, initialDraft }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialDraft) return;
    const header = initialDraft.header ?? {};
    const category = header.category || INITIAL_FORM.category;
    const audience = Array.isArray(header.audience) ? header.audience : [];
    setForm((prev) => ({
      ...prev,
      category: category && Object.keys(CATEGORY_HINTS).includes(category) ? category : "Свой вариант…",
      categoryCustom: category && !Object.keys(CATEGORY_HINTS).includes(category) ? category : "",
      name: header.name || "",
      pain: header.pain || "",
      unique: header.innovation || header.unique || "",
      audience: {
        age: new Set(audience.filter((item) => /\d/.test(item))),
        group: new Set(audience.filter((item) => !/\d/.test(item)))
      }
    }));
  }, [initialDraft]);

  const selectedCategory = form.category === "Свой вариант…" ? form.categoryCustom : form.category;
  const audienceGroups = useMemo(() => Array.from(form.audience.group), [form.audience.group]);
  const hints = useMemo(() => composeHints(selectedCategory, audienceGroups), [selectedCategory, audienceGroups]);

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleAudience = useCallback((type, value) => {
    setForm((prev) => {
      const nextSet = new Set(prev.audience[type]);
      if (nextSet.has(value)) {
        nextSet.delete(value);
      } else {
        nextSet.add(value);
      }
      return {
        ...prev,
        audience: {
          ...prev.audience,
          [type]: nextSet
        }
      };
    });
  }, []);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  const appendToField = useCallback((field, text) => {
    setForm((prev) => {
      const current = prev[field];
      const separator = field === "unique" ? "; " : "\n";
      return {
        ...prev,
        [field]: current ? `${current}${separator}${text}` : text
      };
    });
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setLoading(true);
      onLoadingChange?.(true);

      try {
        const payload = {
          category: selectedCategory?.trim(),
          audience: [...form.audience.age, ...form.audience.group],
          pain: form.pain.trim(),
          innovation: form.unique.trim(),
          name: form.name.trim() || undefined,
          temperature: Number(form.temperature),
          projectId: projectId || undefined
        };

        if (!payload.category) {
          throw new Error("Укажи категорию продукта");
        }

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error?.error || `API ${response.status}`);
        }

        const draft = await response.json();
        onDraftGenerated?.(draft);
        showToast("Паспорт готов", "ok");
      } catch (error) {
        console.error(error);
        showToast(error.message || "Не удалось сгенерировать паспорт", "error");
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    },
    [form, onDraftGenerated, onLoadingChange, selectedCategory]
  );

  return (
    <form
      className="card-surface flex flex-col gap-6 border-white/20 bg-white/90 shadow-card backdrop-blur-xl"
      onSubmit={handleSubmit}
      id="form"
    >
      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="category">
          Категория
        </label>
        <select
          id="category"
          className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base text-neutral-700 shadow-inner transition-all duration-300 focus:border-[#ff4d4f] focus:outline-none focus:ring-2 focus:ring-[#ff4d4f]/30"
          value={form.category}
          onChange={(event) => updateField("category", event.target.value)}
        >
          <option>Колбаса варёная</option>
          <option>Сосиски</option>
          <option>Паштет</option>
          <option>Ветчина</option>
          <option>Копчёности</option>
          <option>Бекон</option>
          <option>Мясное пюре</option>
          <option>Мясные снеки</option>
          <option>Консервы мясные</option>
          <option>Рагу мясное</option>
          <option>Свой вариант…</option>
        </select>
        {form.category === "Свой вариант…" && (
          <input
            id="categoryCustom"
            className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base text-neutral-700 shadow-inner transition-all duration-300 focus:border-[#ff4d4f] focus:outline-none focus:ring-2 focus:ring-[#ff4d4f]/30"
            placeholder="Укажи свою категорию"
            value={form.categoryCustom}
            onChange={(event) => updateField("categoryCustom", event.target.value)}
            required
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="productName">
          Название (оставь пустым — придумаем)
        </label>
        <input
          id="productName"
          className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base text-neutral-700 shadow-inner transition-all duration-300 focus:border-[#ff4d4f] focus:outline-none focus:ring-2 focus:ring-[#ff4d4f]/30"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder='Например: «Полярный вкус»'
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="temperature">
          Креативность (temperature)
        </label>
        <div className="flex items-center gap-4">
          <input
            id="temperature"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={form.temperature}
            onChange={(event) => updateField("temperature", Number(event.target.value))}
            className="accent-[#ff4d4f] flex-1"
          />
          <span className="text-sm font-semibold text-neutral-500" id="temperatureVal">
            {Number(form.temperature).toFixed(1)}
          </span>
        </div>
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-600">Целевая аудитория</legend>
        <div className="flex flex-wrap gap-3">
          {["0–3", "3–6", "7–12", "13–17", "18–24", "25–34", "35–44", "45–54", "55+"].map((age) => (
            <label
              key={age}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-300 ${
                form.audience.age.has(age)
                  ? "border-[#ff4d4f] bg-[#ff4d4f]/15 text-[#ff4d4f]"
                  : "border-neutral-200 bg-white/80 text-neutral-600 hover:border-[#ff4d4f]/60 hover:text-[#ff4d4f]"
              }`}
            >
              <input
                type="checkbox"
                name="age"
                value={age}
                checked={form.audience.age.has(age)}
                onChange={() => toggleAudience("age", age)}
                className="sr-only"
              />
              {age}
            </label>
          ))}
          {["Женщины", "Мужчины", "Дети"].map((group) => (
            <label
              key={group}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-300 ${
                form.audience.group.has(group)
                  ? "border-[#ff4d4f] bg-[#ff4d4f]/15 text-[#ff4d4f]"
                  : "border-neutral-200 bg-white/80 text-neutral-600 hover:border-[#ff4d4f]/60 hover:text-[#ff4d4f]"
              }`}
            >
              <input
                type="checkbox"
                name="group"
                value={group}
                checked={form.audience.group.has(group)}
                onChange={() => toggleAudience("group", group)}
                className="sr-only"
              />
              {group}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="pain">
          Потребительская боль
        </label>
        <textarea
          id="pain"
          className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base text-neutral-700 shadow-inner transition-all duration-300 focus:border-[#ff4d4f] focus:outline-none focus:ring-2 focus:ring-[#ff4d4f]/30"
          rows={3}
          placeholder='Например: «непонятный состав, нет эмоции»'
          value={form.pain}
          onChange={(event) => updateField("pain", event.target.value)}
        />
        <div id="pains-hints" className="flex flex-wrap gap-2" aria-label="Подсказки болей">
          {hints.pains.map((hint) => (
            <button key={hint} type="button" className="hint-chip" onClick={() => appendToField("pain", hint)}>
              {hint}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="unique">
          Уникальность
        </label>
        <textarea
          id="unique"
          className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base text-neutral-700 shadow-inner transition-all duration-300 focus:border-[#ff4d4f] focus:outline-none focus:ring-2 focus:ring-[#ff4d4f]/30"
          rows={3}
          value={form.unique}
          onChange={(event) => updateField("unique", event.target.value)}
        />
        <div id="uniq-hints" className="flex flex-wrap gap-2" aria-label="Подсказки уникальности">
          {hints.uniq.map((hint) => (
            <button key={hint} type="button" className="hint-chip" onClick={() => appendToField("unique", hint)}>
              {hint}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          id="btn-generate"
          className="btn-primary w-full sm:w-auto"
          disabled={loading}
        >
          Создать уникальный продукт
        </button>
      </div>
    </form>
  );
}

