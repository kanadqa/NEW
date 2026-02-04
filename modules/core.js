const form = document.getElementById("transactionForm");
const tableBody = document.getElementById("transactionTable");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const balanceEl = document.getElementById("balance");
const expensePercentEl = document.getElementById("expensePercent");
const exportButton = document.getElementById("exportCsv");
const clearButton = document.getElementById("clearAll");
const undoButton = document.getElementById("undoAction");
const categorySelect = document.getElementById("category");
const subcategorySelect = document.getElementById("subcategory");
const categoryTypeSelect = document.getElementById("categoryType");
const categoryList = document.getElementById("categoryList");
const addCategoryButton = document.getElementById("addCategory");
const newCategoryInput = document.getElementById("newCategory");
const newSubcategoryInput = document.getElementById("newSubcategory");
const categoryScopeButtons = document.querySelectorAll("[data-category-scope]");
const categoryPanels = document.querySelectorAll("[data-category-panel]");
const expenseCategoryChart = document.getElementById("expenseCategoryChart");
const incomeSubcategoryChart = document.getElementById("incomeSubcategoryChart");
const expenseSubcategoryChart = document.getElementById("expenseSubcategoryChart");
const toggleSubcategoryButton = document.getElementById("toggleSubcategoryChart");
const toggleExpenseCategoryButton = document.getElementById("toggleExpenseCategoryChart");
const expensePie = document.getElementById("expensePie");
const expenseSubcategoryPie = document.getElementById("expenseSubcategoryPie");
const incomePie = document.getElementById("incomePie");
const reportLineChart = document.getElementById("reportLineChart");
const categoryManager = document.getElementById("categoryManager");
const rootDropzone = document.querySelector("[data-dropzone-root]");
const filterTabs = document.querySelectorAll("[data-filter]");
const navLinks = document.querySelectorAll("[data-view-target]");
const views = document.querySelectorAll("[data-view]");
const viewTitle = document.getElementById("viewTitle");
const layoutButtons = document.querySelectorAll("[data-layout]");
const reportStartInput = document.getElementById("reportStart");
const reportEndInput = document.getElementById("reportEnd");
const applyReportRangeButton = document.getElementById("applyReportRange");
const reportRangeButtons = document.querySelectorAll("[data-report-range]");
const reportGranularityButtons = document.querySelectorAll("[data-report-granularity]");
const reportIncomeEl = document.getElementById("reportIncome");
const reportExpenseEl = document.getElementById("reportExpense");
const reportBalanceEl = document.getElementById("reportBalance");
const reportTransactionsCountEl = document.getElementById("reportTransactionsCount");
const reportExpenseCategories = document.getElementById("reportExpenseCategories");
const reportExpenseSubcategories = document.getElementById("reportExpenseSubcategories");
const reportIncomeSubcategories = document.getElementById("reportIncomeSubcategories");
const capitalTabs = document.querySelectorAll("[data-capital-tab]");
const capitalPanels = document.querySelectorAll("[data-capital-tab-panel]");
const capitalAssetsTotal = document.getElementById("capitalAssetsTotal");
const capitalDebtsTotal = document.getElementById("capitalDebtsTotal");
const capitalNetWorth = document.getElementById("capitalNetWorth");
const capitalLedger = document.getElementById("capitalLedger");
const capitalLedgerTotal = document.getElementById("capitalLedgerTotal");
const capitalLedgerNote = document.getElementById("capitalLedgerNote");
const capitalOverviewBody = document.getElementById("capitalOverviewBody");
const capitalOverviewTotal = document.getElementById("capitalOverviewTotal");
const capitalOverviewNote = document.getElementById("capitalOverviewNote");
const capitalOverviewCurrency = document.getElementById("capitalOverviewCurrency");
const capitalOverviewReal = document.getElementById("capitalOverviewReal");
const capitalOverviewDebts = document.getElementById("capitalOverviewDebts");
const capitalOverviewDelta = document.getElementById("capitalOverviewDelta");
const capitalOverviewAssets = document.getElementById("capitalOverviewAssets");
const capitalOverviewGoals = document.getElementById("capitalOverviewGoals");
const capitalOverviewSnapshots = document.getElementById("capitalOverviewSnapshots");
const capitalOverviewDebtsList = document.getElementById("capitalOverviewDebtsList");
const capitalStructureButtons = document.querySelectorAll("[data-capital-structure]");
const capitalOverviewFilters = document.querySelectorAll("[data-capital-filter]");
const capitalAssetTypePie = document.getElementById("capitalAssetTypePie");
const capitalAssetTypeChart = document.getElementById("capitalAssetTypeChart");
const capitalExportButton = document.getElementById("capitalExport");
const capitalImportInput = document.getElementById("capitalImport");
const capitalBaseCurrency = document.getElementById("capitalBaseCurrency");
const capitalFxCurrency = document.getElementById("capitalFxCurrency");
const capitalFxRefresh = document.getElementById("capitalFxRefresh");
const capitalFxRateValue = document.getElementById("capitalFxRateValue");
const capitalFxUpdated = document.getElementById("capitalFxUpdated");
const capitalFxChart = document.getElementById("capitalFxChart");
const capitalFxNote = document.getElementById("capitalFxNote");
const capitalAssetForm = document.getElementById("capitalAssetForm");
const capitalAssetToggle = document.getElementById("capitalAssetToggle");
const capitalAssetToggleButtons = document.querySelectorAll("[data-capital-asset-toggle]");
const capitalAssetDrawer = document.getElementById("capitalAssetDrawer");
const capitalAssetOverlay = document.getElementById("capitalAssetOverlay");
const capitalAssetName = document.getElementById("capitalAssetName");
const capitalAssetType = document.getElementById("capitalAssetType");
const capitalAssetCurrency = document.getElementById("capitalAssetCurrency");
const capitalAssetAmount = document.getElementById("capitalAssetAmount");
const capitalAssetInvested = document.getElementById("capitalAssetInvested");
const capitalAssetSubcategory = document.getElementById("capitalAssetSubcategory");
const capitalSubcategoryList = document.getElementById("capitalSubcategoryList");
const capitalAssetMaturityDate = document.getElementById("capitalAssetMaturityDate");
const capitalAssetLiquidity = document.getElementById("capitalAssetLiquidity");
const capitalAssetExpectedProfit = document.getElementById("capitalAssetExpectedProfit");
const capitalAssetNote = document.getElementById("capitalAssetNote");
const capitalAssetClose = document.getElementById("capitalAssetClose");
const capitalAssetDelete = document.getElementById("capitalAssetDelete");
const capitalAssetsList = document.getElementById("capitalAssetsList");
const capitalAssetsSearch = document.getElementById("capitalAssetsSearch");
const capitalAssetsTypeFilter = document.getElementById("capitalAssetsTypeFilter");
const capitalAssetsLiquidityFilter = document.getElementById("capitalAssetsLiquidityFilter");
const capitalAssetsSortKey = document.getElementById("capitalAssetsSortKey");
const capitalAssetsSortDir = document.getElementById("capitalAssetsSortDir");
const capitalAssetsShown = document.getElementById("capitalAssetsShown");
const capitalAssetsSummary = document.getElementById("capitalAssetsSummary");
const capitalAssetsNote = document.getElementById("capitalAssetsNote");
const capitalAssetViewButtons = document.querySelectorAll("[data-capital-asset-view]");
const capitalAssetPanels = document.querySelectorAll("[data-capital-asset-panel]");
const capitalCategoryForm = document.getElementById("capitalCategoryForm");
const capitalCategoryName = document.getElementById("capitalCategoryName");
const capitalSubcategoryName = document.getElementById("capitalSubcategoryName");
const capitalCategoryManager = document.getElementById("capitalCategoryManager");
const capitalWeightedApr = document.getElementById("capitalWeightedApr");
const capitalHighestApr = document.getElementById("capitalHighestApr");
const capitalInterestMonthly = document.getElementById("capitalInterestMonthly");
const capitalDebtForm = document.getElementById("capitalDebtForm");
const capitalDebtName = document.getElementById("capitalDebtName");
const capitalDebtType = document.getElementById("capitalDebtType");
const capitalDebtCurrency = document.getElementById("capitalDebtCurrency");
const capitalDebtPrincipal = document.getElementById("capitalDebtPrincipal");
const capitalDebtApr = document.getElementById("capitalDebtApr");
const capitalDebtPayment = document.getElementById("capitalDebtPayment");
const capitalDebtDueDay = document.getElementById("capitalDebtDueDay");
const capitalDebtNote = document.getElementById("capitalDebtNote");
const capitalDebtsTable = document.getElementById("capitalDebtsTable");
const capitalExtraPayment = document.getElementById("capitalExtraPayment");
const capitalPayoffTable = document.getElementById("capitalPayoffTable");
const capitalGoalForm = document.getElementById("capitalGoalForm");
const capitalGoalName = document.getElementById("capitalGoalName");
const capitalGoalKind = document.getElementById("capitalGoalKind");
const capitalGoalTarget = document.getElementById("capitalGoalTarget");
const capitalGoalDate = document.getElementById("capitalGoalDate");
const capitalGoalBaseline = document.getElementById("capitalGoalBaseline");
const capitalGoalNote = document.getElementById("capitalGoalNote");
const capitalGoalsTable = document.getElementById("capitalGoalsTable");
const capitalSnapshotNow = document.getElementById("capitalSnapshotNow");
const capitalSnapshotsChart = document.getElementById("capitalSnapshotsChart");
const capitalSnapshotsTable = document.getElementById("capitalSnapshotsTable");

