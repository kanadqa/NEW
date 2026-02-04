const loadCapitalV2 = async () => {
  try {
    const raw = await dbGet(CAPITAL_KEY_V2);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("Не удалось загрузить капитал", error);
  }
  return null;
};

const saveCapitalV2 = (nextState) => {
  dbSet(CAPITAL_KEY_V2, JSON.stringify(nextState));
};

const loadCapitalV1 = async () => {
  try {
    const raw = await dbGet(CAPITAL_KEY_V1);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Не удалось загрузить капитал (v1)", error);
    return null;
  }
};

const migrateCapitalState = async () => {
  const existing = await loadCapitalV2();
  if (existing) {
    return existing;
  }

  const migratedFlag = await dbGet(CAPITAL_MIGRATED_KEY);
  const legacy = await loadCapitalV1();
  const baseState = {
    assets: [],
    debts: [],
    goals: [],
    snapshots: [],
    settings: {
      baseCurrency: "RUB",
      fxRates: {},
    },
  };

  if (!legacy || migratedFlag) {
    saveCapitalV2(baseState);
    dbSet(CAPITAL_MIGRATED_KEY, "true");
    return baseState;
  }

  const now = new Date().toISOString();
  const mappedAssets = (legacy.assets || []).map((item) => ({
    id: (crypto.randomUUID?.() || `asset-${Date.now()}-${Math.random()}`),
    name: item.name,
    type: "bank",
    currency: "RUB",
    amount: item.amount,
    invested: item.amount,
    section: item.type === "deposit" ? "Вклады" : "В наличии",
    liquidity: "high",
    liquidityDays: null,
    expectedProfit: item.type === "deposit" ? 0 : null,
    maturityDate: item.type === "deposit" ? (item.unlockDate || "") : "",
    institution: "",
    note: item.note || "",
    updatedAt: now,
  }));
  const mappedDebts = (legacy.debts || []).map((item) => ({
    id: (crypto.randomUUID?.() || `debt-${Date.now()}-${Math.random()}`),
    name: item.name,
    type: "loan",
    currency: "RUB",
    principal: item.amount,
    apr: null,
    paymentMin: null,
    dueDay: null,
    note: item.note || "",
    updatedAt: now,
  }));
  const mappedGoals = (legacy.goals || []).map((item) => ({
    id: (crypto.randomUUID?.() || `goal-${Date.now()}-${Math.random()}`),
    name: `Цель ${item.year}`,
    kind: "netWorth",
    targetAmount: item.target,
    targetDate: `${item.year}-12`,
    baselineAmount: item.actual ?? null,
    note: "",
  }));
  const mappedSnapshots = (legacy.history || []).map((item, index, list) => {
    const prev = list[index - 1];
    const delta = prev ? item.total - prev.total : 0;
    return {
      month: item.month,
      assetsTotal: item.total,
      debtsTotal: 0,
      netWorth: item.total,
      delta,
      note: "",
    };
  });

  const migrated = {
    ...baseState,
    assets: mappedAssets,
    debts: mappedDebts,
    goals: mappedGoals,
    snapshots: mappedSnapshots,
  };
  saveCapitalV2(migrated);
  dbSet(CAPITAL_MIGRATED_KEY, "true");
  return migrated;
};

const saveCategories = (nextCategories) => {
  dbSet(CATEGORY_KEY, JSON.stringify(nextCategories));
};

let transactions = [];
let categories = [];
let historyStack = [];
let showAllSubcategories = false;
let showAllExpenseCategories = false;
let categoryFilter = "all";
let reportGranularity = "daily";
let reportRange = { start: "", end: "" };
let capitalState = null;
let capitalOverviewFilter = "all";
let capitalEditingAssetId = null;

const capitalIsUnconvertible = (asset) =>
  asset.currency !== capitalState?.settings?.baseCurrency
  && !capitalState?.settings?.fxRates?.[asset.currency];

const normalizeCapitalState = () => {
  if (!capitalState) {
    return;
  }
  capitalState.settings = capitalState.settings || { baseCurrency: "RUB", fxRates: {} };
  capitalState.settings.baseCurrency = capitalState.settings.baseCurrency || "RUB";
  capitalState.settings.fxRates = capitalState.settings.fxRates || {};
  if (!capitalState.assetCategories) {
    capitalState.assetCategories = [];
  }
  if (!Array.isArray(capitalState.assetCategories)) {
    capitalState.assetCategories = Object.entries(capitalState.assetCategories).map(([name, subs]) => ({
      name,
      subs: Array.isArray(subs) ? subs : [],
    }));
  }
  capitalState.assets = (capitalState.assets || []).map((asset) => {
    const isDeposit = asset.type === "deposit";
    const maturityDate = asset.maturityDate || (isDeposit ? asset.unlockDate : "") || "";
    const liquidity = maturityDate ? "locked" : (asset.liquidity || "high");
    const categoryFallback = asset.section || (isDeposit ? "Вклады" : "В наличии");
    return {
      section: asset.section || (isDeposit ? "Вклады" : "В наличии"),
      category: asset.category || categoryFallback,
      subcategory: asset.subcategory || "",
      invested: asset.invested ?? asset.amount ?? 0,
      liquidity,
      liquidityDays: asset.liquidityDays ?? null,
      expectedProfit: isDeposit ? (asset.expectedProfit ?? null) : null,
      maturityDate,
      unconvertible: asset.unconvertible ?? false,
      ...asset,
    };
  });
  capitalState.assets = capitalState.assets.map((asset) => ({
    ...asset,
    unconvertible: capitalIsUnconvertible(asset),
  }));
  if (!capitalState.assetCategories.length) {
    const categoryMap = new Map();
    capitalState.assets.forEach((asset) => {
      const name = asset.category || asset.section || "В наличии";
      if (!categoryMap.has(name)) {
        categoryMap.set(name, new Set());
      }
      if (asset.subcategory) {
        categoryMap.get(name).add(asset.subcategory);
      }
    });
    capitalState.assetCategories = [...categoryMap.entries()].map(([name, subs]) => ({
      name,
      subs: [...subs],
    }));
  }
  capitalState.debts = capitalState.debts || [];
  capitalState.goals = capitalState.goals || [];
  capitalState.snapshots = capitalState.snapshots || [];
};

normalizeCapitalState();

const pushHistory = () => {
  historyStack.push({
    transactions: JSON.parse(JSON.stringify(transactions)),
    categories: JSON.parse(JSON.stringify(categories)),
  });
  if (historyStack.length > 20) {
    historyStack.shift();
  }
  updateUndoState();
};

const undoLastAction = () => {
  const previous = historyStack.pop();
  if (!previous) {
    return;
  }
  transactions = previous.transactions;
  categories = previous.categories;
  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  saveCategories(categories);
  renderCategories();
  render();
  updateUndoState();
};

const updateUndoState = () => {
  undoButton.disabled = historyStack.length === 0;
};

