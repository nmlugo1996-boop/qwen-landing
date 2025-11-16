const el = (id) => document.getElementById(id);

const btnGen = el('btn-generate');
const btnDocx = el('download-docx');
const statusMsg = el('statusMsg');
const readyTag = el('readyTag');
const toastEl = el('toast');
const temperature = el('temperature');
const tempVal = el('temperatureVal');
const pain = el('pain');
const uniqueField = el('unique');
const productName = el('productName');
const categorySelect = el('category');
const categoryCustom = el('categoryCustom');
const diagBtn = el('btn-diag');
const diagStatus = el('diag-status');
const formEl = el('form');

const briefCard = el('brief-passport');
const fullCard = el('full-passport');
const fpContent = el('fp-content');

const bpFields = {
  category: el('bp-category'),
  name: el('bp-name'),
  audience: el('bp-audience'),
  pain: el('bp-pain'),
  uniq: el('bp-uniq')
};

let lastDraft = null;

const showToast = (msg, kind = 'info') => {
  if (!toastEl) return;
  const palette = {
    error: '#d24b4b',
    ok: '#23a26d',
    warn: '#eab308',
    info: '#111'
  };
  toastEl.textContent = msg;
  toastEl.style.background = palette[kind] || palette.info;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2200);
};

const ensureDocxState = (isLoading = false) => {
  if (!btnDocx) return;
  btnDocx.disabled = isLoading || !lastDraft;
};

const setStatusMessage = (message = '') => {
  if (statusMsg) statusMsg.textContent = message;
};

const resetBriefCard = () => {
  Object.values(bpFields).forEach((node) => {
    if (node) node.textContent = '—';
  });
};

const setLoadingState = (isLoading) => {
  if (!briefCard || !fullCard) return;
  briefCard.classList.toggle('loading', isLoading);
  if (isLoading) {
    resetBriefCard();
    fullCard.classList.add('hidden');
    if (fpContent) fpContent.innerHTML = '';
  }
};

const setLoading = (isLoading, message = '') => {
  if (btnGen) btnGen.disabled = isLoading;
  ensureDocxState(isLoading);
  setStatusMessage(message);
  setLoadingState(isLoading);
};

const setText = (id, value) => {
  const node = el(id);
  if (node) node.textContent = value;
};

const HINTS = {
  base: {
    pains: [
      'Скучный вкус — нет эмоции',
      'Недоверие к составу/качеству',
      'Неудобно брать с собой',
      'Слишком острый или пресный вкус',
      'Нет ощущения натуральности',
      'Не ассоциируется с заботой/домашней едой',
      'Сложно для детей — не вызывает интереса',
      'Быстро надоедает вкус',
      'Непривлекательная упаковка',
      'Отсутствует визуальная идентичность бренда'
    ],
    uniq: [
      'Продукт которого нет на рынке',
      'Первый в категории с эмоциональной подачей',
      'Создан на основе когнитивно-сенсорной методики',
      'Мягкий формат — новый код продукта',
      'Еда как игра (вовлечение)',
      'Чистый состав без добавок',
      'Продукт-друг для детей',
      'Новый вкус в классической категории',
      'Формат перекуса, а не основного блюда',
      'Продукт, вызывающий привязанность'
    ]
  },
  byCategory: {
    Паштет: {
      pains: [
        '«Фу»-текстура у детей',
        'Нет эмоции/игры',
        'Пачкается',
        'Сложно открыть',
        'Страх нового вкуса',
        'Однообразно',
        'Не выглядит аппетитно',
        'Недостаточно мягкий',
        'Путают с «взрослым» продуктом',
        'Нет маленьких порций'
      ],
      uniq: [
        'Текстура нежнее йогурта',
        'Мини-порции',
        'Игровая подача',
        'Чистый состав',
        'Персонаж-друг',
        'Лёгкий сливочный профиль',
        'Удобная порционная упаковка',
        'Вкус-настроение',
        'Прозрачная история происхождения',
        'Формат перекуса'
      ]
    },
    Копчёности: {
      pains: [
        'Тяжесть/послевкусие',
        'Слишком солёно',
        'Однообразие',
        'Сомнения к копчению',
        'Долго готовить',
        'Неподходит на каждый день',
        'Злоупотребление специями',
        'Нет «лёгкой» альтернативы',
        'Нет апгрейда вкуса',
        'Сложно сочетать'
      ],
      uniq: [
        'Лёгкое копчение',
        'Сбалансированная соль/жир',
        'Новый маринад/дым',
        'Готово-к-перекусу',
        'Особая подача',
        'Премиальные специи',
        'Контроль происхождения',
        'Понятный профиль нутриентов',
        'Новые форм-факторы',
        'Линейка вкусов'
      ]
    }
  },
  audienceMods: {
    Дети: {
      painsAdd: ['Страх нового вкуса', 'Не вовлекает в игру'],
      uniqAdd: ['Персонаж-друг', 'Обучающая механика']
    },
    Женщины: {
      painsAdd: ['Сомнения в чистоте состава'],
      uniqAdd: ['Чистый состав', 'Лёгкие калории']
    },
    Мужчины: {
      painsAdd: ['Не сытно/неудобно'],
      uniqAdd: ['Сытный формат', 'Простые правила выбора']
    }
  }
};

