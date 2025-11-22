"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

const CUSTOM_CATEGORY_OPTION = "Свой вариант…";

const painsByAge = {
  "2–7": [
    "Ребёнок боится новой еды и отказывается пробовать неизвестные продукты",
    "Родителям сложно найти полезный перекус без сахара и вредных добавок",
    "Малыши едят только сладкое и игнорируют полезную еду",
    "Еда должна быть «весёлой» или в форме персонажа, иначе ребёнок её не хочет",
    "Родители устают убеждать ребёнка поесть",
    "Ребёнок отвлекается и долго не ест без давления",
    "Слишком твёрдые продукты вызывают дискомфорт при жевании",
    "Дети боятся непривычной текстуры и запаха",
    "Родители переживают за аллергенность продуктов",
    "Еда быстро надоедает — нужен элемент игры"
  ],
  "8–18": [
    "Подростки выбирают вредные снеки вместо полезной еды",
    "Родители не доверяют составу готовой продукции",
    "Сложно подобрать перекус, который и полезный, и вкусный",
    "Подростку важно, чтобы еда выглядела «не по-детски»",
    "Школьники не хотят носить еду из дома — стесняются упаковки",
    "Сложно контролировать рацион в школе",
    "Подростки часто пропускают приёмы пищи",
    "Сильная зависимость от вкуса — если не идеально вкусно, просто не едят",
    "Подростки реагируют на моду и тренды в питании",
    "Высокий расход энергии — нужен питательный перекус"
  ],
  "18–25": [
    "Молодёжь выбирает быстрые вредные перекусы из-за нехватки времени",
    "Сложно найти полезную еду, которую удобно брать с собой",
    "Высокая чувствительность к цене",
    "Нужно что-то «модное», чтобы не стыдно было показывать",
    "Усталость и стресс провоцируют тягу к сладкому",
    "Нет привычки к здоровому питанию",
    "Низкий энергетический уровень при плохом рационе",
    "Перекусы заменяют полноценную еду",
    "Сложно контролировать баланс БЖУ",
    "Важно, чтобы продукт был «clean label» — понятный состав"
  ],
  "26–45": [
    "Постоянный дефицит времени: работа, семья, заботы",
    "Нужно правильное питание, но «надо быстро»",
    "Тревога за здоровье детей делает родителей требовательными к составу",
    "Сложно найти вкусное и полезное одновременно",
    "Люди устают постоянно готовить",
    "Перекусы часто заменяют обед",
    "Возрастные изменения требуют более здорового рациона",
    "Аллергии и непереносимости встречаются чаще",
    "Хочется меньше сахара — но не хочется жертвовать вкусом",
    "Важно, чтобы еда давала энергию, а не сонливость"
  ],
  "46–60": [
    "Проблемы с пищеварением требуют мягких и натуральных продуктов",
    "Снижение энергии — нужна еда, которая реально заряжает",
    "Рост чувствительности к сахару, соли и жирности",
    "Сложно найти вкусную, но здоровую альтернативу привычной еде",
    "Появляется страх покупать продукты с непонятным составом",
    "Важна польза для сердца, сосудов, ЖКТ",
    "Не хочется тратить много времени на готовку",
    "Возрастная смена вкусов — хочется более мягких и деликатных рецептов",
    "Не хочется переплачивать за бренд",
    "Хочется натуральное и «как дома»"
  ],
  "60+": [
    "Сложности с жеванием делают многие продукты недоступными",
    "Снижается аппетит — нужна еда, которая стимулирует желание поесть",
    "Риски аллергии становятся выше",
    "Важно поддерживать иммунитет и энергию",
    "Пищеварение становится чувствительным к грубой пище",
    "Людям тяжело понимать сложные составы",
    "Нужна еда, которую легко открывать и есть",
    "Сладкое хочется, но сахар нельзя",
    "Хочется простых, понятных вкусов",
    "Ограниченный бюджет"
  ],
  "80+": [
    "Очень низкий аппетит",
    "Сложности с жеванием и проглатыванием",
    "Нужна еда мягкая, кремовая, безопасная",
    "Организм сложно переваривает жирное и тяжёлое",
    "Нужна еда, которую можно есть понемногу",
    "Важна высокая питательность при маленьких порциях",
    "Сложно открывать упаковку",
    "Страх подавиться твёрдой едой",
    "Хочется мягких, тёплых, простых вкусов",
    "Нужно минимум ингредиентов — без химии"
  ]
};

type DiagnosticAnswer = "yes" | "no" | null;