const updateSummary = () => {
  const totals = transactions.reduce(
    (acc, item) => {
      if (item.type === "income") {
        acc.income += item.amount;
      } else {
        acc.expense += item.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  totalIncomeEl.textContent = currencyFormatter.format(totals.income);
  totalExpenseEl.textContent = currencyFormatter.format(totals.expense);
  balanceEl.textContent = currencyFormatter.format(totals.income - totals.expense);
  const percent = totals.income > 0 ? (totals.expense / totals.income) * 100 : 0;
  expensePercentEl.textContent = `${percent.toFixed(1)}% от доходов`;
};

const renderTable = () => {
  tableBody.innerHTML = "";

  if (transactions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "Пока нет операций. Добавьте первую запись.";
    cell.classList.add("hint");
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.date}</td>
        <td><span class="tag ${item.type}">${formatType(item.type)}</span></td>
        <td>${item.category}</td>
        <td>${item.subcategory || "—"}</td>
        <td>${currencyFormatter.format(item.amount)}</td>
        <td>${item.note || "—"}</td>
        <td><button class="button secondary" data-index="${index}">Удалить</button></td>
      `;
      tableBody.appendChild(row);
    });
};

const buildTotals = (filterType, source = transactions) => {
  return source
    .filter((item) => (filterType ? item.type === filterType : true))
    .reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
        return acc;
      },
      {}
    );
};

const buildSubTotals = (type, source = transactions) => {
  return source
    .filter((item) => item.type === type && item.subcategory)
    .reduce(
      (acc, item) => {
        const key = `${item.category} · ${item.subcategory}`;
        acc[key] = (acc[key] || 0) + item.amount;
        return acc;
      },
      {}
    );
};

const renderChart = (container, totals, emptyText, options = {}) => {
  container.innerHTML = "";
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const formatter = options.formatter || currencyFormatter;

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  const visibleEntries = options.limit ? entries.slice(0, options.limit) : entries;
  const maxValue = visibleEntries[0][1];
  visibleEntries.forEach(([label, value], index) => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const legend = document.createElement("div");
    legend.className = "chart-legend";

    const swatch = document.createElement("span");
    swatch.className = "chart-swatch";
    swatch.style.background = palette[index % palette.length];

    const name = document.createElement("span");
    name.textContent = label;

    legend.appendChild(swatch);
    legend.appendChild(name);

    const barWrapper = document.createElement("div");
    barWrapper.className = "chart-bar";

    const bar = document.createElement("span");
    bar.style.width = `${Math.max((value / maxValue) * 100, 6)}%`;
    bar.style.background = palette[index % palette.length];
    barWrapper.appendChild(bar);

    const amount = document.createElement("strong");
    amount.textContent = formatter.format(value);

    row.appendChild(legend);
    row.appendChild(barWrapper);
    row.appendChild(amount);
    container.appendChild(row);
  });

  if (options.limit && entries.length > options.limit) {
    const note = document.createElement("p");
    note.className = "hint";
    note.textContent = `Показано ${options.limit} из ${entries.length}.`;
    container.appendChild(note);
  }
};

const buildPie = (totals) => {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total === 0) {
    return { entries: [], total };
  }
  return { entries, total };
};

const renderPie = (container, totals, emptyText) => {
  container.innerHTML = "";
  const { entries, total } = buildPie(totals);

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  const chart = document.createElement("div");
  chart.className = "pie-chart";

  const visual = document.createElement("div");
  visual.className = "pie-visual";

  const ring = document.createElement("div");
  ring.className = "pie-ring";

  let cumulative = 0;
  const segments = entries
    .map(([, value], index) => {
      const start = cumulative;
      const portion = (value / total) * 100;
      cumulative += portion;
      return `${palette[index % palette.length]} ${start}% ${cumulative}%`;
    })
    .join(", ");

  ring.style.background = `conic-gradient(${segments})`;

  const totalLabel = document.createElement("div");
  totalLabel.className = "pie-total";
  totalLabel.innerHTML = `<span>Итого</span><strong>${currencyFormatter.format(total)}</strong>`;

  visual.appendChild(ring);
  visual.appendChild(totalLabel);

  const legend = document.createElement("div");
  legend.className = "pie-legend";

  entries.forEach(([label, value], index) => {
    const item = document.createElement("div");
    item.className = "pie-legend-item";

    const swatch = document.createElement("span");
    swatch.className = "pie-swatch";
    swatch.style.background = palette[index % palette.length];

    const text = document.createElement("div");
    text.innerHTML = `<strong>${label}</strong><span>${currencyFormatter.format(value)}</span>`;

    item.appendChild(swatch);
    item.appendChild(text);
    legend.appendChild(item);
  });

  chart.appendChild(visual);
  chart.appendChild(legend);
  container.appendChild(chart);
};

const renderLineChart = (target, data) => {
  target.innerHTML = "";

  if (data.length === 0) {
    target.innerHTML = "<text x='50%' y='50%' text-anchor='middle' fill='#94a3b8'>Нет данных</text>";
    return;
  }

  const width = 720;
  const height = 260;
  const paddingX = 56;
  const paddingY = 28;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const maxValue = Math.max(
    ...data.map((item) => Math.max(item.income, item.expense, 0)),
    1
  );

  const scaleX = (index) =>
    paddingX + (chartWidth * index) / Math.max(data.length - 1, 1);
  const scaleY = (value) => paddingY + chartHeight - (value / maxValue) * chartHeight;

  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("x", paddingX - 8);
  background.setAttribute("y", paddingY - 8);
  background.setAttribute("width", chartWidth + 16);
  background.setAttribute("height", chartHeight + 16);
  background.setAttribute("fill", "#f8fafc");
  background.setAttribute("rx", "16");

  const drawLine = (values, color) => {
    const points = values
      .map((value, index) => `${scaleX(index)},${scaleY(value)}`)
      .join(" ");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.setAttribute("points", points);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "3.5");
    line.setAttribute("stroke-linecap", "round");
    return line;
  };

  const drawArea = (values, color) => {
    const points = values.map((value, index) => ({
      x: scaleX(index),
      y: scaleY(value),
    }));
    const baseY = paddingY + chartHeight;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = [
      `M ${points[0].x} ${baseY}`,
      `L ${points[0].x} ${points[0].y}`,
      ...points.slice(1).map((pt) => `L ${pt.x} ${pt.y}`),
      `L ${points[points.length - 1].x} ${baseY}`,
      "Z",
    ].join(" ");
    path.setAttribute("d", d);
    path.setAttribute("fill", color);
    path.setAttribute("opacity", "0.12");
    return path;
  };

  const drawPoints = (values, color) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    values.forEach((value, index) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", scaleX(index));
      circle.setAttribute("cy", scaleY(value));
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", "#fff");
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", "2");
      group.appendChild(circle);
    });
    return group;
  };

  const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
  for (let i = 0; i <= 4; i += 1) {
    const y = paddingY + (chartHeight * i) / 4;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", paddingX);
    line.setAttribute("x2", width - paddingX);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#e2e8f0");
    line.setAttribute("stroke-dasharray", "4 4");
    grid.appendChild(line);
  }

  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "g");
  [maxValue, maxValue / 2, 0].forEach((value, index) => {
    const y = paddingY + (chartHeight * index) / 2;
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", paddingX - 12);
    label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("fill", "#94a3b8");
    label.setAttribute("font-size", "10");
    label.textContent = currencyFormatter.format(value).replace(",00", "");
    yAxis.appendChild(label);
  });

  const axis = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const labelStep = Math.max(1, Math.floor(data.length / 6));
  data.forEach((item, index) => {
    if (index % labelStep !== 0 && index !== data.length - 1) {
      return;
    }
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", scaleX(index));
    label.setAttribute("y", height - 8);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "#94a3b8");
    label.setAttribute("font-size", "10");
    label.textContent = item.label;
    axis.appendChild(label);
  });

  const incomeArea = drawArea(data.map((item) => item.income), "#16a34a");
  const expenseArea = drawArea(data.map((item) => item.expense), "#ea580c");
  const incomeLine = drawLine(data.map((item) => item.income), "#16a34a");
  const expenseLine = drawLine(data.map((item) => item.expense), "#ea580c");
  const incomePoints = drawPoints(data.map((item) => item.income), "#16a34a");
  const expensePoints = drawPoints(data.map((item) => item.expense), "#ea580c");

  target.appendChild(background);
  target.appendChild(grid);
  target.appendChild(yAxis);
  target.appendChild(axis);
  target.appendChild(incomeArea);
  target.appendChild(expenseArea);
  target.appendChild(incomeLine);
  target.appendChild(expenseLine);
  target.appendChild(incomePoints);
  target.appendChild(expensePoints);
};

const buildSeries = (formatter, source = transactions) => {
  const dataMap = {};
  source.forEach((item) => {
    const key = formatter(item.date);
    if (!dataMap[key]) {
      dataMap[key] = { income: 0, expense: 0 };
    }
    dataMap[key][item.type] += item.amount;
  });

  return Object.keys(dataMap)
    .sort()
    .map((label) => ({ label, ...dataMap[label] }));
};

const syncToggleButton = (button, isExpanded, canExpand) => {
  if (!button) {
    return;
  }
  if (!canExpand) {
    button.classList.add("is-hidden");
    button.disabled = true;
  } else {
    button.classList.remove("is-hidden");
    button.disabled = false;
  }
  button.textContent = isExpanded ? "Скрыть" : "Показать все";
};

const renderCharts = () => {
  const incomeSubcategoryTotals = buildSubTotals("income");
  const expenseCategoryTotals = buildTotals("expense");
  const expenseSubcategoryTotals = buildSubTotals("expense");
  const canExpandExpenseCategories =
    Object.keys(expenseCategoryTotals).length > CHART_LIMIT;
  const canExpandExpenseSubcategories =
    Object.keys(expenseSubcategoryTotals).length > CHART_LIMIT;

  if (!canExpandExpenseCategories) {
    showAllExpenseCategories = false;
  }
  if (!canExpandExpenseSubcategories) {
    showAllSubcategories = false;
  }

  renderChart(
    incomeSubcategoryChart,
    incomeSubcategoryTotals,
    "Добавьте доходы с подкатегориями, чтобы увидеть диаграмму.",
    { limit: CHART_LIMIT }
  );
  renderChart(
    expenseCategoryChart,
    expenseCategoryTotals,
    "Добавьте расходы, чтобы увидеть диаграмму.",
    { limit: showAllExpenseCategories ? null : CHART_LIMIT }
  );
  renderChart(
    expenseSubcategoryChart,
    expenseSubcategoryTotals,
    "Добавьте расходы с подкатегориями, чтобы увидеть детализацию.",
    { limit: showAllSubcategories ? null : CHART_LIMIT }
  );
  renderPie(
    expensePie,
    expenseCategoryTotals,
    "Добавьте расходы, чтобы увидеть диаграмму."
  );
  renderPie(
    expenseSubcategoryPie,
    expenseSubcategoryTotals,
    "Добавьте расходы с подкатегориями, чтобы увидеть диаграмму."
  );
  renderPie(
    incomePie,
    incomeSubcategoryTotals,
    "Добавьте доходы с подкатегориями, чтобы увидеть диаграмму."
  );

  syncToggleButton(toggleExpenseCategoryButton, showAllExpenseCategories, canExpandExpenseCategories);
  syncToggleButton(toggleSubcategoryButton, showAllSubcategories, canExpandExpenseSubcategories);
};

const getCategoryNames = (type) =>
  Object.keys(categories).filter((name) => (type ? categories[name].type === type : true));

const renderCategoryOptions = () => {
  const activeType = document.getElementById("type").value;
  const options = getCategoryNames(activeType).sort();

  categorySelect.innerHTML = "";

  options.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  });

  if (!categorySelect.value && options.length > 0) {
    categorySelect.value = options[0];
  }
  updateSubcategoryOptions(categorySelect.value);
};

const renderCategoryListOptions = () => {
  const activeType = categoryTypeSelect.value;
  const names = getCategoryNames(activeType).sort();
  categoryList.innerHTML = "";
  names.forEach((name) => {
    const listOption = document.createElement("option");
    listOption.value = name;
    categoryList.appendChild(listOption);
  });
};

const renderCategories = () => {
  renderCategoryOptions();
  renderCategoryListOptions();
  renderCategoryManager();
};

const updateSubcategoryOptions = (categoryName) => {
  subcategorySelect.innerHTML = "";
  if (!categoryName || !categories[categoryName]) {
    subcategorySelect.disabled = true;
    return;
  }
  const subs = categories[categoryName].subs || [];
  if (subs.length === 0) {
    subcategorySelect.disabled = true;
    return;
  }
  subcategorySelect.disabled = false;
  subs.forEach((sub) => {
    const option = document.createElement("option");
    option.value = sub;
    option.textContent = sub;
    subcategorySelect.appendChild(option);
  });
};

const getDateBounds = (items) => {
  if (!items.length) {
    return { start: "", end: "" };
  }
  const dates = items.map((item) => item.date).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
};

const clampReportRange = (start, end) => {
  if (!start || !end) {
    return { start, end };
  }
  return start > end ? { start: end, end: start } : { start, end };
};

const setReportRange = (start, end) => {
  const clamped = clampReportRange(start, end);
  reportRange = clamped;
  reportStartInput.value = clamped.start || "";
  reportEndInput.value = clamped.end || "";
};

const filterTransactionsByRange = (items) => {
  const { start, end } = reportRange;
  if (!start && !end) {
    return items;
  }
  return items.filter((item) => {
    if (start && item.date < start) {
      return false;
    }
    if (end && item.date > end) {
      return false;
    }
    return true;
  });
};

const renderReports = () => {
  const filtered = filterTransactionsByRange(transactions);
  const totals = filtered.reduce(
    (acc, item) => {
      if (item.type === "income") {
        acc.income += item.amount;
      } else {
        acc.expense += item.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  reportIncomeEl.textContent = currencyFormatter.format(totals.income);
  reportExpenseEl.textContent = currencyFormatter.format(totals.expense);
  reportBalanceEl.textContent = currencyFormatter.format(totals.income - totals.expense);
  reportTransactionsCountEl.textContent = filtered.length;

  const expenseCategoryTotals = buildTotals("expense", filtered);
  const expenseSubcategoryTotals = buildSubTotals("expense", filtered);
  const incomeSubcategoryTotals = buildSubTotals("income", filtered);

  renderChart(
    reportExpenseCategories,
    expenseCategoryTotals,
    "Нет расходов за выбранный период.",
    { limit: 8 }
  );
  renderChart(
    reportExpenseSubcategories,
    expenseSubcategoryTotals,
    "Нет расходов с подкатегориями за выбранный период.",
    { limit: 8 }
  );
  renderChart(
    reportIncomeSubcategories,
    incomeSubcategoryTotals,
    "Нет доходов с подкатегориями за выбранный период.",
    { limit: 8 }
  );

  const seriesFormatter = reportGranularity === "monthly"
    ? (date) => date.slice(0, 7)
    : (date) => date;
  renderLineChart(reportLineChart, buildSeries(seriesFormatter, filtered));
};

const capitalFormatMoney = (value) => {
  const formatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: capitalState.settings.baseCurrency,
    minimumFractionDigits: 2,
  });
  return formatter.format(value);
};

const capitalFormatShort = (value) =>
  capitalFormatMoney(value).replace(",00", "");

const capitalNowIso = () => new Date().toISOString();

const capitalGenerateId = (prefix) =>
  (crypto.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random()}`);

const capitalMonthKey = () => new Date().toISOString().slice(0, 7);

const capitalToBase = (value, currency) => {
  if (currency === capitalState.settings.baseCurrency) {
    return value;
  }
  const rate = capitalState.settings.fxRates[currency];
  if (!rate) {
    return null;
  }
  return value * rate;
};

const capitalFxEndpoint = "https://api.exchangerate.host";

const capitalFetchRate = async (base, currency) => {
  const url = `${capitalFxEndpoint}/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(currency)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("FX fetch failed");
  }
  const data = await response.json();
  const rate = data?.rates?.[currency];
  if (!rate) {
    throw new Error("No rate");
  }
  return rate;
};

const capitalFetchSeries = async (base, currency) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const url = `${capitalFxEndpoint}/timeseries?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(currency)}&start_date=${startDate}&end_date=${endDate}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("FX series fetch failed");
  }
  const data = await response.json();
  const entries = Object.entries(data?.rates || {}).sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([date, rates]) => ({ date, value: rates[currency] })).filter((item) => item.value);
};