const dedup = (arr) => [...new Set(arr)].filter(Boolean);
const top10 = (arr) => dedup(arr).slice(0, 10);

const composeHints = (category, audience) => {
  const baseP = [...HINTS.base.pains];
  const baseU = [...HINTS.base.uniq];
  const catHints = HINTS.byCategory[category] || {};
  const pains = catHints.pains ? dedup([...catHints.pains, ...baseP]) : baseP;
  const uniq = catHints.uniq ? dedup([...catHints.uniq, ...baseU]) : baseU;
  const mod = HINTS.audienceMods[audience];
  if (mod) {
    if (mod.painsAdd) pains.push(...mod.painsAdd);
    if (mod.uniqAdd) uniq.push(...mod.uniqAdd);
  }
  return { pains: top10(pains), uniq: top10(uniq) };
};

const appendToField = (fieldId, text) => {
  const field = el(fieldId);
  if (!field || !text) return;
  const separator = field.tagName === 'TEXTAREA' ? '\n' : '; ';
  field.value = field.value ? `${field.value}${separator}${text}` : text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

const renderHintChips = (selector, list, onClick) => {
  const root = document.querySelector(selector);
  if (!root) return;
  root.innerHTML = '';
  list.forEach((text) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'hint';
    chip.textContent = text;
    chip.setAttribute('role', 'button');
    chip.addEventListener('click', () => onClick?.(text));
    root.appendChild(chip);
  });
};

const collectAudience = () => {
  const ages = [...document.querySelectorAll('input[name="age"]:checked')].map((input) => input.value);
  const groups = [...document.querySelectorAll('input[name="group"]:checked')].map((input) => input.value);
  return [...ages, ...groups];
};

const currentAudience = () => {
  const groups = [...document.querySelectorAll('input[name="group"]:checked')].map((input) => input.value);
  if (groups.includes('Дети')) return 'Дети';
  if (groups.includes('Мужчины')) return 'Мужчины';
  if (groups.includes('Женщины')) return 'Женщины';
  return 'Женщины';
};

const currentCategoryForHints = () => {
  if (!categorySelect) return '';
  if (categorySelect.value === 'Свой вариант…') {
    return categoryCustom?.value?.trim() || '';
  }
  return categorySelect.value || '';
};

const updateHintsUI = () => {
  const category = currentCategoryForHints();
  const audience = currentAudience();
  const { pains: painHints, uniq: uniqHints } = composeHints(category, audience);
  renderHintChips('#pains-hints', painHints, (txt) => appendToField('pain', txt));
  renderHintChips('#uniq-hints', uniqHints, (txt) => appendToField('unique', txt));
};

const collectPayload = () => {
  let category = categorySelect?.value?.trim() || '';
  if (category === 'Свой вариант…') {
    category = categoryCustom.value.trim();
  }
  if (!category) {
    throw new Error('Укажи категорию продукта');
  }

  const audience = collectAudience();
  const painText = pain.value.trim();
  const uniqueText = uniqueField.value.trim();

  return {
    category,
    name: productName.value.trim() || null,
    audience,
    pains: painText ? [painText] : [],
    uniqueness: uniqueText || null,
    temperature: Number(temperature.value)
  };
};

const updateReadyTag = () => {
  if (!readyTag) return;
  readyTag.textContent = 'Готово';
  readyTag.classList.add('is-ready');
};

const updateTemperatureLabel = () => {
  if (tempVal) {
    tempVal.textContent = Number(temperature.value).toFixed(1);
  }
};

const resetDraft = () => {
  lastDraft = null;
  ensureDocxState();
  if (fpContent) fpContent.innerHTML = '';
  fullCard?.classList.add('hidden');
};

const handleCategoryChange = () => {
  const useCustom = categorySelect.value === 'Свой вариант…';
  categoryCustom.hidden = !useCustom;
  categoryCustom.required = useCustom;
  if (!useCustom) {
    categoryCustom.value = '';
  }
  updateHintsUI();
};

