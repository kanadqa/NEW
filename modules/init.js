form.addEventListener("submit", (event) => {
  event.preventDefault();
  const date = document.getElementById("date").value;
  const type = document.getElementById("type").value;
  const category = categorySelect.value;
  const subcategory = subcategorySelect.value || "";
  const amount = Number.parseFloat(document.getElementById("amount").value);
  const note = document.getElementById("note").value.trim();

  if (!date || !category || Number.isNaN(amount)) {
    return;
  }

  pushHistory();
  transactions.push({ date, type, category, subcategory, amount, note });
  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  render();
  resetForm();
});

document.getElementById("type").addEventListener("change", () => {
  renderCategoryOptions();
});

categorySelect.addEventListener("change", (event) => {
  updateSubcategoryOptions(event.target.value);
});

addCategoryButton.addEventListener("click", addCategory);

categoryTypeSelect.addEventListener("change", () => {
  renderCategoryListOptions();
});

newCategoryInput.addEventListener("input", () => {
  const name = newCategoryInput.value.trim();
  if (categories[name]) {
    categoryTypeSelect.value = categories[name].type;
    renderCategoryListOptions();
  }
});

newCategoryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCategory();
  }
});

newSubcategoryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCategory();
  }
});

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setView(link.dataset.viewTarget);
  });
});

layoutButtons.forEach((button) => {
  button.addEventListener("click", () => setLayout(button.dataset.layout));
});

filterTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filterTabs.forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    categoryFilter = tab.dataset.filter;
    renderCategoryManager();
  });
});

categoryScopeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryScopeButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    const scope = button.dataset.categoryScope;
    categoryPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.categoryPanel === scope);
    });
  });
});

categoryManager.addEventListener("dragstart", handleDragStart);
categoryManager.addEventListener("dragend", handleDragEnd);
categoryManager.addEventListener("dragover", handleDragOver);
categoryManager.addEventListener("dragleave", handleDragLeave);
categoryManager.addEventListener("drop", handleDrop);
rootDropzone.addEventListener("dragover", handleDragOver);
rootDropzone.addEventListener("dragleave", handleDragLeave);
rootDropzone.addEventListener("drop", handleDrop);
rootDropzone.addEventListener("dragend", handleDragEnd);

undoButton.addEventListener("click", undoLastAction);

tableBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const index = Number.parseInt(target.dataset.index, 10);
  if (Number.isNaN(index)) {
    return;
  }

  pushHistory();
  transactions.splice(index, 1);
  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  render();
});