const renderFxChart = (series) => {
  if (!capitalFxChart) {
    return;
  }
  capitalFxChart.innerHTML = "";
  if (!series.length) {
    return;
  }
  const values = series.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 360;
  const height = 120;
  const pad = 12;
  const scaleX = (index) => pad + (index / (series.length - 1 || 1)) * (width - pad * 2);
  const scaleY = (value) => {
    if (max === min) {
      return height / 2;
    }
    const ratio = (value - min) / (max - min);
    return height - pad - ratio * (height - pad * 2);
  };
  const path = series
    .map((item, index) => `${index === 0 ? "M" : "L"}${scaleX(index)},${scaleY(item.value)}`)
    .join(" ");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", path);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#2563eb");
  line.setAttribute("stroke-width", "2");
  const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
  area.setAttribute("d", `${path} L${scaleX(series.length - 1)},${height - pad} L${scaleX(0)},${height - pad} Z`);
  area.setAttribute("fill", "rgba(37, 99, 235, 0.12)");
  capitalFxChart.appendChild(area);
  capitalFxChart.appendChild(line);
};

const refreshFxRate = async () => {
  if (!capitalBaseCurrency || !capitalFxCurrency) {
    return;
  }
  const base = capitalBaseCurrency.value.trim().toUpperCase() || "RUB";
  const currency = capitalFxCurrency.value.trim().toUpperCase();
  if (!currency || currency === base) {
    capitalFxRateValue.textContent = "—";
    capitalFxUpdated.textContent = "";
    capitalFxNote.textContent = "";
    renderFxChart([]);
    return;
  }
  capitalFxNote.textContent = "Загружаем курс...";
  try {
    const rate = await capitalFetchRate(base, currency);
    capitalState.settings.baseCurrency = base;
    capitalState.settings.fxRates[currency] = rate;
    saveCapitalV2(capitalState);
    capitalFxRateValue.textContent = rate.toFixed(4);
    capitalFxUpdated.textContent = `на ${new Date().toLocaleDateString("ru-RU")}`;
    capitalFxNote.textContent = "";
    const series = await capitalFetchSeries(base, currency);
    renderFxChart(series);
    renderCapitalView();
  } catch (error) {
    capitalFxNote.textContent = "Не удалось обновить курс. Проверьте соединение.";
  }
};

const ensureFxRateForCurrency = async (currency) => {
  const base = capitalState.settings.baseCurrency;
  const normalized = currency.trim().toUpperCase();
  if (!normalized || normalized === base) {
    return;
  }
  if (capitalState.settings.fxRates[normalized]) {
    return;
  }
  try {
    const rate = await capitalFetchRate(base, normalized);
    capitalState.settings.fxRates[normalized] = rate;
    saveCapitalV2(capitalState);
  } catch (error) {
    // silent: rate can be missing
  }
};

const capitalTotals = () => {
  const missingRates = [];
  const assetsTotal = capitalState.assets.reduce((sum, item) => {
    const converted = capitalToBase(item.amount, item.currency);
    if (converted == null && capitalIsUnconvertible(item)) {
      missingRates.push(item.currency);
      return sum;
    }
    return sum + (converted ?? item.amount);
  }, 0);
  const debtsTotal = capitalState.debts.reduce((sum, item) => {
    const converted = capitalToBase(item.principal, item.currency);
    if (converted == null && item.currency !== capitalState.settings.baseCurrency) {
      missingRates.push(item.currency);
      return sum;
    }
    return sum + (converted ?? item.principal);
  }, 0);
  return { assetsTotal, debtsTotal, netWorth: assetsTotal - debtsTotal, missingRates };
};

const capitalTypeLabel = (type) => ({
  cash: "Наличные",
  bank: "Банк",
  deposit: "Вклад",
  investment: "Инвестиции",
  real_estate: "Недвижимость",
  other: "Другое",
}[type] || type);

const capitalLiquidityLabel = (value) => ({
  high: "Можно вывести сразу",
  medium: "Нужно 1–3 дня",
  low: "Сложно/долго вывести",
  locked: "Заблокировано до даты",
}[value] || value);

const capitalDebtTypeLabel = (value) => ({
  credit_card: "Кредитная карта",
  loan: "Кредит",
  mortgage: "Ипотека",
  personal: "Личный долг",
  other: "Другое",
}[value] || value);

const capitalEnsureSnapshot = () => {
  const month = capitalMonthKey();
  const existing = capitalState.snapshots.find((item) => item.month === month);
  if (existing) {
    return;
  }
  const totals = capitalTotals();
  const last = capitalState.snapshots
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .pop();
  const delta = last ? totals.netWorth - last.netWorth : 0;
  capitalState.snapshots.push({
    month,
    assetsTotal: totals.assetsTotal,
    debtsTotal: totals.debtsTotal,
    netWorth: totals.netWorth,
    delta,
    note: "",
  });
  saveCapitalV2(capitalState);
};

const renderCapitalSummary = () => {
  const totals = capitalTotals();
  if (capitalAssetsTotal) {
    capitalAssetsTotal.textContent = capitalFormatMoney(totals.assetsTotal);
  }
  if (capitalDebtsTotal) {
    capitalDebtsTotal.textContent = capitalFormatMoney(totals.debtsTotal);
  }
  if (capitalNetWorth) {
    capitalNetWorth.textContent = capitalFormatMoney(totals.netWorth);
  }
  return totals;
};

const renderCapitalLedger = () => {
  if (!capitalLedger) {
    return;
  }
  const totals = capitalTotals();
  capitalLedger.innerHTML = "";
  capitalLedgerTotal.textContent = capitalFormatMoney(totals.assetsTotal);
  capitalLedgerNote.textContent = totals.missingRates.length
    ? `Не учтены суммы без курса: ${[...new Set(totals.missingRates)].join(", ")}.`
    : "";

  const filteredAssets = capitalState.assets.filter((asset) => {
    if (capitalOverviewFilter === "all") {
      return true;
    }
    return asset.liquidity === capitalOverviewFilter;
  });

  if (!filteredAssets.length) {
    capitalLedger.innerHTML = "<p class='hint'>Добавьте активы, чтобы увидеть список.</p>";
    return;
  }

  const header = document.createElement("div");
  header.className = "capital-ledger-row capital-ledger-head";
  header.innerHTML = `
    <div>Актив</div>
    <div class="capital-ledger-amount">Сумма (${capitalState.settings.baseCurrency})</div>
    <div class="capital-ledger-profit">Потенциальная доходность</div>
    <div class="capital-ledger-note">Комментарий</div>
  `;
  capitalLedger.appendChild(header);

  const grouped = new Map();
  filteredAssets.forEach((asset) => {
    const category = asset.category || asset.section || "В наличии";
    if (!grouped.has(category)) {
      grouped.set(category, new Map());
    }
    const subcategory = asset.subcategory || "Без подкатегории";
    if (!grouped.get(category).has(subcategory)) {
      grouped.get(category).set(subcategory, []);
    }
    grouped.get(category).get(subcategory).push(asset);
  });

  grouped.forEach((subcategories, categoryName) => {
    const categoryHeader = document.createElement("div");
    categoryHeader.className = "capital-ledger-section";
    categoryHeader.textContent = categoryName;
    capitalLedger.appendChild(categoryHeader);

    subcategories.forEach((assets, subcategoryName) => {
      const subHeader = document.createElement("div");
      subHeader.className = "capital-ledger-note";
      subHeader.textContent = subcategoryName;
      capitalLedger.appendChild(subHeader);

      assets.forEach((asset) => {
        const converted = capitalToBase(asset.amount, asset.currency);
        const hasRate = converted != null || !capitalIsUnconvertible(asset);
        const amountLabel = hasRate
          ? capitalFormatMoney(converted ?? asset.amount)
          : `нет курса для ${asset.currency}`;

        let profitLabel = "—";
        let profitSubtext = "";
        if (asset.expectedProfit != null && asset.expectedProfit !== "") {
          const profitConverted = capitalToBase(asset.expectedProfit, asset.currency);
          if (profitConverted == null && capitalIsUnconvertible(asset)) {
            profitLabel = `нет курса для ${asset.currency}`;
          } else {
            profitLabel = capitalFormatMoney(profitConverted ?? asset.expectedProfit);
            if (asset.currency !== capitalState.settings.baseCurrency) {
              profitSubtext = `оригинал: ${asset.expectedProfit.toFixed(2)} ${asset.currency}`;
            }
          }
        }

        const row = document.createElement("div");
        row.className = `capital-ledger-row${hasRate ? "" : " is-warning"}`;
        row.innerHTML = `
          <div>
            <div>${asset.name}</div>
            <div class="capital-ledger-meta">
              <span>${asset.category || asset.section || "В наличии"}</span>
              <span>${asset.subcategory || "Без подкатегории"}</span>
              <span>${capitalLiquidityLabel(asset.liquidity)}</span>
            </div>
          </div>
          <div class="capital-ledger-amount">
            ${amountLabel}
            ${asset.currency !== capitalState.settings.baseCurrency && hasRate
              ? `<span>оригинал: ${asset.amount.toFixed(2)} ${asset.currency}</span>`
              : ""}
          </div>
          <div class="capital-ledger-profit">
            ${profitLabel}
            ${asset.maturityDate ? `<span>ожидаемо к ${asset.maturityDate}</span>` : ""}
            ${profitSubtext ? `<span>${profitSubtext}</span>` : ""}
          </div>
          <div class="capital-ledger-note">${asset.note || "—"}</div>
        `;
        capitalLedger.appendChild(row);
      });
    });
  });
};

