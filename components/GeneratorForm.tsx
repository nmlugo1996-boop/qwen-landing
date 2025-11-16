"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

const CUSTOM_CATEGORY_OPTION = "Свой вариант…";

const PRESET_CATEGORIES = []; // больше не используем пресеты — универсальный ввод

const AGE_SEGMENTS = ["2–7", "8–18", "18–25", "26–45", "46–60", "60+", "80+"];
const GROUP_SEGMENTS = ["Женщины", "Мужчины", "Неважно"];

const painHints: Record<string, string[]> = {
  default: [
    "Покупателям сложно понять, чем продукт отличается от конкурентов",
    "Есть сомнения в натуральности и составе продукта",
    "Не хватает повода выбрать именно наш бренд в момент покупки",
    "Скучный вкус: нет эмоций и ощущения открытия",
    "Нет уверенности, что продукт подойдёт всей семье"
  ],
  "Колбаса варёная": [
    "Ассоциируется с детсадовской столовой и однообразием",
    "Есть страх, что продукт перенасыщен усилителями и добавками"
  ],
  "Колбаса варёная::0–3": [
    "Родители переживают за непонятный состав и мягкость продукта",
    "Нет уверенности, что малыш захочет попробовать что-то новое"
  ],
  "Колбаса варёная::25–34": [
    "Молодым семьям нужна быстрая, но при этом полезная альтернатива",
    "Сложно найти колбасу, которой доверяешь для детей"
  ],
  "Паштет": [
    "Паштеты воспринимаются как тяжёлый и «взрослый» продукт",
    "Не хватает лёгкого, дружелюбного вкуса и подач"
  ],
  "Паштет::3–6": [
    "Детям не нравится текстура — нет игрового употребления",
    "Родители не уверены в свежести и происхождении ингредиентов"
  ],
  "Копчёности": [
    "Пугает сильный дым и ощущение «химического» послевкусия",
    "Нет ощущения лёгкости и контроля калорий"
  ],
  "Копчёности::35–44": [
    "Хочется специального вкуса для вечеринок, но без чувства тяжести",
    "Сложно найти копчёность, которой можно доверять каждый день"
  ],
  "default::0–3": [
    "Не уверены, что продукт безопасен и понравится ребёнку",
    "Хочется мягкий вкус без резких ароматов"
  ],
  "default::25–34": [
    "Мало продуктов, которые совмещают пользу и эмоцию",
    "Ищут простые решения для насыщенных будней"
  ],
  "default::35–44": [
    "Хочется продукта, который можно подать гостям без стеснения",
    "Нужны гарантии качества и прозрачный состав"
  ],
  Женщины: [
    "Нет ощущения контроля калорий и баланса БЖУ",
    "Хочется продукта, который подчеркнёт заботу о себе"
  ],
  Мужчины: [
    "Сомнения, что продукт действительно сытный и насыщенный",
    "Сложно найти вкус, который выделяется на фоне привычных брендов"
  ]
};

type AudienceSets = {
  age: Set<string>;
  group: Set<string>;
};

type FormState = {
  category: string;
  categoryCustom: string;
  name: string;
  comment: string;
  temperature: number;
  pain: string;
  audience: AudienceSets;
};

type DraftData = {
  header?: DraftHeader;
  comment?: string;
  temperature?: number;
  [key: string]: unknown;
};

type GeneratorFormProps = {
  onDraftGenerated?: (draft: DraftData) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  projectId?: string | null;
  initialDraft?: DraftData | null;
};

type DraftHeader = {
  category?: string;
  name?: string;
  pain?: string;
  innovation?: string;
  unique?: string;
  audience?: string[] | string;
};

const showToast = (message: string, kind: "info" | "ok" | "warn" | "error" = "info") => {
  if (typeof window === "undefined") return;
  const toast = document.getElementById("toast");
  if (!toast) return;
  const palette: Record<string, string> = {
    error: "#d24b4b",
    ok: "#23a26d",
    warn: "#eab308",
    info: "#111827"
  };
  toast.textContent = message;
  toast.style.borderColor = palette[kind] || palette.info;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2500);
};

const createInitialForm = (): FormState => ({
  category: "", // пусто по умолчанию — показываем только плейсхолдер
  categoryCustom: "",
  name: "",
  comment: "",
  temperature: 0.7,
  pain: "",
  audience: {
    age: new Set<string>(),
    group: new Set<string>()
  }
});

function normaliseCategory(category: string | undefined): string {
  return category?.trim() ? category.trim() : "default";
}

function collectPainHints(category: string, ages: string[], groups: string[]): string[] {
  const hints: string[] = [];
  const pushHint = (hint: string) => {
    if (!hint || hints.includes(hint)) return;
    hints.push(hint);
  };

  const categoryKey = normaliseCategory(category);

  painHints[categoryKey]?.forEach(pushHint);

  ages.forEach((age) => {
    painHints[`${categoryKey}::${age}`]?.forEach(pushHint);
    painHints[`default::${age}`]?.forEach(pushHint);
  });

  groups.forEach((group) => {
    painHints[group]?.forEach(pushHint);
  });

  if (hints.length === 0) {
    painHints.default?.forEach(pushHint);
  } else {
    painHints.default?.forEach(pushHint);
  }

  return hints;
}