exportButton.addEventListener("click", () => {
  if (transactions.length === 0) {
    alert("Добавьте операции перед экспортом.");
    return;
  }

  const header = ["Дата", "Тип", "Категория", "Подкатегория", "Сумма", "Комментарий"];
  const rows = transactions.map((item) => [
    item.date,
    formatType(item.type),
    item.category,
    item.subcategory,
    item.amount.toFixed(2),
    item.note || "",
  ]);

  const csvContent = [header, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `budget-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

clearButton.addEventListener("click", () => {
  if (!confirm("Удалить все операции?")) {
    return;
  }
  pushHistory();
  transactions = [];
  dbSet(STORAGE_KEY, JSON.stringify(transactions));
  render();
});

toggleSubcategoryButton.addEventListener("click", () => {
  showAllSubcategories = !showAllSubcategories;
  renderCharts();
});

toggleExpenseCategoryButton.addEventListener("click", () => {
  showAllExpenseCategories = !showAllExpenseCategories;
  renderCharts();
});

reportRangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    reportRangeButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    const range = button.dataset.reportRange;
    if (range === "all") {
      const bounds = getDateBounds(transactions);
      setReportRange(bounds.start, bounds.end);
    } else {
      const days = Number.parseInt(range, 10);
      const bounds = getDateBounds(transactions);
      const end = bounds.end || new Date().toISOString().slice(0, 10);
      const endDate = new Date(end);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (days - 1));
      setReportRange(startDate.toISOString().slice(0, 10), end);
    }
    renderReports();
  });
});

reportGranularityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    reportGranularityButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    reportGranularity = button.dataset.reportGranularity;
    renderReports();
  });
});

applyReportRangeButton.addEventListener("click", () => {
  reportRangeButtons.forEach((item) => item.classList.remove("is-active"));
  setReportRange(reportStartInput.value, reportEndInput.value);
  renderReports();
});

capitalTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    capitalSetTab(tab.dataset.capitalTab);
  });
});

if (capitalAssetDrawer) {
  capitalSetAssetDrawer(false);
}

if (capitalAssetToggle) {
  capitalAssetToggle.addEventListener("click", () => {
    capitalSetAssetDrawer(!capitalAssetDrawer.classList.contains("is-open"));
    if (capitalAssetDrawer.classList.contains("is-open")) {
      capitalAssetDrawer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

if (capitalAssetToggleButtons.length) {
  capitalAssetToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      capitalSetAssetDrawer(!capitalAssetDrawer.classList.contains("is-open"));
      if (capitalAssetDrawer.classList.contains("is-open")) {
        capitalAssetDrawer.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

if (capitalAssetClose) {
  capitalAssetClose.addEventListener("click", () => {
    capitalSetAssetModal(false);
    capitalSetAssetDrawer(false);
    capitalResetAssetForm();
  });
}

if (capitalAssetOverlay) {
  capitalAssetOverlay.addEventListener("click", () => {
    capitalSetAssetModal(false);
    capitalSetAssetDrawer(false);
    capitalResetAssetForm();
  });
}

if (capitalAssetDelete) {
  capitalAssetDelete.addEventListener("click", () => {
    if (!capitalEditingAssetId || !confirm("Удалить актив?")) {
      return;
    }
    capitalState.assets = capitalState.assets.filter((item) => item.id !== capitalEditingAssetId);
    saveCapitalV2(capitalState);
    capitalSetAssetModal(false);
    capitalSetAssetDrawer(false);
    capitalResetAssetForm();
    renderCapitalView();
  });
}

capitalAssetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  capitalAddAsset();
});

if (capitalBaseCurrency) {
  capitalBaseCurrency.addEventListener("change", () => {
    capitalState.settings.baseCurrency = capitalBaseCurrency.value;
    saveCapitalV2(capitalState);
    renderCapitalView();
    refreshFxRate();
  });
}

if (capitalFxRefresh) {
  capitalFxRefresh.addEventListener("click", () => {
    refreshFxRate();
  });
}

if (capitalFxCurrency) {
  capitalFxCurrency.addEventListener("blur", () => {
    refreshFxRate();
  });
}

if (capitalAssetCurrency && capitalFxCurrency) {
  capitalAssetCurrency.addEventListener("change", () => {
    const currency = capitalAssetCurrency.value.trim().toUpperCase();
    if (currency) {
      capitalFxCurrency.value = currency;
      refreshFxRate();
    }
  });
}

capitalStructureButtons.forEach((button) => {
  button.addEventListener("click", () => {
    capitalStructureButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    const mode = button.dataset.capitalStructure;
    capitalAssetTypeChart.classList.toggle("is-hidden", mode !== "bars");
    capitalAssetTypePie.classList.toggle("is-hidden", mode !== "pie");
  });
});

if (capitalAssetViewButtons.length) {
  capitalAssetViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      capitalAssetViewButtons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      capitalAssetPanels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.capitalAssetPanel === button.dataset.capitalAssetView);
      });
    });
  });
}

if (capitalCategoryForm) {
  capitalCategoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const category = capitalCategoryName.value.trim();
    const subcategory = capitalSubcategoryName.value.trim();
    if (!category) {
      return;
    }
    capitalEnsureCategory(category, subcategory);
    saveCapitalV2(capitalState);
    renderCapitalCategories();
    capitalCategoryForm.reset();
  });
}

if (capitalCategoryManager) {
  capitalCategoryManager.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const categoryName = target.dataset.capitalCategoryDelete;
    const subcategoryName = target.dataset.subcategory;
    if (categoryName && !subcategoryName) {
      capitalState.assetCategories = capitalState.assetCategories.filter((category) => category.name !== categoryName);
      saveCapitalV2(capitalState);
      renderCapitalCategories();
      return;
    }
    if (categoryName && subcategoryName) {
      const category = capitalState.assetCategories.find((item) => item.name === categoryName);
      if (!category) {
        return;
      }
      category.subs = category.subs.filter((sub) => sub !== subcategoryName);
      saveCapitalV2(capitalState);
      renderCapitalCategories();
    }
  });
}

capitalOverviewFilters.forEach((button) => {
  button.addEventListener("click", () => {
    capitalOverviewFilters.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    capitalOverviewFilter = button.dataset.capitalFilter;
    renderCapitalLedger();
  });
});

capitalAssetType.addEventListener("change", () => {
  const isDeposit = capitalAssetType.value === "deposit";
  capitalAssetExpectedProfit.disabled = !isDeposit;
  capitalAssetMaturityDate.disabled = !isDeposit;
  if (!isDeposit) {
    capitalAssetExpectedProfit.value = "";
    capitalAssetMaturityDate.value = "";
  }
});

if (capitalAssetsSearch) {
  capitalAssetsSearch.addEventListener("input", (event) => {
    capitalCaptureAssetsOpenState();
    capitalAssetListState.query = event.target.value;
    renderCapitalAssets();
  });
}

if (capitalAssetsTypeFilter) {
  capitalAssetsTypeFilter.addEventListener("change", (event) => {
    capitalCaptureAssetsOpenState();
    capitalAssetListState.type = event.target.value;
    renderCapitalAssets();
  });
}

if (capitalAssetsLiquidityFilter) {
  capitalAssetsLiquidityFilter.addEventListener("change", (event) => {
    capitalCaptureAssetsOpenState();
    capitalAssetListState.liquidity = event.target.value;
    renderCapitalAssets();
  });
}

if (capitalAssetsSortKey) {
  capitalAssetsSortKey.addEventListener("change", (event) => {
    capitalCaptureAssetsOpenState();
    capitalAssetListState.sortKey = event.target.value;
    renderCapitalAssets();
  });
}

if (capitalAssetsSortDir) {
  capitalAssetsSortDir.addEventListener("click", () => {
    capitalCaptureAssetsOpenState();
    capitalAssetListState.sortDir = capitalAssetListState.sortDir === "asc" ? "desc" : "asc";
    capitalAssetsSortDir.textContent = capitalAssetListState.sortDir === "asc" ? "По возр. ⬆" : "По убыв. ⬇";
    renderCapitalAssets();
  });
}

if (capitalAssetsList) {
  capitalAssetsList.addEventListener("toggle", () => {
    capitalCaptureAssetsOpenState();
  });
  capitalAssetsList.addEventListener("click", (event) => {
    const editId = event.target.closest("[data-asset-edit]")?.dataset.assetEdit;
    if (editId) {
      const asset = capitalState.assets.find((item) => item.id === editId);
      if (asset) {
        capitalFillAssetForm(asset);
        capitalSetAssetDrawer(true);
      }
      return;
    }
    const deleteId = event.target.closest("[data-asset-delete]")?.dataset.assetDelete;
    if (deleteId) {
      if (!confirm("Удалить актив?")) {
        return;
      }
      capitalState.assets = capitalState.assets.filter((item) => item.id !== deleteId);
      saveCapitalV2(capitalState);
      renderCapitalView();
    }
  });
}

capitalDebtForm.addEventListener("submit", (event) => {
  event.preventDefault();
  capitalAddDebt();
});

capitalDebtsTable.addEventListener("input", (event) => {
  const target = event.target;
  const row = target.closest("tr");
  if (!row || !row.dataset.debtId) {
    return;
  }
  const field = target.dataset.field;
  if (!field) {
    return;
  }
  capitalUpdateDebt(row.dataset.debtId, field, target.value);
});

capitalDebtsTable.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  const id = target.dataset.debtDelete;
  if (!id || !confirm("Удалить долг?")) {
    return;
  }
  capitalState.debts = capitalState.debts.filter((item) => item.id !== id);
  saveCapitalV2(capitalState);
  renderCapitalView();
});

capitalExtraPayment.addEventListener("input", () => {
  renderCapitalPayoff();
});

capitalGoalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  capitalAddGoal();
});

capitalGoalsTable.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  const id = target.dataset.goalDelete;
  if (!id || !confirm("Удалить цель?")) {
    return;
  }
  capitalState.goals = capitalState.goals.filter((item) => item.id !== id);
  saveCapitalV2(capitalState);
  renderCapitalView();
});

capitalSnapshotNow.addEventListener("click", () => {
  capitalCreateSnapshotNow();
});

capitalSnapshotsTable.addEventListener("input", (event) => {
  const target = event.target;
  const row = target.closest("tr");
  if (!row || !row.dataset.snapshotMonth) {
    return;
  }
  if (target.dataset.field !== "note") {
    return;
  }
  capitalUpdateSnapshotNote(row.dataset.snapshotMonth, target.value);
});

capitalSnapshotsTable.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  const month = target.dataset.snapshotDelete;
  if (!month || !confirm("Удалить снимок?")) {
    return;
  }
  capitalState.snapshots = capitalState.snapshots.filter((item) => item.month !== month);
  saveCapitalV2(capitalState);
  renderCapitalView();
});

capitalExportButton.addEventListener("click", () => {
  const payload = JSON.stringify(capitalState, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "capital.json";
  link.click();
  URL.revokeObjectURL(url);
});

capitalImportInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    capitalState = {
      assets: data.assets || [],
      debts: data.debts || [],
      goals: data.goals || [],
      snapshots: data.snapshots || [],
      settings: data.settings || { baseCurrency: "RUB", fxRates: {} },
    };
    normalizeCapitalState();
    saveCapitalV2(capitalState);
    renderCapitalView();
  } catch (error) {
    alert("Не удалось импортировать файл.");
  } finally {
    capitalImportInput.value = "";
  }
});

const initializeApp = async () => {
  transactions = await loadTransactions();
  categories = await loadCategories();
  capitalState = await migrateCapitalState();
  normalizeCapitalState();

  renderCategories();
  resetForm();
  initializeReportRange();
  render();
  capitalSetTab("overview");
  renderCapitalView();
  updateUndoState();

  const savedView = await dbGet(VIEW_KEY);
  const savedLayout = await dbGet(LAYOUT_KEY);
  const page = document.body.dataset.page || "main";
  const urlView = page === "main" ? new URLSearchParams(window.location.search).get("view") : null;
  const targetView = page === "capital"
    ? "capital"
    : (urlView || savedView || "dashboard");
  setView(targetView);
  setLayout(savedLayout || "comfort");
};

initializeApp();