const renderCapitalStructureCharts = () => {
  if (!capitalAssetTypeChart || !capitalAssetTypePie) {
    return;
  }
  const formatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: capitalState.settings.baseCurrency,
    minimumFractionDigits: 2,
  });
  const assetTotals = capitalState.assets.reduce((acc, item) => {
    const converted = capitalToBase(item.amount, item.currency);
    if (converted == null && capitalIsUnconvertible(item)) {
      return acc;
    }
    acc[item.type] = (acc[item.type] || 0) + (converted ?? item.amount);
    return acc;
  }, {});
  renderChart(
    capitalAssetTypeChart,
    assetTotals,
    "Добавьте активы, чтобы увидеть структуру.",
    { limit: 6, formatter }
  );
  renderPie(
    capitalAssetTypePie,
    assetTotals,
    "Добавьте активы, чтобы увидеть структуру."
  );
};

const renderCapitalOverview = () => {
  if (!capitalOverviewBody) {
    return;
  }
  const baseCurrency = capitalState.settings.baseCurrency;
  const formatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: baseCurrency,
    minimumFractionDigits: 2,
  });
  capitalOverviewCurrency.textContent = baseCurrency;
  capitalOverviewBody.innerHTML = "";
  capitalOverviewTotal.textContent = formatter.format(0);
  capitalOverviewNote.textContent = "";

  if (!capitalState.assets.length) {
    capitalOverviewBody.innerHTML = "<p class='hint'>Добавьте активы, чтобы увидеть обзор капитала.</p>";
    return;
  }

  const sections = new Map();
  capitalState.assets.forEach((asset) => {
    const section = asset.section || (asset.type === "deposit" ? "Вклады" : "В наличии");
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section).push(asset);
  });

  const sectionOrder = ["В наличии", "Вклады"];
  const orderedSections = [
    ...sectionOrder.filter((section) => sections.has(section)),
    ...[...sections.keys()].filter((section) => !sectionOrder.includes(section)),
  ];

  let grandTotal = 0;
  const missingRates = new Set();

  orderedSections.forEach((section) => {
    const header = document.createElement("div");
    header.className = "capital-overview-section";
    header.textContent = section;
    capitalOverviewBody.appendChild(header);

    let sectionTotal = 0;
    sections.get(section).forEach((asset) => {
      const row = document.createElement("div");
      row.className = "capital-overview-row";

      const nameCell = document.createElement("div");
      nameCell.className = "capital-overview-cell";
      nameCell.textContent = asset.name;

      const amountCell = document.createElement("div");
      amountCell.className = "capital-overview-cell is-amount";

      const amountValue = document.createElement("div");
      amountValue.className = "capital-overview-amount";

      const converted = capitalToBase(asset.amount, asset.currency);
      const hasRate = converted != null || !capitalIsUnconvertible(asset);
      if (hasRate) {
        const amount = converted ?? asset.amount;
        amountValue.textContent = formatter.format(amount);
        sectionTotal += amount;
        grandTotal += amount;
        if (asset.currency !== baseCurrency) {
          const original = document.createElement("div");
          original.className = "capital-overview-subtext";
          original.textContent = `оригинал: ${asset.amount.toFixed(2)} ${asset.currency}`;
          amountCell.appendChild(original);
        }
      } else {
        row.classList.add("is-warning");
        amountValue.textContent = `нет курса для ${asset.currency}`;
        missingRates.add(asset.currency);
      }

      amountCell.prepend(amountValue);

      const noteCell = document.createElement("div");
      noteCell.className = "capital-overview-cell";
      noteCell.textContent = asset.note ? asset.note : "—";

      row.append(nameCell, amountCell, noteCell);
      capitalOverviewBody.appendChild(row);
    });

    const subtotal = document.createElement("div");
    subtotal.className = "capital-overview-row capital-overview-subtotal";
    subtotal.innerHTML = `
      <div class="capital-overview-cell">Итого ${section}</div>
      <div class="capital-overview-cell is-amount">${formatter.format(sectionTotal)}</div>
      <div class="capital-overview-cell"> </div>
    `;
    capitalOverviewBody.appendChild(subtotal);
  });

  capitalOverviewTotal.textContent = formatter.format(grandTotal);
  if (missingRates.size) {
    capitalOverviewNote.textContent = `Не учтены суммы без курса: ${[...missingRates].join(", ")}.`;
  }
};

const renderCapitalOverviewDashboard = () => {
  if (!capitalOverviewTotal || !capitalOverviewAssets || !capitalOverviewGoals) {
    return;
  }
  const totals = capitalTotals();
  const formatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: capitalState.settings.baseCurrency,
    minimumFractionDigits: 2,
  });
  if (capitalOverviewCurrency) {
    capitalOverviewCurrency.textContent = capitalState.settings.baseCurrency;
  }
  if (capitalOverviewNote) {
    capitalOverviewNote.textContent = totals.missingRates.length
      ? `Не учтены суммы без курса: ${[...new Set(totals.missingRates)].join(", ")}.`
      : "";
  }
  capitalOverviewTotal.textContent = formatter.format(totals.assetsTotal);
  if (capitalOverviewReal) {
    capitalOverviewReal.textContent = formatter.format(totals.netWorth);
  }
  if (capitalOverviewDebts) {
    capitalOverviewDebts.textContent = formatter.format(totals.debtsTotal);
  }

  if (capitalOverviewDelta) {
    const sorted = capitalState.snapshots.slice().sort((a, b) => a.month.localeCompare(b.month));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (last && prev && prev.netWorth) {
      const deltaPercent = ((last.netWorth - prev.netWorth) / prev.netWorth) * 100;
      const sign = deltaPercent >= 0 ? "+" : "";
      capitalOverviewDelta.textContent = `${sign}${deltaPercent.toFixed(1)}% за месяц`;
      capitalOverviewDelta.style.color = deltaPercent >= 0 ? "#16a34a" : "#dc2626";
    } else {
      capitalOverviewDelta.textContent = "—";
    }
  }

  capitalOverviewAssets.innerHTML = "";
  const assetRows = capitalState.assets.slice().sort((a, b) => b.amount - a.amount);
  if (!assetRows.length) {
    capitalOverviewAssets.innerHTML = "<p class='hint'>Добавьте активы.</p>";
  } else {
    assetRows.forEach((asset) => {
      const converted = capitalToBase(asset.amount, asset.currency);
      const amountLabel = converted == null && capitalIsUnconvertible(asset)
        ? `нет курса для ${asset.currency}`
        : formatter.format(converted ?? asset.amount);
      const row = document.createElement("div");
      row.className = "capital-overview-row";
      row.innerHTML = `
        <div>
          <strong>${asset.name}</strong>
          <span>${asset.category || asset.section || "В наличии"}</span>
        </div>
        <div>${amountLabel}</div>
      `;
      capitalOverviewAssets.appendChild(row);
    });
  }

  capitalOverviewGoals.innerHTML = "";
  if (!capitalState.goals.length) {
    capitalOverviewGoals.innerHTML = "<p class='hint'>Добавьте финансовые цели.</p>";
  } else {
    capitalState.goals.forEach((goal) => {
      const current = goalProgress(goal);
      const percent = goal.targetAmount ? Math.min(100, (current / goal.targetAmount) * 100) : 0;
      const goalRow = document.createElement("div");
      goalRow.className = "capital-goal";
      goalRow.innerHTML = `
        <div class="capital-overview-row">
          <div>
            <strong>${goal.name}</strong>
            <span>${goal.targetDate}</span>
          </div>
          <div>${percent.toFixed(0)}%</div>
        </div>
        <div class="capital-goal-bar"><span style="width:${percent}%"></span></div>
        <div class="capital-overview-row">
          <span>Цель</span>
          <strong>${formatter.format(goal.targetAmount)}</strong>
        </div>
        <div class="capital-overview-row">
          <span>Факт</span>
          <strong>${formatter.format(current)}</strong>
        </div>
      `;
      capitalOverviewGoals.appendChild(goalRow);
    });
  }

  if (capitalOverviewSnapshots) {
    capitalOverviewSnapshots.innerHTML = "";
    const snapshots = capitalState.snapshots.slice().sort((a, b) => b.month.localeCompare(a.month)).slice(0, 4);
    if (!snapshots.length) {
      capitalOverviewSnapshots.innerHTML = "<p class='hint'>Нет снимков капитала.</p>";
    } else {
      snapshots.forEach((item) => {
        const row = document.createElement("div");
        row.className = "capital-overview-row";
        const deltaLabel = item.delta ? `${item.delta > 0 ? "+" : ""}${formatter.format(item.delta)}` : "—";
        row.innerHTML = `
          <div>
            <strong>${item.month}</strong>
            <span>${deltaLabel}</span>
          </div>
          <div>${formatter.format(item.netWorth)}</div>
        `;
        capitalOverviewSnapshots.appendChild(row);
      });
    }
  }

  if (capitalOverviewDebtsList) {
    capitalOverviewDebtsList.innerHTML = "";
    if (!capitalState.debts.length) {
      capitalOverviewDebtsList.innerHTML = "<p class='hint'>Долгов нет.</p>";
    } else {
      capitalState.debts.forEach((debt) => {
        const converted = capitalToBase(debt.principal, debt.currency);
        const amountLabel = converted == null && debt.currency !== capitalState.settings.baseCurrency
          ? `нет курса для ${debt.currency}`
          : formatter.format(converted ?? debt.principal);
        const row = document.createElement("div");
        row.className = "capital-overview-row";
        row.innerHTML = `
          <div>
            <strong>${debt.name}</strong>
            <span>${capitalDebtTypeLabel(debt.type)}</span>
          </div>
          <div>${amountLabel}</div>
        `;
        capitalOverviewDebtsList.appendChild(row);
      });
    }
  }
};

