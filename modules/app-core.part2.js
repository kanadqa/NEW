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

const renderCapitalAssets = () => {
  capitalAssetsTable.innerHTML = "";
  const items = capitalState.assets;
  if (!items.length) {
    const row = document.createElement("tr");
    row.innerHTML = "<td colspan='10' class='hint'>Добавьте первый актив.</td>";
    capitalAssetsTable.appendChild(row);
    return;
  }
  const grouped = new Map();
  items.forEach((item) => {
    const category = capitalTypeLabel(item.type) || item.category || "Без категории";
    if (!grouped.has(category)) {
      grouped.set(category, new Map());
    }
    const subcategory = item.subcategory || "Без подкатегории";
    if (!grouped.get(category).has(subcategory)) {
      grouped.get(category).set(subcategory, []);
    }
    grouped.get(category).get(subcategory).push(item);
  });

  const buildAssetRow = (item) => {
    const row = document.createElement("tr");
    row.dataset.assetId = item.id;
    row.classList.add("capital-asset-row");
    const invested = item.invested ?? 0;
    const profit = item.amount - invested;
    const amountInBase = capitalToBase(item.amount, item.currency);
    const amountLabel = amountInBase == null && capitalIsUnconvertible(item)
      ? `нет курса для ${item.currency}`
      : capitalFormatMoney(amountInBase ?? item.amount);
    const expectedProfitLabel = item.expectedProfit != null && item.expectedProfit !== ""
      ? (() => {
        const converted = capitalToBase(item.expectedProfit, item.currency);
        if (converted == null && capitalIsUnconvertible(item)) {
          return `нет курса для ${item.currency}`;
        }
        return capitalFormatMoney(converted ?? item.expectedProfit);
      })()
      : "—";
    const maturityLabel = item.type === "deposit" ? (item.maturityDate || "—") : "";
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${capitalTypeLabel(item.type)}</td>
      <td>${item.currency}</td>
      <td>
        ${item.amount.toFixed(2)}
        <div class="hint">${amountLabel}</div>
      </td>
      <td>${invested.toFixed(2)}</td>
      <td>${profit.toFixed(2)}</td>
      <td>${maturityLabel}</td>
      <td>
        ${item.expectedProfit != null ? item.expectedProfit.toFixed(2) : "—"}
        <div class="hint">${expectedProfitLabel}</div>
      </td>
      <td>${capitalLiquidityLabel(item.liquidity)}</td>
      <td>${item.note || "—"}</td>
    `;
    return row;
  };

  grouped.forEach((subcategories, categoryName) => {
    const categoryRow = document.createElement("tr");
    categoryRow.className = "capital-table-section";
    categoryRow.innerHTML = `<td colspan="10">${categoryName}</td>`;
    capitalAssetsTable.appendChild(categoryRow);

    subcategories.forEach((assets, subcategoryName) => {
      const subRow = document.createElement("tr");
      subRow.className = "capital-table-subsection";
      subRow.innerHTML = `<td colspan="10">${subcategoryName}</td>`;
      capitalAssetsTable.appendChild(subRow);
      assets.forEach((asset) => {
        capitalAssetsTable.appendChild(buildAssetRow(asset));
      });
    });
  });

};