const STORAGE_KEY = "budget.transactions.v2";
const CATEGORY_KEY = "budget.categories.v3";
const VIEW_KEY = "budget.view.active";
const LAYOUT_KEY = "budget.layout";
const CHART_LIMIT = 6;
const CAPITAL_KEY_V2 = "budget.capital.v2";
const CAPITAL_KEY_V1 = "budget.capital.v1";
const CAPITAL_MIGRATED_KEY = "budget.capital.migrated";

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
});

const palette = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#7c3aed",
  "#0f766e",
  "#db2777",
  "#ca8a04",
  "#dc2626",
  "#0891b2",
  "#4f46e5",
];

const formatType = (type) => (type === "income" ? "Доход" : "Расход");

const DB_NAME = "budgetAppDb";
const DB_VERSION = 1;
const DB_STORE = "kv";

const dbOpen = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(DB_STORE)) {
      db.createObjectStore(DB_STORE);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const dbGet = async (key) => {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
};

const dbSet = async (key, value) => {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const loadTransactions = async () => {
  try {
    const raw = await dbGet(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Не удалось загрузить данные", error);
    return [];
  }
};

const normalizeCategories = (raw) => {
  if (!raw) {
    return null;
  }

  if (Object.values(raw).every((value) => Array.isArray(value))) {
    const converted = {};
    Object.entries(raw).forEach(([name, subs]) => {
      converted[name] = {
        type: name === "Доход" ? "income" : "expense",
        subs: subs,
      };
    });
    return converted;
  }

  return raw;
};

const loadCategories = async () => {
  try {
    const raw = await dbGet(CATEGORY_KEY);
    if (raw) {
      return normalizeCategories(JSON.parse(raw));
    }
  } catch (error) {
    console.error("Не удалось загрузить категории", error);
  }
  return {
    Еда: { type: "expense", subs: ["Еда домой", "Еда вне дома"] },
    Транспорт: { type: "expense", subs: ["Метро", "Такси"] },
    Доход: { type: "income", subs: ["Зарплата", "Фриланс"] },
  };
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
const renderCategoryManager = () => {
  categoryManager.innerHTML = "";
  const sorted = Object.entries(categories)
    .filter(([name]) =>
      categoryFilter === "all" ? true : categories[name].type === categoryFilter
    )
    .sort(([a], [b]) => a.localeCompare(b));

  sorted.forEach(([categoryName, payload]) => {
    const subs = payload.subs || [];
    const card = document.createElement("div");
    card.className = "category-card";
    card.dataset.category = categoryName;
    card.draggable = true;

    const header = document.createElement("div");
    header.className = "category-card-header";

    const title = document.createElement("div");
    title.innerHTML = `<strong>${categoryName}</strong><span>${subs.length} подкатегорий</span>`;

    const badge = document.createElement("span");
    badge.className = `type-badge ${payload.type}`;
    badge.textContent = payload.type === "income" ? "Доход" : "Расход";

    const actions = document.createElement("div");
    actions.className = "category-actions";

    const renameBtn = document.createElement("button");
    renameBtn.className = "chip";
    renameBtn.textContent = "Переименовать";
    renameBtn.addEventListener("click", () => {
      const nextName = prompt("Новое имя категории", categoryName);
      if (nextName) {
        renameCategory(categoryName, nextName.trim());
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "chip danger";
    deleteBtn.textContent = "Удалить";
    deleteBtn.addEventListener("click", () => {
      if (confirm(`Удалить категорию «${categoryName}»?`)) {
        deleteCategory(categoryName);
      }
    });

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(title);
    header.appendChild(badge);
    header.appendChild(actions);

    const list = document.createElement("div");
    list.className = "subcategory-list";
    list.dataset.dropzone = categoryName;

    if (subs.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Нет подкатегорий";
      list.appendChild(empty);
    }

    subs.forEach((sub) => {
      const row = document.createElement("div");
      row.className = "subcategory-row";
      row.draggable = true;
      row.dataset.category = categoryName;
      row.dataset.subcategory = sub;

      const name = document.createElement("span");
      name.textContent = sub;

      const tools = document.createElement("div");
      tools.className = "subcategory-tools";

      const editBtn = document.createElement("button");
      editBtn.className = "chip";
      editBtn.textContent = "Редактировать";
      editBtn.addEventListener("click", () => {
        const nextName = prompt("Новое имя подкатегории", sub);
        if (nextName) {
          renameSubcategory(categoryName, sub, nextName.trim());
        }
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "chip danger";
      deleteBtn.textContent = "Удалить";
      deleteBtn.addEventListener("click", () => {
        if (confirm(`Удалить подкатегорию «${sub}»?`)) {
          deleteSubcategory(categoryName, sub);
        }
      });

      tools.appendChild(editBtn);
      tools.appendChild(deleteBtn);

      row.appendChild(name);
      row.appendChild(tools);
      list.appendChild(row);
    });

    card.appendChild(header);
    card.appendChild(list);
    categoryManager.appendChild(card);
  });
};

const handleDragStart = (event) => {
  const subRow = event.target.closest(".subcategory-row");
  const card = event.target.closest(".category-card");
  if (subRow) {
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        type: "subcategory",
        category: subRow.dataset.category,
        subcategory: subRow.dataset.subcategory,
      })
    );
    event.dataTransfer.effectAllowed = "move";
    subRow.classList.add("is-dragging");
    return;
  }

  if (card) {
    event.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        type: "category",
        category: card.dataset.category,
      })
    );
    event.dataTransfer.effectAllowed = "move";
    card.classList.add("is-dragging");
  }
};

const handleDragEnd = (event) => {
  const row = event.target.closest(".subcategory-row");
  const card = event.target.closest(".category-card");
  if (row) {
    row.classList.remove("is-dragging");
  }
  if (card) {
    card.classList.remove("is-dragging");
  }
  document
    .querySelectorAll(".subcategory-list.is-drop-target, .category-dropzone.is-drop-target")
    .forEach((list) => list.classList.remove("is-drop-target"));
};

const handleDragOver = (event) => {
  const list = event.target.closest(".subcategory-list, .category-dropzone");
  if (!list) {
    return;
  }
  event.preventDefault();
  list.classList.add("is-drop-target");
  event.dataTransfer.dropEffect = "move";
};

const handleDragLeave = (event) => {
  const list = event.target.closest(".subcategory-list, .category-dropzone");
  if (list) {
    list.classList.remove("is-drop-target");
  }
};

const handleDrop = (event) => {
  const list = event.target.closest(".subcategory-list");
  const dropzone = event.target.closest(".category-dropzone");
  event.preventDefault();

  if (list) {
    list.classList.remove("is-drop-target");
  }
  if (dropzone) {
    dropzone.classList.remove("is-drop-target");
  }

  const payload = event.dataTransfer.getData("text/plain");
  if (!payload) {
    return;
  }

  const data = JSON.parse(payload);
  const targetCategory = list ? list.dataset.dropzone : null;

  if (list && targetCategory) {
    if (data.type === "subcategory") {
      moveSubcategory(data.category, data.subcategory, targetCategory);
    }
    if (data.type === "category") {
      moveCategoryToCategory(data.category, targetCategory);
    }
    return;
  }

  if (dropzone && data.type === "subcategory") {
    promoteSubcategoryToCategory(data.category, data.subcategory);
  }
};

const render = () => {
  updateSummary();
  renderTable();
  renderCharts();
  renderReports();
};

const initializeReportRange = () => {
  const bounds = getDateBounds(transactions);
  if (bounds.end) {
    const endDate = new Date(bounds.end);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 29);
    setReportRange(startDate.toISOString().slice(0, 10), bounds.end);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    setReportRange(today, today);
  }
};

const resetForm = () => {
  document.getElementById("amount").value = "";
  document.getElementById("note").value = "";
  const dateInput = document.getElementById("date");
  if (!dateInput.value) {
    dateInput.valueAsDate = new Date();
  }
};

const setView = (viewId) => {
  const page = document.body.dataset.page || "main";
  if (viewId === "capital" && page === "main") {
    window.location.href = "capital.html";
    return;
  }
  if (viewId !== "capital" && page === "capital") {
    window.location.href = `index.html?view=${viewId}`;
    return;
  }
  views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewId);
  });
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.viewTarget === viewId);
  });
  const activeLabel = [...navLinks].find((link) => link.dataset.viewTarget === viewId);
  if (activeLabel) {
    viewTitle.textContent = activeLabel.textContent;
  }
  dbSet(VIEW_KEY, viewId);
  if (viewId === "capital") {
    renderCapitalView();
  }
};

const setLayout = (layout) => {
  document.body.classList.remove("layout-comfort", "layout-balanced", "layout-compact");
  document.body.classList.add(`layout-${layout}`);
  layoutButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.layout === layout);
  });
  dbSet(LAYOUT_KEY, layout);
};