const capitalizeAssetCategories = () =>
  capitalState.assetCategories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

const capitalEnsureCategory = (name, subcategory = "") => {
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }
  const existing = capitalState.assetCategories.find((category) => category.name === trimmed);
  if (!existing) {
    capitalState.assetCategories.push({
      name: trimmed,
      subs: subcategory ? [subcategory.trim()] : [],
    });
    return;
  }
  const sub = subcategory.trim();
  if (sub && !existing.subs.includes(sub)) {
    existing.subs.push(sub);
  }
};

const renderCapitalCategories = () => {
  if (!capitalCategoryManager) {
    return;
  }
  capitalCategoryManager.innerHTML = "";
  capitalSubcategoryList.innerHTML = "";

  const sorted = capitalizeAssetCategories();
  sorted.forEach((category) => {
    category.subs.forEach((sub) => {
      const subOption = document.createElement("option");
      subOption.value = sub;
      capitalSubcategoryList.appendChild(subOption);
    });

    const card = document.createElement("div");
    card.className = "category-card capital-category-card";
    card.innerHTML = `
      <div class="capital-category-title">
        <span>${category.name}</span>
        <button class="button secondary" data-capital-category-delete="${category.name}">Удалить</button>
      </div>
    `;
    const subs = document.createElement("div");
    subs.className = "capital-category-subs";
    if (!category.subs.length) {
      subs.innerHTML = "<span class='hint'>Подкатегории не добавлены.</span>";
    } else {
      category.subs.forEach((sub) => {
        const pill = document.createElement("span");
        pill.className = "capital-subcategory";
        pill.innerHTML = `
          ${sub}
          <button class="button secondary" data-capital-subcategory-delete="${category.name}" data-subcategory="${sub}">×</button>
        `;
        subs.appendChild(pill);
      });
    }
    card.appendChild(subs);
    capitalCategoryManager.appendChild(card);
  });
};

const capitalAssetListState = {
  query: "",
  type: "all",
  liquidity: "all",
  sortKey: "current",
  sortDir: "desc",
  open: {
    categories: new Set(),
    subcategories: new Set(),
    rows: new Set(),
  },
};

const capitalEscapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#039;",
}[char]));

const capitalFormatCurrency = (value, currency) => new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(value);

const capitalAssetProfit = (asset) => (asset.amount ?? 0) - (asset.invested ?? 0);

const capitalAssetProfitPct = (asset) => {
  const invested = asset.invested ?? 0;
  if (!invested) {
    return 0;
  }
  return capitalAssetProfit(asset) / invested;
};

const capitalAssetAnomaly = (asset) => {
  const invested = asset.invested ?? 0;
  const current = asset.amount ?? 0;
  if (invested > current * 3 && current > 0) {
    return "high";
  }
  if (Math.abs(capitalAssetProfitPct(asset)) > 1.5) {
    return "medium";
  }
  return "none";
};

const capitalAssetLiquidityClass = (value) => ({
  high: "good",
  medium: "mid",
  low: "out",
  locked: "out",
}[value] || "");

const capitalAssetSort = (key, direction) => {
  const multiplier = direction === "asc" ? 1 : -1;
  return (a, b) => {
    if (key === "name") {
      return multiplier * a.name.localeCompare(b.name, "ru");
    }
    if (key === "profit") {
      return multiplier * (capitalAssetProfit(a) - capitalAssetProfit(b));
    }
    if (key === "endDate") {
      const dateA = a.maturityDate ? new Date(a.maturityDate).getTime() : Infinity;
      const dateB = b.maturityDate ? new Date(b.maturityDate).getTime() : Infinity;
      return multiplier * (dateA - dateB);
    }
    return multiplier * ((a.amount ?? 0) - (b.amount ?? 0));
  };
};

const capitalCaptureAssetsOpenState = () => {
  if (!capitalAssetsList) {
    return;
  }
  capitalAssetsList.querySelectorAll("details[data-asset-category]").forEach((item) => {
    const key = item.dataset.assetCategory;
    if (!key) {
      return;
    }
    if (item.open) {
      capitalAssetListState.open.categories.add(key);
    } else {
      capitalAssetListState.open.categories.delete(key);
    }
  });
  capitalAssetsList.querySelectorAll("details[data-asset-subcategory]").forEach((item) => {
    const key = item.dataset.assetSubcategory;
    if (!key) {
      return;
    }
    if (item.open) {
      capitalAssetListState.open.subcategories.add(key);
    } else {
      capitalAssetListState.open.subcategories.delete(key);
    }
  });
  capitalAssetsList.querySelectorAll("details[data-asset-row]").forEach((item) => {
    const key = item.dataset.assetRow;
    if (!key) {
      return;
    }
    if (item.open) {
      capitalAssetListState.open.rows.add(key);
    } else {
      capitalAssetListState.open.rows.delete(key);
    }
  });
};

