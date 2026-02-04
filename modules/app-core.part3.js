
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