function parseAudience(source: DraftHeader["audience"]): { age: Set<string>; group: Set<string> } {
  const initial = {
    age: new Set<string>(),
    group: new Set<string>()
  };

  if (!source) {
    return initial;
  }

  const items = Array.isArray(source) ? source : String(source).split(/,\s*/u);
  items.forEach((item) => {
    if (/\d/.test(item)) {
      initial.age.add(item.replace(/\sлет$/u, ""));
    } else {
      initial.group.add(item);
    }
  });

  return initial;
}

function GeneratingIcons() {
  const [currentIcon, setCurrentIcon] = useState(0);
  const icons = ["🔥", "🔪", "🥩"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIcon((prev) => (prev + 1) % icons.length);
    }, 450);

    return () => clearInterval(interval);
  }, [icons.length]);

  return <span className="text-lg">{icons[currentIcon]}</span>;
}

export default function GeneratorForm({ onDraftGenerated, onLoadingChange, projectId, initialDraft }: GeneratorFormProps) {
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false);
  const customCategoryRef = useRef<HTMLInputElement | null>(null);

  const showCustomCategoryInput = false; // кастомный ввод всегда, без селекта

  useEffect(() => {
    if (!initialDraft) return;
    const header: DraftHeader = initialDraft?.header ?? {};
    const category = header?.category ?? "";
    const preparedCategory = category;
    const audience = parseAudience(header.audience);
    const comment =
      typeof initialDraft?.comment === "string"
        ? initialDraft.comment
        : typeof initialDraft?.comment === "number"
          ? String(initialDraft.comment)
          : "";
    const temperature =
      typeof initialDraft?.temperature === "number"
        ? Math.min(1, Math.max(0, initialDraft.temperature))
        : 0.7;

    setForm({
      category: preparedCategory,
      categoryCustom: "",
      name: header?.name ?? "",
      comment,
      temperature,
      pain: header?.pain ?? "",
      audience
    });
  }, [initialDraft]);

  const effectiveCategory = showCustomCategoryInput ? form.categoryCustom.trim() : form.category.trim();
  const audienceAge = useMemo(() => Array.from(form.audience.age), [form.audience.age]);
  const audienceGroups = useMemo(() => Array.from(form.audience.group), [form.audience.group]);

  const painHintsList = useMemo(
    () => collectPainHints(effectiveCategory || "default", audienceAge, audienceGroups),
    [audienceAge, audienceGroups, effectiveCategory]
  );

  useEffect(() => {
    const ready = Boolean(effectiveCategory) && Boolean(form.pain.trim());
    setIsFormReady(ready);
  }, [effectiveCategory, form.pain]);

  useEffect(() => {
    onLoadingChange?.(isGenerating);
  }, [isGenerating, onLoadingChange]);

  useEffect(() => {
    if (!showCustomCategoryInput) return;
    window.requestAnimationFrame(() => {
      customCategoryRef.current?.focus();
      customCategoryRef.current?.select();
    });
  }, [showCustomCategoryInput]);

  const updateField = useCallback(<Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleAudience = useCallback((type: keyof AudienceSets, value: string) => {
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

  const handleCategoryChange = useCallback((value: string) => {
    if (value !== CUSTOM_CATEGORY_OPTION) {
      setForm((prev) => ({
        ...prev,
        category: value,
        categoryCustom: ""
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      category: value
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const categoryValue = effectiveCategory;
      const painValue = form.pain.trim();

      if (!categoryValue) {
        showToast("Укажите категорию продукта", "warn");
        return;
      }

      if (!painValue) {
        showToast("Опишите боль потребителя, чтобы продолжить", "warn");
        return;
      }

      setIsGenerating(true);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: categoryValue,
            audience: [...audienceAge, ...audienceGroups],
            pain: painValue,
            comment: form.comment.trim() || undefined,
            name: form.name.trim() || undefined,
            temperature: Number(form.temperature),
            projectId: projectId || undefined
          })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error?.error || `API ${response.status}`);
        }

        const draft = await response.json();
        onDraftGenerated?.(draft);
        showToast("Готово! Ниже можете посмотреть и скачать полный паспорт продукта!", "ok");
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "Не удалось сгенерировать паспорт";
        showToast(message, "error");
      } finally {
        setIsGenerating(false);
      }
    },
    [audienceAge, audienceGroups, effectiveCategory, form.comment, form.name, form.pain, form.temperature, onDraftGenerated, projectId]
  );

  const buttonClassName = useMemo(() => {
    const baseClasses = [
      "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF5B5B] to-[#FF7B5B] px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 w-full sm:w-auto relative h-12"
    ];
    
    if (isGenerating) {
      baseClasses.push("btn-generating");
    } else if (isFormReady) {
      baseClasses.push("animate-pulse saturate-150 shadow-[0_0_24px_rgba(255,91,91,0.45)]");
    } else {
      baseClasses.push("opacity-90");
    }
    
    return baseClasses.join(" ");
  }, [isFormReady, isGenerating]);

  return (
    <form
      className="relative flex flex-col gap-4 md:gap-6 rounded-xl md:rounded-3xl border border-[#ff4d4f]/12 bg-white/80 backdrop-blur-sm p-4 md:p-6 shadow-card transition-all duration-300"
      onSubmit={handleSubmit}
      id="form"
    >
      <div className="flex flex-col gap-2 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5">
        <label className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="category">
          Категория
        </label>
        <textarea
          id="category"
          className="w-full rounded-2xl border border-neutral-200 bg-white/90 px-4 py-3 text-base text-neutral-700 shadow-inner transition-all duration-300 focus:border-[#ff4d4f] focus:outline-none focus:ring-2 focus:ring-[#FF5B5B] placeholder:text-xs md:placeholder:text-sm placeholder:text-neutral-400 leading-tight min-h-[150px] resize-none"
          rows={5}
          placeholder='Введите категорию продукта: можно по официальной классификации, например «колбаса вареная», а можно в произвольной форме, например «фруктовое печенье», или  «батончик для спортивного питания», или  «готовый завтрак для детей», или «перекус в машину».'
          value={effectiveCategory}
          onChange={(event) => {
            const value = event.target.value;
            updateField("category", value);
            updateField("categoryCustom", value);
          }}
        />
      </div>

      <div className="flex flex-col gap-2 md:gap-3 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5">
        <label className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="productName">
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

      <div className="flex flex-col gap-2 md:gap-3 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5">
        <label className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="comment">
          Комментарий
        </label>
        <textarea
          id="comment"
          className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base text-neutral-700 shadow-inner transition-all duration-300 focus:border-[#ff4d4f] focus:outline-none focus:ring-2 focus:ring-[#ff4d4f]/30 placeholder:text-xs md:placeholder:text-sm placeholder:text-neutral-400 leading-tight min-h-[140px] resize-none"
          rows={5}
          placeholder='Введите любые пожелание, если есть, например: "Хочу вкусный мясной  батончик, который можно есть после спортзала для роста мышц" или "Хочу женский изысканный десерт на основе молока, который может заменить обед и который будет помещаться в дамскую сумочку без боязни испачкать или испортиться"'
          value={form.comment}
          onChange={(event) => updateField("comment", event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5">
        <label className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="temperature">
          Креативность
        </label>
        <p className="text-xs text-neutral-500">Задайте уровень креативности</p>
        <input
          id="temperature"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={form.temperature}
          onChange={(event) => updateField("temperature", Number(event.target.value) as FormState["temperature"])}
          className="accent-[#ff4d4f]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div id="audience-age" className="flex flex-col gap-3 md:gap-4 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5">
          <div>
            <h3 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600">Целевая аудитория</h3>
            <p className="text-xs text-neutral-500 mt-1">Возраст</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-2">
            {AGE_SEGMENTS.map((age) => (
              <label
                key={age}
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm whitespace-nowrap transition-all duration-300 ${
                  form.audience.age.has(age)
                    ? "border-[#FF5B5B] bg-[#FFE6E6] text-[#FF5B5B] font-semibold"
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
                {`${age} лет`}
              </label>
            ))}
          </div>
        </div>

        <div id="audience-gender" className="flex flex-col gap-3 md:gap-4 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5">
          <p className="text-xs text-neutral-500">Пол</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
            {GROUP_SEGMENTS.map((group) => (
              <label
                key={group}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm whitespace-nowrap transition-all duration-300 ${
                  form.audience.group.has(group)
                    ? "border-[#FF5B5B] bg-[#FFE6E6] text-[#FF5B5B] font-semibold"
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
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5">
        <label className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600" htmlFor="pain">
          Потребительская боль
        </label>
        <textarea
          id="pain"
          className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-base text-neutral-700 shadow-inner transition-all duration-300 focus:border-[#ff4d4f] focus:outline-none focus:ring-2 focus:ring-[#ff4d4f]/30"
          rows={3}
          placeholder="Опишите боль своего потребителя, если вы её знаете."
          value={form.pain}
          onChange={(event) => updateField("pain", event.target.value)}
        />
        <p className="text-xs text-neutral-500">Можете выбрать боль из подсказок.</p>
        <div id="pain-hints" className="flex flex-wrap gap-2" aria-label="Подсказки болей">
          {painHintsList.map((hint) => (
            <button
              key={hint}
              type="button"
              className="hint-chip"
              onClick={() => updateField("pain", hint)}
            >
              {hint}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-2">
        <button type="submit" id="btn-generate" className={buttonClassName} disabled={isGenerating}>
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <GeneratingIcons />
              <span>Создаём продукт…</span>
            </span>
          ) : (
            "Создать уникальный продукт"
          )}
        </button>
      </div>
    </form>
  );
}