const DIAGNOSTIC_SECTIONS = [
  {
    title: "Когнитивный блок",
    questions: [
      { id: "c1", text: "Хочу уточнить/скорректировать формулировку потребительской боли, на которой строится продукт" },
      { id: "c2", text: "Хочу увидеть описание нового рынка/сегмента/ниши и новой ценности, которую создаёт продукт" },
      { id: "c3", text: "Хочу увидеть описание новых привычек потребления нового продукта" },
      { id: "c4", text: "Хочу увидеть объяснительный нарратив для переобучения потребителей на новый продукт и привычки" },
      { id: "c5", text: "Хочу увидеть описание механики обучения потребителей" }
    ]
  },
  {
    title: "Сенсорный блок",
    questions: [
      { id: "s1", text: "Хочу увидеть описание уникального визуального образа" },
      { id: "s2", text: "Хочу увидеть описание уникального аудиального образа" },
      { id: "s3", text: "Хочу увидеть описание уникального обонятельного образа" },
      { id: "s4", text: "Хочу увидеть описание уникального осязательного образа" },
      { id: "s5", text: "Хочу увидеть описание уникального вкусового образа" }
    ]
  },
  {
    title: "Брендинговый блок",
    questions: [
      { id: "b1", text: "Хочу увидеть описание, как потребитель улучшает свой «набор историй» за счёт бренда" },
      { id: "b2", text: "Хочу увидеть описание контекста: какие внешние условия/тренды помогают, а какие мешают" },
      { id: "b3", text: "Хочу увидеть сильное ядро бренда: название, логотип, слоган, идея key visual" },
      { id: "b4", text: "Хочу увидеть описание уникального пути клиента и уникальных действий в важных точках пути" },
      { id: "b5", text: "Хочу увидеть описание развития стратегии бренда на 3–5–10 лет" }
    ]
  },
  {
    title: "Маркетинговый блок",
    questions: [
      { id: "m1", text: "Хочу видеть описание ключевых сегментов и позиционирование относительно конкурентов (таблица)" },
      { id: "m2", text: "Хочу увидеть описание идеи базового продукта и предложения по постепенному развитию продукта и линеек" },
      { id: "m3", text: "Хочу увидеть описание ценообразования продукта и линеек" },
      { id: "m4", text: "Хочу увидеть описание развития каналов продаж" },
      { id: "m5", text: "Хочу увидеть описание системы продвижения" }
    ]
  },
  {
    title: "Дополнительно",
    questions: [
      { id: "d1", text: "Хочу увидеть предложения по рецептуре, технологии и составу" },
      { id: "d2", text: "Хочу увидеть предложения по форм-факторам и упаковке" }
    ]
  }
] as const;

const createDiagnosticsState = (): Record<string, DiagnosticAnswer> => {
  const state: Record<string, DiagnosticAnswer> = {};
  DIAGNOSTIC_SECTIONS.forEach((section) => {
    section.questions.forEach((question) => {
      state[question.id] = null;
    });
  });
  return state;
};

const sanitizeDiagnostics = (source?: Record<string, DiagnosticAnswer | string | null>) => {
  const base = createDiagnosticsState();
  if (!source) return base;
  Object.entries(source).forEach(([key, value]) => {
    if (key in base) {
      base[key] = value === "yes" || value === "no" ? value : null;
    }
  });
  return base;
};

const AGE_SEGMENTS = ["2–7", "8–18", "18–25", "26–45", "46–60", "60+", "80+"];
const GROUP_SEGMENTS = ["Женщины", "Мужчины", "Неважно"];

type AudienceSets = {
  age: Set<string>;
  group: Set<string>;
};

type FormState = {
  category: string;
  categoryCustom: string;
  name: string;
  comment: string;
  uniqueness: string;
  temperature: number;
  pain: string;
  audience: AudienceSets;
  diagnostics: Record<string, DiagnosticAnswer>;
};

type DraftData = {
  header?: DraftHeader;
  comment?: string;
  temperature?: number;
  diagnostics?: Record<string, DiagnosticAnswer>;
  [key: string]: unknown;
};

type GeneratorFormProps = {
  onDraftGenerated?: (draft: DraftData) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  projectId?: string | null;
  initialDraft?: DraftData | null;
  onSubmitStart?: () => void;
};

type DraftHeader = {
  category?: string;
  name?: string;
  pain?: string;
  innovation?: string;
  unique?: string;
  audience?: string[] | string;
};

const showToast = (
  message: string,
  kind: "info" | "ok" | "warn" | "error" = "info"
) => {
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
  category: "",
  categoryCustom: "",
  name: "",
  comment: "",
  uniqueness: "",
  temperature: 0.7,
  pain: "",
  audience: {
    age: new Set<string>(),
    group: new Set<string>()
  },
  diagnostics: createDiagnosticsState()
});