const renderCapitalAssets = () => {
  if (!capitalAssetsList) {
    return;
  }
  capitalAssetsList.innerHTML = "";
  if (capitalAssetsNote) {
    capitalAssetsNote.textContent = "";
  }

  const items = capitalState.assets;
  if (!items.length) {
    capitalAssetsList.innerHTML = "<p class='hint'>Добавьте первый актив.</p>";
    if (capitalAssetsShown) {
      capitalAssetsShown.textContent = "Показано: 0";
    }
    if (capitalAssetsSummary) {
      capitalAssetsSummary.innerHTML = "";
    }
    return;
  }

  const query = capitalAssetListState.query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (capitalAssetListState.type !== "all" && item.type !== capitalAssetListState.type) {
      return false;
    }
    if (capitalAssetListState.liquidity !== "all" && item.liquidity !== capitalAssetListState.liquidity) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      item.name,
      item.category,
      item.subcategory,
      capitalTypeLabel(item.type),
      item.currency,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  if (capitalAssetsShown) {
    capitalAssetsShown.textContent = `Показано: ${filtered.length}`;
  }

  const missingRates = new Set();
  let totalCurrent = 0;
  let totalInvested = 0;

  filtered.forEach((item) => {
    const amount = capitalToBase(item.amount, item.currency);
    if (amount == null && capitalIsUnconvertible(item)) {
      missingRates.add(item.currency);
      return;
    }
    const invested = capitalToBase(item.invested ?? 0, item.currency);
    totalCurrent += amount ?? item.amount;
    totalInvested += invested ?? (item.invested ?? 0);
  });

  if (capitalAssetsSummary) {
    const profit = totalCurrent - totalInvested;
    const profitPct = totalInvested ? profit / totalInvested : 0;
    const profitClass = profit > 0 ? "pos" : (profit < 0 ? "neg" : "");
    capitalAssetsSummary.innerHTML = `
      <div class="capital-assets-summary-card">
        <div class="k">Всего</div>
        <div class="v">${capitalFormatMoney(totalCurrent)}</div>
        <div class="small">Текущая оценка (в базе)</div>
      </div>
      <div class="capital-assets-summary-card">
        <div class="k">Вложено</div>
        <div class="v">${capitalFormatMoney(totalInvested)}</div>
        <div class="small">Сумма внесений</div>
      </div>
      <div class="capital-assets-summary-card">
        <div class="k">Прибыль</div>
        <div class="v ${profitClass}">${capitalFormatMoney(profit)}</div>
        <div class="small">${new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 }).format(profitPct)}</div>
      </div>
    `;
  }

  if (capitalAssetsNote && missingRates.size) {
    capitalAssetsNote.textContent = `Не учтены суммы без курса: ${[...missingRates].join(", ")}.`;
  }

  const grouped = new Map();
  filtered.forEach((item) => {
    const category = item.category || item.section || "Без категории";
    const subcategory = item.subcategory || "Без подкатегории";
    if (!grouped.has(category)) {
      grouped.set(category, new Map());
    }
    const subMap = grouped.get(category);
    if (!subMap.has(subcategory)) {
      subMap.set(subcategory, []);
    }
    subMap.get(subcategory).push(item);
  });

  const sortedGroups = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, "ru"));
  const formatter = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 });

  const openAllCategories = capitalAssetListState.open.categories.size === 0;
  const openAllSubcategories = capitalAssetListState.open.subcategories.size === 0;
  const openAllRows = capitalAssetListState.open.rows.size === 0;

  sortedGroups.forEach(([category, subcategories]) => {
    const categoryKey = `cat:${category}`;
    const categoryAssets = [...subcategories.values()].flat();
    const categoryCurrent = categoryAssets.reduce((sum, asset) => {
      const converted = capitalToBase(asset.amount, asset.currency);
      if (converted == null && capitalIsUnconvertible(asset)) {
        return sum;
      }
      return sum + (converted ?? asset.amount);
    }, 0);
    const categoryInvested = categoryAssets.reduce((sum, asset) => {
      const invested = capitalToBase(asset.invested ?? 0, asset.currency);
      if (invested == null && capitalIsUnconvertible(asset)) {
        return sum;
      }
      return sum + (invested ?? (asset.invested ?? 0));
    }, 0);
    const categoryProfit = categoryCurrent - categoryInvested;
    const categoryProfitClass = categoryProfit > 0 ? "pos" : (categoryProfit < 0 ? "neg" : "muted");

    const categoryDetails = document.createElement("details");
    categoryDetails.className = "capital-assets-category";
    categoryDetails.dataset.assetCategory = categoryKey;
    if (openAllCategories || capitalAssetListState.open.categories.has(categoryKey)) {
      categoryDetails.open = true;
    }
    categoryDetails.innerHTML = `
      <summary class="capital-assets-category-summary">
        <div class="capital-assets-category-left">
          <div class="capital-assets-icon"><span>💰</span></div>
          <div>
            <div class="capital-assets-category-name">${capitalEscapeHtml(category)}</div>
            <div class="capital-assets-category-meta">${categoryAssets.length} актив(а)</div>
          </div>
        </div>
        <div class="capital-assets-category-right">
          <div class="money">${capitalFormatMoney(categoryCurrent)}</div>
          <div class="profit ${categoryProfitClass}">${capitalFormatMoney(categoryProfit)}</div>
        </div>
      </summary>
      <div class="capital-assets-sublist"></div>
    `;

    const subContainer = categoryDetails.querySelector(".capital-assets-sublist");
    const sortedSub = [...subcategories.entries()].sort(([a], [b]) => a.localeCompare(b, "ru"));
    sortedSub.forEach(([subcategory, assets]) => {
      const subKey = `sub:${category}::${subcategory}`;
      const subCurrent = assets.reduce((sum, asset) => {
        const converted = capitalToBase(asset.amount, asset.currency);
        if (converted == null && capitalIsUnconvertible(asset)) {
          return sum;
        }
        return sum + (converted ?? asset.amount);
      }, 0);
      const subInvested = assets.reduce((sum, asset) => {
        const invested = capitalToBase(asset.invested ?? 0, asset.currency);
        if (invested == null && capitalIsUnconvertible(asset)) {
          return sum;
        }
        return sum + (invested ?? (asset.invested ?? 0));
      }, 0);
      const subProfit = subCurrent - subInvested;
      const subProfitClass = subProfit > 0 ? "pos" : (subProfit < 0 ? "neg" : "muted");

      const subDetails = document.createElement("details");
      subDetails.className = "capital-assets-subcategory";
      subDetails.dataset.assetSubcategory = subKey;
      if (openAllSubcategories || capitalAssetListState.open.subcategories.has(subKey)) {
        subDetails.open = true;
      }
      subDetails.innerHTML = `
        <summary class="capital-assets-subcategory-summary">
          <div>
            <div class="capital-assets-subcategory-name">${capitalEscapeHtml(subcategory)}</div>
            <div class="capital-assets-subcategory-meta">${assets.length} актив(а)</div>
          </div>
          <div class="capital-assets-category-right">
            <div class="money">${capitalFormatMoney(subCurrent)}</div>
            <div class="profit ${subProfitClass}">${capitalFormatMoney(subProfit)}</div>
          </div>
        </summary>
        <div class="capital-assets-table"></div>
      `;

      const table = subDetails.querySelector(".capital-assets-table");
      if (assets.length > 1) {
        const head = document.createElement("div");
        head.className = "capital-assets-head";
        head.innerHTML = `
          <div>Актив</div>
          <div class="cell-r">Сумма</div>
          <div class="cell-r">Прибыль</div>
          <div class="cell-r">Ликвидность</div>
        `;
        table.appendChild(head);
      }

      assets
        .slice()
        .sort(capitalAssetSort(capitalAssetListState.sortKey, capitalAssetListState.sortDir))
        .forEach((asset) => {
          const invested = asset.invested ?? 0;
          const profit = capitalAssetProfit(asset);
          const profitPct = capitalAssetProfitPct(asset);
          const anomaly = capitalAssetAnomaly(asset);
          const rowKey = `row:${asset.id}`;
          const profitClass = profit > 0 ? "pos" : (profit < 0 ? "neg" : "muted");
          const row = document.createElement("details");
          row.className = "capital-assets-row";
          row.dataset.assetRow = rowKey;
          row.dataset.assetId = asset.id;
          if (openAllRows || capitalAssetListState.open.rows.has(rowKey)) {
            row.open = true;
          }
          const baseAmount = capitalToBase(asset.amount, asset.currency);
          const baseProfit = capitalToBase(profit, asset.currency);
          const baseHint = baseAmount == null && capitalIsUnconvertible(asset)
            ? `нет курса для ${asset.currency}`
            : `в базе ${capitalFormatMoney(baseAmount ?? asset.amount)}`;
          const profitHint = baseProfit == null && capitalIsUnconvertible(asset)
            ? `нет курса для ${asset.currency}`
            : `в базе ${capitalFormatMoney(baseProfit ?? profit)}`;
          const pctLabel = anomaly !== "none" ? "проверь данные" : formatter.format(profitPct);
          row.innerHTML = `
            <summary class="capital-assets-row-summary">
              <div>
                <div class="capital-assets-row-main">
                  <span class="capital-assets-chevron">▸</span>
                  <div>
                    <div class="capital-assets-name">
                      ${capitalEscapeHtml(asset.name)}
                      ${anomaly !== "none" ? "<span class='capital-assets-flag'>⚠ проверить</span>" : ""}
                    </div>
                    <div class="capital-assets-meta">${capitalEscapeHtml(capitalTypeLabel(asset.type))} • ${capitalEscapeHtml(asset.currency)}${asset.maturityDate ? ` • до ${capitalEscapeHtml(asset.maturityDate)}` : ""}</div>
                  </div>
                </div>
              </div>
              <div class="cell-r">
                <div class="money">${capitalFormatCurrency(asset.amount, asset.currency)}</div>
                <div class="capital-assets-meta">вложено ${capitalFormatCurrency(invested, asset.currency)}</div>
                <div class="capital-assets-meta">${baseHint}</div>
              </div>
              <div class="cell-r">
                <div class="money ${profitClass}">${capitalFormatCurrency(profit, asset.currency)}</div>
                <div class="capital-assets-meta">${pctLabel}</div>
                <div class="capital-assets-meta">${profitHint}</div>
              </div>
              <div class="cell-r">
                <span class="capital-assets-badge ${capitalAssetLiquidityClass(asset.liquidity)}">${capitalEscapeHtml(capitalLiquidityLabel(asset.liquidity))}</span>
              </div>
            </summary>
            <div class="capital-assets-details">
              <div class="capital-assets-detail-grid">
                <div class="capital-assets-detail-box">
                  <div class="k">Категории</div>
                  <div class="p">Категория: ${capitalEscapeHtml(asset.category || asset.section || "—")}</div>
                  <div class="p">Подкатегория: ${capitalEscapeHtml(asset.subcategory || "—")}</div>
                </div>
                <div class="capital-assets-detail-box">
                  <div class="k">Параметры</div>
                  <div class="p">Потенц. доходность: ${asset.expectedProfit != null ? capitalFormatCurrency(asset.expectedProfit, asset.currency) : "—"}</div>
                  <div class="p">Дата окончания: ${asset.maturityDate ? capitalEscapeHtml(asset.maturityDate) : "—"}</div>
                </div>
                <div class="capital-assets-detail-box">
                  <div class="k">Действия</div>
                  <div class="capital-assets-actions">
                    <button class="btn" type="button" data-asset-edit="${asset.id}">Редактировать</button>
                    <button class="btn danger" type="button" data-asset-delete="${asset.id}">Удалить</button>
                  </div>
                </div>
              </div>
              ${anomaly !== "none" ? `
                <div class="capital-assets-warning">
                  Похоже на аномалию в данных. Проверьте сумму и вложения.
                </div>
              ` : ""}
            </div>
          `;
          table.appendChild(row);
        });

      subContainer.appendChild(subDetails);
    });

    capitalAssetsList.appendChild(categoryDetails);
  });
};

const debtMetrics = () => {
  const debts = capitalState.debts;
  if (!debts.length) {
    return { weightedApr: 0, highestAprLabel: "—", interestMonthly: 0 };
  }
  const totalPrincipal = debts.reduce((sum, item) => sum + item.principal, 0);
  const weighted = debts.reduce((sum, item) => {
    const rate = item.apr ?? 0;
    return sum + item.principal * rate;
  }, 0);
  const weightedApr = totalPrincipal ? weighted / totalPrincipal : 0;
  const highest = debts.reduce((prev, curr) => ((curr.apr ?? 0) > (prev.apr ?? 0) ? curr : prev), debts[0]);
  const interestMonthly = debts.reduce((sum, item) => {
    const rate = item.apr ?? 0;
    return sum + (item.principal * rate) / 100 / 12;
  }, 0);
  return {
    weightedApr,
    highestAprLabel: highest ? `${highest.name} (${highest.apr ?? 0}%)` : "—",
    interestMonthly,
  };
};

const renderCapitalDebts = () => {
  capitalDebtsTable.innerHTML = "";
  if (!capitalState.debts.length) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan='9' class='hint'>Добавьте первый долг.</td>";
    capitalDebtsTable.appendChild(row);
  } else {
    capitalState.debts.forEach((item) => {
      const row = document.createElement("tr");
      row.dataset.debtId = item.id;
      row.innerHTML = `
        <td><input type="text" value="${item.name}" data-field="name" /></td>
        <td>
          <select data-field="type">
            ${["credit_card", "loan", "mortgage", "personal", "other"]
              .map((value) => `<option value="${value}" ${value === item.type ? "selected" : ""}>${capitalDebtTypeLabel(value)}</option>`)
              .join("")}
          </select>
        </td>
        <td><input type="text" value="${item.currency}" data-field="currency" maxlength="3" /></td>
        <td><input type="number" value="${item.principal}" data-field="principal" step="0.01" /></td>
        <td><input type="number" value="${item.apr ?? ""}" data-field="apr" step="0.01" /></td>
        <td><input type="number" value="${item.paymentMin ?? ""}" data-field="paymentMin" step="0.01" /></td>
        <td><input type="number" value="${item.dueDay ?? ""}" data-field="dueDay" step="1" min="1" max="31" /></td>
        <td><input type="text" value="${item.note || ""}" data-field="note" /></td>
        <td><button class="button secondary" data-debt-delete="${item.id}">Удалить</button></td>
      `;
      capitalDebtsTable.appendChild(row);
    });
  }

  const metrics = debtMetrics();
  capitalWeightedApr.textContent = `${metrics.weightedApr.toFixed(2)}%`;
  capitalHighestApr.textContent = metrics.highestAprLabel;
  capitalInterestMonthly.textContent = capitalFormatMoney(metrics.interestMonthly);
};

const estimatePayoffMonths = (principal, apr, payment) => {
  let balance = principal;
  let months = 0;
  while (balance > 0 && months < 600) {
    const interest = (balance * (apr ?? 0)) / 100 / 12;
    const applied = Math.max(payment - interest, 0);
    if (applied === 0) {
      return null;
    }
    balance = Math.max(balance - applied, 0);
    months += 1;
  }
  return months;
};

const buildPayoffPlan = (strategy) => {
  const extra = Number.parseFloat(capitalExtraPayment.value) || 0;
  const debts = capitalState.debts
    .map((item) => ({ ...item }))
    .sort((a, b) => {
      if (strategy === "avalanche") {
        return (b.apr ?? 0) - (a.apr ?? 0);
      }
      return a.principal - b.principal;
    });
  return debts.map((item, index) => {
    const payment = (item.paymentMin ?? 0) + (index === 0 ? extra : 0);
    const months = estimatePayoffMonths(item.principal, item.apr ?? 0, payment);
    return {
      strategy,
      name: item.name,
      months: months == null ? "∞" : months,
      note: index === 0 && extra > 0 ? "С доп. платежом" : "Мин. платеж",
    };
  });
};