const fillBrief = (draft) => {
  const header = draft?.header || {};
  setText('bp-category', header.category || draft?.category || '—');
  setText('bp-name', header.name || draft?.title || '—');
  const audienceValue = Array.isArray(header.audience) ? header.audience.join(', ') : header.audience;
  setText('bp-audience', audienceValue || (Array.isArray(draft?.audience) ? draft.audience.join(', ') : draft?.audience) || '—');
  setText('bp-pain', header.pain || (draft?.pains && draft.pains[0]) || '—');
  setText('bp-uniq', header.innovation || header.unique || draft?.uniqueness || '—');
  briefCard?.classList.remove('loading');
};

const fillFull = (draft) => {
  if (!fpContent) return;
  fpContent.innerHTML = '';
  const blocks = draft?.blocks || {};
  const order = [
    { key: 'cognitive', title: 'Когнитивный блок' },
    { key: 'sensory', title: 'Сенсорный блок' },
    { key: 'branding', title: 'Брендинговый блок' },
    { key: 'marketing', title: 'Маркетинговый блок' }
  ];

  let rendered = false;

  order.forEach((block) => {
    const rows = Array.isArray(blocks[block.key]) ? blocks[block.key] : [];
    if (!rows.length) return;
    rendered = true;
    const section = document.createElement('div');
    section.className = 'fp-section';
    const title = document.createElement('h3');
    title.textContent = block.title;
    section.appendChild(title);

    const table = document.createElement('table');
    table.className = 'fp-table';
    table.innerHTML = '<thead><tr><th>№</th><th>Вопрос</th><th>Ответ</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');
    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      const no = row?.no ?? index + 1;
      tr.innerHTML = `<td>${no}</td><td>${row?.question || ''}</td><td>${row?.answer || ''}</td>`;
      tbody.appendChild(tr);
    });

    section.appendChild(table);
    fpContent.appendChild(section);
  });

  if (!rendered) {
    const emptyState = document.createElement('div');
    emptyState.className = 'muted';
    emptyState.textContent = 'Ответы появятся после генерации.';
    fpContent.appendChild(emptyState);
  }

  fullCard?.classList.remove('hidden');
};

const requestGenerate = async () => {
  setLoading(true, 'Генерирую паспорт…');
  resetDraft();
  setLoadingState(true);
  if (fpContent) {
    fpContent.innerHTML = '<div class="spinner" role="status" aria-hidden="true"></div>';
  }

  let payload;
  try {
    payload = collectPayload();
  } catch (error) {
    showToast(error.message || 'Проверь форму', 'error');
    setLoading(false, 'Ошибка');
    setLoadingState(false);
    return;
  }

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form: payload })
    });

    const draft = await response.json();
    if (!response.ok) {
      throw new Error(draft?.error || `API ${response.status}`);
    }

    lastDraft = draft;
    fillBrief(draft);
    fillFull(draft);
    ensureDocxState();
    updateReadyTag();
    showToast('Готово', 'ok');
    setLoading(false, 'Готово');
    if (!productName.value.trim() && draft.title) {
      productName.value = draft.title;
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Ошибка генерации', 'error');
    setLoading(false, 'Ошибка');
    if (fpContent) {
      fpContent.innerHTML = `<div class="muted">Ошибка: ${error.message || 'неизвестно'}</div>`;
    }
  }
};

// DOCX download disabled: backend removed and button should be gone

const requestDiag = async () => {
  if (!diagStatus) return;
  diagStatus.textContent = 'проверяю…';
  try {
    const response = await fetch('/api/diag');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    diagStatus.textContent = data?.ok ? 'ок' : 'ошибка';
  } catch (error) {
    console.error(error);
    diagStatus.textContent = 'ошибка';
  }
};

if (btnGen) btnGen.addEventListener('click', requestGenerate);
// no DOCX handler
if (diagBtn) diagBtn.addEventListener('click', requestDiag);
if (temperature) temperature.addEventListener('input', updateTemperatureLabel);
if (categorySelect) categorySelect.addEventListener('change', handleCategoryChange);
if (categoryCustom) categoryCustom.addEventListener('input', updateHintsUI);

document.querySelectorAll('input[name="group"], input[name="age"]').forEach((input) => {
  input.addEventListener('change', updateHintsUI);
});

if (btnGen) {
  const icon = btnGen.querySelector('.btn-ico');
  const label = btnGen.querySelector('.btn-text');
  if (icon && label) {
    btnGen.innerHTML = '';
    btnGen.appendChild(icon);
    label.textContent = 'Создать уникальный продукт';
    btnGen.appendChild(label);
  } else if (btnGen) {
    btnGen.textContent = 'Создать уникальный продукт';
  }
}

updateTemperatureLabel();
handleCategoryChange();
updateHintsUI();
resetBriefCard();
ensureDocxState();