function parseAudience(source: DraftHeader["audience"]): {
  age: Set<string>;
  group: Set<string>;
} {
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

export default function GeneratorForm({
  onDraftGenerated,
  onLoadingChange,
  projectId,
  initialDraft,
  onSubmitStart
}: GeneratorFormProps) {
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false);

  const [pains, setPains] = useState<string[]>([]);
  const [selectedPains, setSelectedPains] = useState<string[]>([]);

  useEffect(() => {
    if (!initialDraft) return;
    const header: DraftHeader = initialDraft?.header ?? {};
    const category = header?.category ?? "";
    const preparedCategory = category;
    const audience = parseAudience(header.audience);
    const rawUniqueness = initialDraft?.uniqueness;
    const uniqueness =
      typeof rawUniqueness === "string" ? rawUniqueness : header?.unique ?? "";
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
      uniqueness,
      temperature,
      pain: header?.pain ?? "",
      audience,
      diagnostics: sanitizeDiagnostics(initialDraft?.diagnostics)
    });
  }, [initialDraft]);

  const rawCategory = form.category;
  const trimmedCategory = rawCategory.trim();
  const audienceAge = useMemo(
    () => Array.from(form.audience.age),
    [form.audience.age]
  );
  const audienceGroups = useMemo(
    () => Array.from(form.audience.group),
    [form.audience.group]
  );
  const audienceDescription = useMemo(() => {
    const segments = [...audienceAge, ...audienceGroups];
    return segments.length ? segments.join(", ") : "";
  }, [audienceAge, audienceGroups]);

  useEffect(() => {
    const ready = Boolean(trimmedCategory) && Boolean(form.pain.trim());
    setIsFormReady(ready);
  }, [trimmedCategory, form.pain]);

  useEffect(() => {
    onLoadingChange?.(isGenerating);
  }, [isGenerating, onLoadingChange]);

  const updateField = useCallback(
    <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleAudience = useCallback(
    (type: keyof AudienceSets, value: string) => {
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
    },
    []
  );

  const handleDiagnosticAnswer = useCallback(
    (id: string, value: Exclude<DiagnosticAnswer, null>) => {
      setForm((prev) => {
        const nextValue = prev.diagnostics[id] === value ? null : value;
        return {
          ...prev,
          diagnostics: {
            ...prev.diagnostics,
            [id]: nextValue
          }
        };
      });
    },
    []
  );

  const handleGeneratePains = useCallback(() => {
    const selectedAge = audienceAge.length > 0 ? audienceAge[0] : null;
    
    if (!selectedAge) {
      setPains([]);
      setSelectedPains([]);
      return;
    }

    const ageKey = selectedAge.replace(/\sлет$/u, "");
    const painsForAge = painsByAge[ageKey as keyof typeof painsByAge] || [];
    
    setPains(painsForAge);
    setSelectedPains([]);
  }, [audienceAge]);

  const handleSelectPain = useCallback(
    (pain: string) => {
      updateField("pain", pain);
      setSelectedPains((prev) => {
        if (prev.includes(pain)) {
          return prev.filter((p) => p !== pain);
        }
        return [...prev, pain];
      });
    },
    [updateField]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const categoryValue = trimmedCategory;
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
      onSubmitStart?.();

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
            diagnostics: form.diagnostics,
            projectId: projectId || undefined
          })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error?.error || `API ${response.status}`);
        }

        const draft = await response.json();
        onDraftGenerated?.(draft);
        showToast(
          "Готово! Ниже можете посмотреть и скачать полный паспорт продукта!",
          "ok"
        );
      } catch (error) {
        console.error(error);
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось сгенерировать паспорт";
        showToast(message, "error");
      } finally {
        setIsGenerating(false);
      }
    },
    [
      audienceAge,
      audienceGroups,
      trimmedCategory,
      form.comment,
      form.name,
      form.pain,
      form.temperature,
      onDraftGenerated,
      projectId
    ]
  );

  const buttonClassName = useMemo(() => {
    const baseClasses = [
      "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF5B5B] to-[#FF7B5B] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 w-full sm:w-auto relative h-14"
    ];

    if (isGenerating) {
      baseClasses.push("btn-generating");
    } else if (isFormReady) {
      baseClasses.push(
        "animate-pulse saturate-150 shadow-[0_0_24px_rgba(255,91,91,0.45)]"
      );
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
        <label
          className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600"
          htmlFor="category"
        >
          Категория
        </label>
        <textarea
          id="category"
          className="w-full rounded-2xl border border-neutral-200 bg-white/90 px-4 py-3 text-base text-neutral-700 shadow-inner transition-all duration-300 focus:border-[#ff4d4f] focus:outline-none focus:ring-2 focus:ring-[#FF5B5B] placeholder:text-xs md:placeholder:text-sm placeholder:text-neutral-400 leading-tight min-h-[150px] resize-none"
          rows={5}
          placeholder='Введите категорию продукта: можно по официальной классификации, например «колбаса вареная», а можно в произвольной форме, например «фруктовое печенье», или  «батончик для спортивного питания», или  «готовый завтрак для детей», или «перекус в машину».'
          value={rawCategory}
          onChange={(event) => {
            const value = event.target.value;
            updateField("category", value);
            updateField("categoryCustom", value);
          }}
        />
      </div>

      <div className="flex flex-col gap-2 md:gap-3 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5">
        <label
          className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600"
          htmlFor="productName"
        >
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
        <label
          className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600"
          htmlFor="comment"
        >
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
        <label
          className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600"
          htmlFor="temperature"
        >
          Креативность
        </label>
        <p className="text-xs text-neutral-500">
          Задайте уровень креативности
        </p>
        <input
          id="temperature"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={form.temperature}
          onChange={(event) =>
            updateField(
              "temperature",
              Number(event.target.value) as FormState["temperature"]
            )
          }
          className="accent-[#ff4d4f]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div
          id="audience-age"
          className="flex flex-col gap-3 md:gap-4 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5"
        >
          <div>
            <h3 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600">
              Целевая аудитория
            </h3>
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

        <div
          id="audience-gender"
          className="flex flex-col gap-3 md:gap-4 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5"
        >
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

      <div className="bg-white/90 rounded-3xl p-6 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-900">
              ПОТРЕБИТЕЛЬСКАЯ БОЛЬ
            </div>
            <div className="text-xs text-gray-500">
              Можно ввести свою формулировку или сгенерировать варианты на основе данных выше.
            </div>
          </div>
          <button
            type="button"
            onClick={handleGeneratePains}
            className="inline-flex items-center justify-center px-5 py-2 rounded-full text-sm font-semibold text-white shadow-md transition bg-red-500 hover:bg-red-600"
          >
            Показать боли
          </button>
        </div>

        <textarea
          className="mt-2 w-full min-h-[120px] rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 transition"
          placeholder="Опишите боль своего потребителя, если вы её знаете или выберите один из вариантов ниже."
          value={form.pain}
          onChange={(event) => updateField("pain", event.target.value)}
        />

        {/* Постоянный блок "Сгенерированные боли" */}
        <div className="mt-4 p-4 bg-white rounded-xl shadow-sm border">
          <h3 className="text-sm font-semibold mb-2">Сгенерированные боли</h3>
          {pains.length === 0 ? (
            <p className="text-sm text-gray-400">
              Выберите возраст и нажмите «Показать боли»
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {pains.map((item, idx) => {
                const isActive = selectedPains.includes(item);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPain(item)}
                    className={[
                      "w-full text-left text-[13px] leading-snug rounded-xl px-3 py-2 transition",
                      isActive
                        ? "bg-gradient-to-r from-[#FF5B5B] to-[#FF7B5B] text-white shadow-[0_8px_18px_rgba(255,91,91,0.35)]"
                        : "bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                    ].join(" ")}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-white/60 backdrop-blur-sm p-4 md:p-5">
        <div>
          <h3 className="text-xs md:text-sm font-semibold uppercase tracking-wide text-neutral-600">
            ПОЖЕЛАНИЯ К НОВОМУ ПРОДУКТУ
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Отметьте, какие секции особенно важны для вас — это поможет сделать паспорт точнее.
          </p>
        </div>
        <div className="space-y-6">
          {DIAGNOSTIC_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-3">
              <h4 className="text-sm font-semibold text-neutral-600">
                {section.title}
              </h4>
              <div className="space-y-3">
                {section.questions.map((question) => (
                  <div
                    key={question.id}
                    className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white/70 p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <p className="text-sm text-neutral-700">{question.text}</p>
                    <div className="flex items-center gap-2">
                      {(["yes", "no"] as const).map((option) => {
                        const isActive =
                          form.diagnostics[question.id] === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                              isActive
                                ? "bg-[#FF5B5B] text-white shadow-[0_10px_20px_rgba(255,91,91,0.35)]"
                                : "border border-neutral-200 bg-white/80 text-neutral-600 hover:border-[#ff4d4f]/60 hover:text-[#ff4d4f]"
                            }`}
                            onClick={() =>
                              handleDiagnosticAnswer(question.id, option)
                            }
                          >
                            {option === "yes" ? "Да" : "Нет"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 mt-2">
        <div className="w-full flex justify-center">
          <button
            type="submit"
            id="btn-generate"
            className={buttonClassName}
            disabled={isGenerating}
          >
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
      </div>
    </form>
  );
}