const renderCapitalPayoff = () => {
  const plans = [...buildPayoffPlan("avalanche"), ...buildPayoffPlan("snowball")];
  capitalPayoffTable.innerHTML = "";
  if (!plans.length) {
    capitalPayoffTable.innerHTML = "<tr><td colspan='4' class='hint'>Добавьте долги.</td></tr>";
    return;
  }
  plans.forEach((plan) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${plan.strategy === "avalanche" ? "Лавина" : "Снежный ком"}</td>
      <td>${plan.name}</td>
      <td>${plan.months}</td>
      <td>${plan.note}</td>
    `;
    capitalPayoffTable.appendChild(row);
  });
};

const goalProgress = (goal) => {
  const totals = capitalTotals();
  if (goal.kind === "netWorth") {
    return totals.netWorth;
  }
  if (goal.kind === "assetBucket") {
    const matched = capitalState.assets.filter((item) => item.type === goal.name);
    return matched.reduce((sum, item) => sum + (capitalToBase(item.amount, item.currency) ?? 0), 0);
  }
  if (goal.kind === "debtPayoff") {
    return totals.debtsTotal;
  }
  return 0;
};

const goalMonthlyDelta = (goal) => {
  const now = new Date();
  const target = new Date(`${goal.targetDate}-01`);
  const months = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth());
  const current = goalProgress(goal);
  return (goal.targetAmount - current) / months;
};

const goalStatus = (goal) => {
  const snapshots = capitalState.snapshots
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));
  const recent = snapshots.slice(-3);
  if (recent.length < 2) {
    return "нет данных";
  }
  const metric = goal.kind === "debtPayoff"
    ? "debtsTotal"
    : goal.kind === "assetBucket"
      ? "assetsTotal"
      : "netWorth";
  const delta = recent[recent.length - 1][metric] - recent[0][metric];
  const avg = delta / (recent.length - 1);
  const required = goalMonthlyDelta(goal);
  return avg >= required ? "в графике" : "отстает";
};

const renderCapitalGoals = () => {
  capitalGoalsTable.innerHTML = "";
  if (!capitalState.goals.length) {
    capitalGoalsTable.innerHTML = "<tr><td colspan='5' class='hint'>Добавьте первую цель.</td></tr>";
    return;
  }
  capitalState.goals.forEach((goal) => {
    const progress = goalProgress(goal);
    const needed = goalMonthlyDelta(goal);
    const row = document.createElement("tr");
    row.dataset.goalId = goal.id;
    row.innerHTML = `
      <td>${goal.name}</td>
      <td>${capitalFormatShort(progress)} / ${capitalFormatShort(goal.targetAmount)}</td>
      <td>${capitalFormatShort(needed)}</td>
      <td>${goalStatus(goal)}</td>
      <td><button class="button secondary" data-goal-delete="${goal.id}">Удалить</button></td>
    `;
    capitalGoalsTable.appendChild(row);
  });
};

const renderCapitalSnapshots = () => {
  capitalSnapshotsTable.innerHTML = "";
  if (!capitalState.snapshots.length) {
    capitalSnapshotsTable.innerHTML = "<tr><td colspan='7' class='hint'>Создайте первый снимок.</td></tr>";
    return;
  }
  const sorted = capitalState.snapshots
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));
  sorted.forEach((item) => {
    const row = document.createElement("tr");
    row.dataset.snapshotMonth = item.month;
    row.innerHTML = `
      <td>${item.month}</td>
      <td>${capitalFormatShort(item.assetsTotal)}</td>
      <td>${capitalFormatShort(item.debtsTotal)}</td>
      <td>${capitalFormatShort(item.netWorth)}</td>
      <td>${capitalFormatShort(item.delta)}</td>
      <td><input type="text" value="${item.note || ""}" data-field="note" /></td>
      <td><button class="button secondary" data-snapshot-delete="${item.month}">Удалить</button></td>
    `;
    capitalSnapshotsTable.appendChild(row);
  });
};

const renderCapitalHistoryChart = () => {
  capitalSnapshotsChart.innerHTML = "";
  const sorted = capitalState.snapshots
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));
  if (!sorted.length) {
    capitalSnapshotsChart.innerHTML = "<text x='50%' y='50%' text-anchor='middle' fill='#94a3b8'>Нет данных</text>";
    return;
  }

  const width = 720;
  const height = 260;
  const paddingX = 56;
  const paddingY = 28;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const maxValue = Math.max(...sorted.map((item) => Math.max(item.assetsTotal, item.netWorth, item.debtsTotal)), 1);
  const scaleX = (index) =>
    paddingX + (chartWidth * index) / Math.max(sorted.length - 1, 1);
  const scaleY = (value) => paddingY + chartHeight - (value / maxValue) * chartHeight;

  const drawLine = (values, color) => {
    const points = values.map((value, index) => `${scaleX(index)},${scaleY(value)}`).join(" ");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.setAttribute("points", points);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");
    return line;
  };

  const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
  for (let i = 0; i <= 4; i += 1) {
    const y = paddingY + (chartHeight * i) / 4;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", paddingX);
    line.setAttribute("x2", width - paddingX);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#e2e8f0");
    line.setAttribute("stroke-dasharray", "4 4");
    grid.appendChild(line);
  }

  const axis = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const labelStep = Math.max(1, Math.floor(sorted.length / 6));
  sorted.forEach((item, index) => {
    if (index % labelStep !== 0 && index !== sorted.length - 1) {
      return;
    }
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", scaleX(index));
    label.setAttribute("y", height - 8);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "#94a3b8");
    label.setAttribute("font-size", "10");
    label.textContent = item.month;
    axis.appendChild(label);
  });

  const assetsLine = drawLine(sorted.map((item) => item.assetsTotal), "#16a34a");
  const debtsLine = drawLine(sorted.map((item) => item.debtsTotal), "#ea580c");
  const netLine = drawLine(sorted.map((item) => item.netWorth), "#2563eb");

  capitalSnapshotsChart.appendChild(grid);
  capitalSnapshotsChart.appendChild(axis);
  capitalSnapshotsChart.appendChild(assetsLine);
  capitalSnapshotsChart.appendChild(debtsLine);
  capitalSnapshotsChart.appendChild(netLine);
};

const renderCapitalView = () => {
  capitalEnsureSnapshot();
  renderCapitalSummary();
  renderCapitalOverviewDashboard();
  renderCapitalAssets();
  renderCapitalDebts();
  renderCapitalPayoff();
  renderCapitalGoals();
  renderCapitalSnapshots();
  renderCapitalHistoryChart();
  if (capitalBaseCurrency) {
    capitalBaseCurrency.value = capitalState.settings.baseCurrency;
  }
  if (capitalFxCurrency) {
    if (!capitalFxCurrency.value) {
      const existing = Object.keys(capitalState.settings.fxRates || {})[0];
      capitalFxCurrency.value = existing || "USD";
    }
    const rate = capitalState.settings.fxRates[capitalFxCurrency.value.trim().toUpperCase()];
    capitalFxRateValue.textContent = rate ? rate.toFixed(4) : "—";
  }
  renderCapitalCategories();
};

const capitalSetTab = (tabId) => {
  capitalTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.capitalTab === tabId);
  });
  capitalPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.capitalTabPanel === tabId);
  });
};

const capitalSetAssetDrawer = (isOpen) => {
  if (!capitalAssetDrawer) {
    return;
  }
  capitalAssetDrawer.classList.toggle("is-open", isOpen);
  if (capitalAssetToggle) {
    capitalAssetToggle.setAttribute("aria-expanded", String(isOpen));
    capitalAssetToggle.textContent = isOpen ? "Скрыть форму" : "Добавить новый актив";
  }
  capitalAssetToggleButtons.forEach((button) => {
    button.setAttribute("aria-expanded", String(isOpen));
    button.textContent = isOpen ? "Скрыть форму" : "Открыть форму";
  });
};

const capitalSetAssetModal = (isOpen) => {
  if (!capitalAssetDrawer) {
    return;
  }
  capitalAssetDrawer.classList.toggle("is-modal", isOpen);
  if (capitalAssetOverlay) {
    capitalAssetOverlay.classList.toggle("is-active", isOpen);
  }
  document.body.classList.toggle("modal-open", isOpen);
};

const capitalIsAssetModalOpen = () =>
  capitalAssetDrawer ? capitalAssetDrawer.classList.contains("is-modal") : false;

const capitalUpdateAsset = (id, field, value) => {
  const asset = capitalState.assets.find((item) => item.id === id);
  if (!asset) {
    return;
  }
  let refreshCategories = false;
  if (field === "currency") {
    asset[field] = value.trim().toUpperCase();
    ensureFxRateForCurrency(asset[field]);
  } else if (field === "amount" || field === "invested") {
    asset[field] = Number.parseFloat(value) || 0;
  } else if (field === "expectedProfit") {
    asset[field] = value === "" ? null : (Number.parseFloat(value) || 0);
  } else if (field === "maturityDate") {
    asset[field] = value;
    asset.liquidity = value ? "locked" : asset.liquidity;
  } else if (field === "section") {
    asset[field] = value.trim();
  } else if (field === "category") {
    asset[field] = value.trim();
    capitalEnsureCategory(asset[field]);
    refreshCategories = true;
  } else if (field === "subcategory") {
    asset[field] = value.trim();
    capitalEnsureCategory(asset.category || asset.section || "В наличии", asset[field]);
    refreshCategories = true;
  } else {
    asset[field] = value;
  }
  asset.unconvertible = capitalIsUnconvertible(asset);
  asset.updatedAt = capitalNowIso();
  saveCapitalV2(capitalState);
  if (refreshCategories) {
    renderCapitalCategories();
  }
  renderCapitalSummary();
  renderCapitalLedger();
  renderCapitalStructureCharts();
  renderCapitalOverview();
};

const capitalUpdateDebt = (id, field, value) => {
  const debt = capitalState.debts.find((item) => item.id === id);
  if (!debt) {
    return;
  }
  const numericFields = ["principal", "apr", "paymentMin", "dueDay"];
  if (field === "currency") {
    debt[field] = value.trim().toUpperCase();
  } else {
    debt[field] = numericFields.includes(field) ? (value === "" ? null : Number.parseFloat(value)) : value;
  }
  debt.updatedAt = capitalNowIso();
  saveCapitalV2(capitalState);
  renderCapitalSummary();
  renderCapitalLedger();
  renderCapitalStructureCharts();
  renderCapitalOverview();
  renderCapitalDebts();
  renderCapitalPayoff();
};

const capitalUpdateSnapshotNote = (month, note) => {
  const snapshot = capitalState.snapshots.find((item) => item.month === month);
  if (!snapshot) {
    return;
  }
  snapshot.note = note;
  saveCapitalV2(capitalState);
};

const capitalResetAssetForm = () => {
  capitalAssetForm.reset();
  capitalAssetCurrency.value = capitalState.settings.baseCurrency;
  capitalAssetMaturityDate.value = "";
  capitalAssetSubcategory.value = "";
  capitalAssetExpectedProfit.value = "";
  capitalEditingAssetId = null;
  const submitButton = capitalAssetForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Добавить актив";
  }
  if (capitalAssetDelete) {
    capitalAssetDelete.classList.remove("is-visible");
  }
};

const capitalFillAssetForm = (asset) => {
  capitalSetAssetDrawer(true);
  capitalSetAssetModal(true);
  capitalAssetName.value = asset.name || "";
  capitalAssetType.value = asset.type || "cash";
  capitalAssetCurrency.value = asset.currency || capitalState.settings.baseCurrency;
  capitalAssetAmount.value = asset.amount ?? 0;
  capitalAssetInvested.value = asset.invested ?? asset.amount ?? 0;
  capitalAssetSubcategory.value = asset.subcategory || "";
  capitalAssetMaturityDate.value = asset.maturityDate || "";
  capitalAssetLiquidity.value = asset.liquidity || "high";
  capitalAssetExpectedProfit.value = asset.expectedProfit ?? "";
  capitalAssetNote.value = asset.note || "";
  capitalEditingAssetId = asset.id;
  const submitButton = capitalAssetForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = "Сохранить изменения";
  }
  if (capitalAssetDelete) {
    capitalAssetDelete.classList.add("is-visible");
  }
};

const capitalAddAsset = () => {
  const name = capitalAssetName.value.trim();
  const amountInput = capitalAssetAmount.value;
  const investedInput = capitalAssetInvested.value;
  const invested = Number.parseFloat(investedInput);
  if (!name || Number.isNaN(invested)) {
    return;
  }
  const subcategoryValue = capitalAssetSubcategory.value.trim();
  const isDeposit = capitalAssetType.value === "deposit";
  const amountParsed = Number.parseFloat(amountInput);
  const amount = Number.isNaN(amountParsed) ? invested : amountParsed;
  const resolvedCategory = capitalTypeLabel(capitalAssetType.value);
  if (resolvedCategory) {
    capitalEnsureCategory(resolvedCategory, subcategoryValue);
  }
  const payload = {
    name,
    type: capitalAssetType.value,
    currency: capitalAssetCurrency.value.trim().toUpperCase() || capitalState.settings.baseCurrency,
    amount,
    invested,
    section: isDeposit ? "Вклады" : "В наличии",
    category: resolvedCategory,
    subcategory: subcategoryValue,
    liquidity: capitalAssetLiquidity.value,
    expectedProfit: isDeposit && capitalAssetExpectedProfit.value
      ? Number.parseFloat(capitalAssetExpectedProfit.value)
      : null,
    maturityDate: isDeposit ? capitalAssetMaturityDate.value : "",
    note: capitalAssetNote.value.trim(),
  };
  if (capitalEditingAssetId) {
    const existing = capitalState.assets.find((item) => item.id === capitalEditingAssetId);
    if (!existing) {
      capitalResetAssetForm();
      return;
    }
    Object.assign(existing, payload, { updatedAt: capitalNowIso() });
    existing.unconvertible = capitalIsUnconvertible(existing);
    ensureFxRateForCurrency(existing.currency);
  } else {
    capitalState.assets.push({
      id: capitalGenerateId("asset"),
      ...payload,
      updatedAt: capitalNowIso(),
    });
    ensureFxRateForCurrency(capitalState.assets[capitalState.assets.length - 1].currency);
    capitalState.assets[capitalState.assets.length - 1].unconvertible = capitalIsUnconvertible(
      capitalState.assets[capitalState.assets.length - 1]
    );
  }
  saveCapitalV2(capitalState);
  capitalResetAssetForm();
  if (capitalIsAssetModalOpen()) {
    capitalSetAssetModal(false);
    capitalSetAssetDrawer(false);
  }
  renderCapitalView();
};

const capitalAddDebt = () => {
  const name = capitalDebtName.value.trim();
  const principal = Number.parseFloat(capitalDebtPrincipal.value);
  if (!name || Number.isNaN(principal)) {
    return;
  }
  capitalState.debts.push({
    id: capitalGenerateId("debt"),
    name,
    type: capitalDebtType.value,
    currency: capitalDebtCurrency.value.trim().toUpperCase() || capitalState.settings.baseCurrency,
    principal,
    apr: capitalDebtApr.value ? Number.parseFloat(capitalDebtApr.value) : null,
    paymentMin: capitalDebtPayment.value ? Number.parseFloat(capitalDebtPayment.value) : null,
    dueDay: capitalDebtDueDay.value ? Number.parseInt(capitalDebtDueDay.value, 10) : null,
    note: capitalDebtNote.value.trim(),
    updatedAt: capitalNowIso(),
  });
  saveCapitalV2(capitalState);
  capitalDebtForm.reset();
  capitalDebtCurrency.value = capitalState.settings.baseCurrency;
  renderCapitalView();
};

const capitalAddGoal = () => {
  const name = capitalGoalName.value.trim();
  const targetAmount = Number.parseFloat(capitalGoalTarget.value);
  const targetDate = capitalGoalDate.value;
  if (!name || Number.isNaN(targetAmount) || !targetDate) {
    return;
  }
  capitalState.goals.push({
    id: capitalGenerateId("goal"),
    name,
    kind: capitalGoalKind.value,
    targetAmount,
    targetDate,
    baselineAmount: capitalGoalBaseline.value ? Number.parseFloat(capitalGoalBaseline.value) : null,
    note: capitalGoalNote.value.trim(),
  });
  saveCapitalV2(capitalState);
  capitalGoalForm.reset();
  renderCapitalView();
};

const capitalCreateSnapshotNow = () => {
  const month = capitalMonthKey();
  const totals = capitalTotals();
  const last = capitalState.snapshots
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .filter((item) => item.month !== month)
    .pop();
  const delta = last ? totals.netWorth - last.netWorth : 0;
  const existing = capitalState.snapshots.find((item) => item.month === month);
  if (existing) {
    existing.assetsTotal = totals.assetsTotal;
    existing.debtsTotal = totals.debtsTotal;
    existing.netWorth = totals.netWorth;
    existing.delta = delta;
  } else {
    capitalState.snapshots.push({
      month,
      assetsTotal: totals.assetsTotal,
      debtsTotal: totals.debtsTotal,
      netWorth: totals.netWorth,
      delta,
      note: "",
    });
  }
  saveCapitalV2(capitalState);
  renderCapitalView();
};

const addCategory = () => {
  const name = newCategoryInput.value.trim();
  const subName = newSubcategoryInput.value.trim();
  if (!name) {
    return;
  }

  pushHistory();

  if (categories[name]) {
    if (subName && !categories[name].subs.includes(subName)) {
      categories[name].subs.push(subName);
    }
  } else {
    categories[name] = {
      type: categoryTypeSelect.value,
      subs: subName ? [subName] : [],
    };
  }

  saveCategories(categories);
  renderCategories();
  newCategoryInput.value = "";
  newSubcategoryInput.value = "";
};

const renameCategory = (oldName, newName) => {
  if (!newName || oldName === newName || categories[newName]) {
    return;
  }
  pushHistory();
  const payload = categories[oldName];
  delete categories[oldName];
  categories[newName] = payload;
  transactions = transactions.map((item) =>
    item.category === oldName ? { ...item, category: newName } : item
  );
  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  saveCategories(categories);
  renderCategories();
};

const renameSubcategory = (categoryName, oldName, newName) => {
  if (!newName || oldName === newName) {
    return;
  }
  pushHistory();
  categories[categoryName].subs = categories[categoryName].subs.map((item) =>
    item === oldName ? newName : item
  );
  transactions = transactions.map((item) =>
    item.category === categoryName && item.subcategory === oldName
      ? { ...item, subcategory: newName }
      : item
  );
  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  saveCategories(categories);
  renderCategories();
};

const moveSubcategory = (fromCategory, subName, toCategory) => {
  if (fromCategory === toCategory) {
    return;
  }
  pushHistory();
  categories[fromCategory].subs = categories[fromCategory].subs.filter(
    (item) => item !== subName
  );
  if (!categories[toCategory].subs.includes(subName)) {
    categories[toCategory].subs.push(subName);
  }
  transactions = transactions.map((item) =>
    item.category === fromCategory && item.subcategory === subName
      ? { ...item, category: toCategory }
      : item
  );
  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  saveCategories(categories);
  renderCategories();
};

const moveCategoryToCategory = (fromCategory, toCategory) => {
  if (fromCategory === toCategory) {
    return;
  }
  pushHistory();
  const fromSubs = categories[fromCategory].subs || [];
  const toSubs = categories[toCategory].subs || [];
  const merged = [...new Set([...toSubs, fromCategory, ...fromSubs])];
  categories[toCategory].subs = merged;
  delete categories[fromCategory];

  transactions = transactions.map((item) => {
    if (item.category !== fromCategory) {
      return item;
    }
    const nextSubcategory = item.subcategory || fromCategory;
    return { ...item, category: toCategory, subcategory: nextSubcategory };
  });

  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  saveCategories(categories);
  renderCategories();
};

const promoteSubcategoryToCategory = (fromCategory, subName) => {
  if (categories[subName]) {
    return;
  }
  pushHistory();
  categories[fromCategory].subs = categories[fromCategory].subs.filter(
    (item) => item !== subName
  );
  categories[subName] = { type: categories[fromCategory].type, subs: [] };

  transactions = transactions.map((item) =>
    item.category === fromCategory && item.subcategory === subName
      ? { ...item, category: subName, subcategory: "" }
      : item
  );

  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  saveCategories(categories);
  renderCategories();
};

const deleteSubcategory = (categoryName, subName) => {
  pushHistory();
  categories[categoryName].subs = categories[categoryName].subs.filter(
    (item) => item !== subName
  );
  transactions = transactions.map((item) =>
    item.category === categoryName && item.subcategory === subName
      ? { ...item, subcategory: "" }
      : item
  );
  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  saveCategories(categories);
  renderCategories();
};

const deleteCategory = (categoryName) => {
  const remaining = Object.keys(categories).filter((name) => name !== categoryName);
  if (remaining.length === 0) {
    alert("Нужна хотя бы одна категория.");
    return;
  }
  pushHistory();
  delete categories[categoryName];
  const fallback = remaining[0];
  transactions = transactions.map((item) =>
    item.category === categoryName ? { ...item, category: fallback, subcategory: "" } : item
  );
  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  saveCategories(categories);
  renderCategories();
};
