    /* Enhanced Expense Tracker Dashboard
       Features:
       - Real-time data updates
       - Advanced filtering and search
       - Interactive charts with drill-down
       - Export functionality
       - Responsive design
       - Trend analysis
    */

    // ---------- DOM Elements ----------
    const fromDateEl = document.getElementById('fromDate');
    const toDateEl = document.getElementById('toDate');
    const categorySelect = document.getElementById('categorySelect');
    const typeSelect = document.getElementById('typeSelect');
    const accountSelect = document.getElementById('accountSelect');
    const applyBtn = document.getElementById('applyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const searchInput = document.getElementById('searchInput');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportXlsxBtn = document.getElementById('exportXlsxBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const showAllBtn = document.getElementById('showAllBtn');
    const toggleChartBtn = document.getElementById('toggleChartBtn');
    const tableContainer = document.getElementById('table-container');
    const incomeVal = document.getElementById('incomeVal');
    const expenseVal = document.getElementById('expenseVal');
    const balanceVal = document.getElementById('balanceVal');
    const countVal = document.getElementById('countVal');
    const incomeTrend = document.getElementById('incomeTrend');
    const expenseTrend = document.getElementById('expenseTrend');
    const balanceTrend = document.getElementById('balanceTrend');
    const lastUpdate = document.getElementById('lastUpdate');
    //const avgMonthlyExpense = document.getElementById('avgMonthlyExpense');
    //const largestExpense = document.getElementById('largestExpense');
    //const mostUsedCategory = document.getElementById('mostUsedCategory');
    const notification = document.getElementById('notification');

    let allData = [];
    let filteredData = [];
    let pieChart = null;
    let barChart = null;
    let isPieChart = true;
    let previousStats = {
      income: 0,
      expense: 0,
      balance: 0,
      count: 0
    };

    // ---------- UTILITIES ----------
    function getVal(obj, keys, def = "") {
      for (const k of keys)
        if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
          return obj[k];
      return def;
    }

    function parseDateValue(v) {
      if (!v && v !== 0) return null;
      if (v instanceof Date) return v;
      if (typeof v === 'number' && !isNaN(v)) {
        const epoch = new Date(1899, 11, 30);
        return new Date(epoch.getTime() + Math.floor(v) * 86400000);
      }
      if (typeof v === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v);
        const parts = v.split(/[-\/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4)
            return new Date(parts[0], parts[1] - 1, parts[2]);
          else
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        const parsed = new Date(v);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    }

    function normalizeRow(raw, id) {
      const normalized = {
        _id: id || "",
        dateRaw: getVal(raw, ['date', 'Date', 'Period'], ''),
        dateObj: null,
        account: getVal(raw, ['Account', 'Accounts', 'account'], ''),
        category: getVal(raw, ['Category', 'cat', 'category'], ''),
        subcategory: getVal(raw, ['Subcategory', 'SubCategory', 'subcategory'], ''),
        amount: Number(getVal(raw, ['Amount', 'INR', 'amount'], 0)) || 0,
        type: getVal(raw, ['Income_Expense', 'type', 'Type'], ''),
        note: getVal(raw, ['Note', 'Description', 'note'], '')
      };
      normalized.dateObj = parseDateValue(normalized.dateRaw);
      return normalized;
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    }

    function showNotification(message, type = 'info', duration = 3000) {
      notification.textContent = message;
      notification.className = `notification ${type} show`;
      
      setTimeout(() => {
        notification.classList.remove('show');
      }, duration);
    }

    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    }

    function calculateTrend(current, previous) {
      if (previous === 0) return { trend: 'new', percentage: 100 };
      const change = ((current - previous) / previous) * 100;
      return {
        trend: change >= 0 ? 'up' : 'down',
        percentage: Math.abs(change).toFixed(1)
      };
    }

    function updateTrendElement(element, current, previous, prefix = '') {
      if (previous === 0) {
        element.innerHTML = `<i class="fas fa-plus"></i> New data`;
        element.className = 'trend up';
        return;
      }
      
      const trend = calculateTrend(current, previous);
      const icon = trend.trend === 'up' ? 'fa-arrow-up' : 'fa-arrow-down';
      element.innerHTML = `<i class="fas ${icon}"></i> ${trend.percentage}% ${trend.trend}`;
      element.className = `trend ${trend.trend}`;
    }

    // ---------- LOAD DATA ----------
    function loadData() {
      showNotification('Loading data...', 'info');
      db.ref('expenses').once('value')
        .then(snapshot => {
          const val = snapshot.val();
          if (!val) {
            allData = [];
            showNotification('No data found in database', 'error');
          } else {
            allData = Object.entries(val).map(([k, v]) => normalizeRow(v, k));
            allData.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0));
            showNotification(`Loaded ${allData.length} records`, 'success');
          }
          populateFilterOptions(allData);
          applyAndRender();
          updateLastUpdateTime();
        })
        .catch(error => {
          console.error('Error loading data:', error);
          showNotification('Error loading data: ' + error.message, 'error');
        });
    }

    // Real-time updates
    db.ref('expenses').on('value', snapshot => {
      const val = snapshot.val();
      if (!val) return;
      
      const newData = Object.entries(val).map(([k, v]) => normalizeRow(v, k));
      newData.sort((a, b) => (b.dateObj || 0) - (a.dateObj || 0));
      
      // Only update if data actually changed
      if (JSON.stringify(newData) !== JSON.stringify(allData)) {
        allData = newData;
        populateFilterOptions(allData);
        applyAndRender();
        updateLastUpdateTime();
        showNotification('Data updated', 'info', 2000);
      }
    });

    function updateLastUpdateTime() {
      lastUpdate.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    // ---------- FILTER OPTIONS ----------
    function populateFilterOptions(data) {
      // Categories
      const categories = [...new Set(data.map(d => d.category).filter(Boolean))].sort();
      categorySelect.innerHTML = '<option value="">All Categories</option>';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        categorySelect.appendChild(opt);
      });

      // Accounts
      const accounts = [...new Set(data.map(d => d.account).filter(Boolean))].sort();
      accountSelect.innerHTML = '<option value="">All Accounts</option>';
      accounts.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a;
        accountSelect.appendChild(opt);
      });
    }

    // ---------- FILTERS ----------
    function applyAndRender() {
      const from = fromDateEl.value ? new Date(fromDateEl.value) : null;
      const to = toDateEl.value ? new Date(toDateEl.value) : null;
      if (to) to.setHours(23, 59, 59, 999);
      const selCat = categorySelect.value;
      const selType = typeSelect.value;
      const selAccount = accountSelect.value;
      const q = (searchInput.value || '').trim().toLowerCase();

      filteredData = allData.filter(r => {
        if (from && r.dateObj && r.dateObj < from) return false;
        if (to && r.dateObj && r.dateObj > to) return false;
        if (selCat && r.category !== selCat) return false;
        if (selType && r.type !== selType) return false;
        if (selAccount && r.account !== selAccount) return false;
        if (q) {
          const hay = `${r.note} ${r.category} ${r.subcategory} ${r.account}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      render(filteredData);
      
      // Update trends
      const currentIncome = filteredData
        .filter(r => (r.type || '').toLowerCase().includes('inc'))
        .reduce((sum, r) => sum + r.amount, 0);
        
      const currentExpense = filteredData
        .filter(r => (r.type || '').toLowerCase().includes('exp'))
        .reduce((sum, r) => sum + r.amount, 0);
        
      updateTrendElement(incomeTrend, currentIncome, previousStats.income);
      updateTrendElement(expenseTrend, currentExpense, previousStats.expense);
      updateTrendElement(balanceTrend, currentIncome - currentExpense, previousStats.balance);
      
      // Store current stats for next comparison
      previousStats = {
        income: currentIncome,
        expense: currentExpense,
        balance: currentIncome - currentExpense,
        count: filteredData.length
      };
    }

    // ---------- RENDER ----------
    function render(data) {
      let totalIncome = 0, totalExpense = 0;
      data.forEach(r => {
        const t = (r.type || '').toLowerCase();
        if (t.includes('inc') || t === 'income') totalIncome += r.amount;
        else if (t.includes('exp')) totalExpense += r.amount;
      });

      incomeVal.textContent = formatCurrency(totalIncome);
      expenseVal.textContent = formatCurrency(totalExpense);
      balanceVal.textContent = formatCurrency(totalIncome - totalExpense);
      countVal.textContent = data.length.toLocaleString();

      // Additional stats
      //calculateAdditionalStats(data);

      // Charts
      const expenseData = data.filter(r => (r.type || '').toLowerCase().includes('exp'));
      const byCat = {};
      expenseData.forEach(r => {
        const cat = r.category || 'Other';
        byCat[cat] = (byCat[cat] || 0) + r.amount;
      });
      
      if (isPieChart) {
        drawPie(Object.keys(byCat), Object.values(byCat));
      } else {
        drawBarChart(Object.keys(byCat), Object.values(byCat));
      }

      const byMonth = {};
      data.forEach(r => {
        if (!r.dateObj) return;
        const m = `${r.dateObj.getFullYear()}-${String(r.dateObj.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[m]) byMonth[m] = { inc: 0, exp: 0 };
        const amt = r.amount;
        const t = (r.type || '').toLowerCase();
        if (t.includes('inc') || t === 'income') byMonth[m].inc += amt;
        else if (t.includes('exp')) byMonth[m].exp += amt;
      });
      
      const months = Object.keys(byMonth).sort();
      drawMonthlyBar(months, months.map(m => byMonth[m].inc), months.map(m => byMonth[m].exp));

      renderTable(data);
      renderCategorySummary(data);
	  showDurgaSummary(data);

    }

    function calculateAdditionalStats(data) {
      // Average monthly expense
      const expenseData = data.filter(r => (r.type || '').toLowerCase().includes('exp'));
      const byMonth = {};
      expenseData.forEach(r => {
        if (!r.dateObj) return;
        const m = `${r.dateObj.getFullYear()}-${String(r.dateObj.getMonth() + 1).padStart(2, '0')}`;
        byMonth[m] = (byMonth[m] || 0) + r.amount;
      });
      
      const monthlyAvg = Object.values(byMonth).reduce((sum, val) => sum + val, 0) / 
                        (Object.keys(byMonth).length || 1);
      avgMonthlyExpense.textContent = formatCurrency(monthlyAvg);

      // Largest expense
      const largest = expenseData.reduce((max, r) => r.amount > max.amount ? r : max, { amount: 0 });
      largestExpense.textContent = largest.amount > 0 ? formatCurrency(largest.amount) : '₹ 0';

      // Most used category
      const catCount = {};
      expenseData.forEach(r => {
        const cat = r.category || 'Other';
        catCount[cat] = (catCount[cat] || 0) + 1;
      });
      
      const mostUsed = Object.keys(catCount).reduce((a, b) => 
        catCount[a] > catCount[b] ? a : b, '--');
      mostUsedCategory.textContent = mostUsed;
    }

    // ---------- CHARTS ----------
	function drawPie(labels, values) {
  const ctx = document.getElementById('pieChart').getContext('2d');
  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
          '#9966FF', '#FF9F40', '#66BB6A', '#BA68C8',
          '#42A5F5', '#7E57C2', '#26A69A', '#D4E157'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          labels: { usePointStyle: true },
          onClick: (e, legendItem, legend) => {
            // ✅ Custom legend click — disable default hide/show
            const cat = legendItem.text;
            const catData = allData.filter(r =>
              r.category === cat && (r.type || '').toLowerCase().includes('exp')
            );
            filteredData = catData;
            render(catData);
            document.getElementById('table-container').scrollIntoView({ behavior: 'smooth' });
            showNotification(`Showing expenses for: ${cat}`, 'info');
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      },
      // (Optional) also support clicking directly on chart slices
      onClick: (e, els) => {
        if (!els.length) return;
        const cat = pieChart.data.labels[els[0].index];
        const catData = allData.filter(r =>
          r.category === cat && (r.type || '').toLowerCase().includes('exp')
        );
        filteredData = catData;
        render(catData);
        document.getElementById('table-container').scrollIntoView({ behavior: 'smooth' });
        showNotification(`Showing expenses for: ${cat}`, 'info');
      }
    }
  });
}


    function drawBarChart(labels, values) {
      const ctx = document.getElementById('pieChart').getContext('2d');
      if (pieChart) pieChart.destroy();
      
      pieChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Expenses',
            data: values,
            backgroundColor: '#36A2EB',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${formatCurrency(context.raw)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return formatCurrency(value);
                }
              }
            }
          },
          onClick: (e, els) => {
            if (!els.length) return;
            const cat = pieChart.data.labels[els[0].index];
            const catData = allData.filter(r => 
              r.category === cat && (r.type || '').toLowerCase().includes('exp'));
            filteredData = catData;
            render(catData);
            document.getElementById('table-container').scrollIntoView({ behavior: 'smooth' });
            showNotification(`Showing expenses for: ${cat}`, 'info');
          }
        }
      });
    }

    function drawMonthlyBar(labels, inc, exp) {
      const ctx = document.getElementById('barChart').getContext('2d');
      if (barChart) barChart.destroy();
      
      barChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels.map(m => {
            const [year, month] = m.split('-');
            return new Date(year, month-1).toLocaleDateString('en', { month: 'short', year: 'numeric' });
          }),
          datasets: [
            {
              label: 'Income',
              data: inc,
              backgroundColor: '#10B981',
              borderWidth: 1
            },
            {
              label: 'Expense',
              data: exp,
              backgroundColor: '#EF4444',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return formatCurrency(value);
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                }
              }
            }
          }
        }
      });
    }

    // ---------- TABLE ----------
    function renderTable(data) {
      if (!data.length) {
        tableContainer.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No records to display. Upload data or adjust your filters.</p>
          </div>
        `;
        return;
      }
      
      let html = `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      data.forEach(r => {
        const typeClass = 
          (r.type || '').toLowerCase().includes('inc') ? 'type-income' :
          (r.type || '').toLowerCase().includes('exp') ? 'type-expense' : 'type-transfer';
          
        const amountClass = 
          (r.type || '').toLowerCase().includes('inc') ? 'amount-positive' : 'amount-negative';
        
        html += `
          <tr>
            <td>${r.dateObj ? r.dateObj.toISOString().split('T')[0] : ''}</td>
            <td>${escapeHtml(r.account)}</td>
            <td>${escapeHtml(r.category)}</td>
            <td>${escapeHtml(r.subcategory)}</td>
            <td><span class="type-badge ${typeClass}">${escapeHtml(r.type)}</span></td>
            <td class="${amountClass}">${formatCurrency(r.amount)}</td>
            <td>${escapeHtml(r.note)}</td>
          </tr>
        `;
      });
      
      html += '</tbody></table>';
      tableContainer.innerHTML = html;
    }

    // ---------- CATEGORY SUMMARY ----------
    function renderCategorySummary(data) {
      const container = document.getElementById("categorySummary");
      if (!container) return;
      
      // Summarize expenses only
      const categoryTotals = {};
      const subTotals = {};

      data.filter(r => (r.type || '').toLowerCase().includes('exp')).forEach(r => {
        const cat = r.category || "Other";
        const sub = r.subcategory || "—";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + r.amount;
        if (!subTotals[cat]) subTotals[cat] = {};
        subTotals[cat][sub] = (subTotals[cat][sub] || 0) + r.amount;
      });

      if (!Object.keys(categoryTotals).length) {
        container.innerHTML = "<p class='small'>No expense records found.</p>";
        return;
      }

      // Calculate total for percentage
      const totalExpense = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
      container.innerHTML = "";

      // Create collapsible category sections
      Object.keys(categoryTotals)
        .sort((a, b) => categoryTotals[b] - categoryTotals[a])
        .forEach(cat => {
          const percentage = ((categoryTotals[cat] / totalExpense) * 100).toFixed(1);
          
          const catDiv = document.createElement("div");
          catDiv.className = "category-item";
          catDiv.innerHTML = `
            <div class="cat-header">
              <span>${cat}</span>
              <strong>${formatCurrency(categoryTotals[cat])} (${percentage}%)</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
          `;

          const subDiv = document.createElement("div");
          subDiv.className = "subcategory-list";

          Object.keys(subTotals[cat])
            .sort((a, b) => subTotals[cat][b] - subTotals[cat][a])
            .forEach(sub => {
              const subPercentage = ((subTotals[cat][sub] / categoryTotals[cat]) * 100).toFixed(1);
              const subEl = document.createElement("div");
              subEl.className = "subcategory-item";
              subEl.innerHTML = `
                <span>↳ ${sub}</span>
                <span>${formatCurrency(subTotals[cat][sub])} (${subPercentage}%)</span>
              `;
              subDiv.appendChild(subEl);
            });

          // Toggle visibility
          catDiv.addEventListener("click", () => {
            subDiv.style.display = subDiv.style.display === "block" ? "none" : "block";
          });

          container.appendChild(catDiv);
          container.appendChild(subDiv);
        });
    }
	
function showDurgaSummary(data) {
  const incomeTotal = data
    .filter(d =>
      (d.category === "DurgaDevi") &&
      (d.type.toLowerCase().includes("inc"))
    )
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const expenseTotal = data
    .filter(d =>
      (d.category === "💸 Debt Settlement") &&
      (d.subcategory === "Durga Devi") &&
      (d.type.toLowerCase().includes("exp"))
    )
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const diff = incomeTotal - expenseTotal;

  // Update values
  document.getElementById("durgaIncome").textContent = formatCurrency(incomeTotal);
  document.getElementById("durgaExpense").textContent = formatCurrency(expenseTotal);
  document.getElementById("durgaBalance").textContent = formatCurrency(diff);

  // Update color and trend arrows
  const balanceEl = document.getElementById("durgaBalance");
  const trendEl = document.getElementById("durgaBalanceTrend");

  if (diff > 0) {
    balanceEl.style.color = "#EF4444"; // green
    trendEl.innerHTML = `<i class="fas fa-arrow-up" style="color:#EF4444;"></i> Negative`;
  } else if (diff < 0) {
    balanceEl.style.color = "#10B981" ; // red
    trendEl.innerHTML = `<i class="fas fa-arrow-down" style="color:#10B981;"></i> Positive`;
  } else {
    balanceEl.style.color = "#6B7280"; // gray
    trendEl.innerHTML = `<i class="fas fa-equals" style="color:#6B7280;"></i> Neutral`;
  }
}

function formatCurrency(value) {
  return "₹ " + value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
	


function showDurgaSummary1(data) {
  // 🔹 Total Income for Category "DurgaDevi"
  const incomeTotal = data
    .filter(d =>
      (d.category === "DurgaDevi") &&
      (d.type.toLowerCase().includes("inc"))
    )
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // 🔹 Total Expense for Debt Settlement → Subcategory "Durga Devi"
  const expenseTotal = data
    .filter(d =>
      (d.category === "💸 Debt Settlement") &&
      (d.subcategory === "Durga Devi") &&
      (d.type.toLowerCase().includes("exp"))
    )
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // 🔹 Difference
  const diff = incomeTotal - expenseTotal;

  // 🔹 Update UI (formatted)
  document.getElementById("durgaIncome").textContent = formatCurrency(incomeTotal);
  document.getElementById("durgaExpense").textContent = formatCurrency(expenseTotal);
  document.getElementById("durgaBalance").textContent = formatCurrency(diff);

  // 🔹 Optional: color highlight for positive/negative difference
  const diffEl = document.getElementById("durgaBalance");
  diffEl.style.color = diff >= 0 ? "#10B981" : "#EF4444";
}


    // ---------- EXPORT ----------
    function exportToCsv(rows, filename = 'expenses.csv') {
      if (!rows.length) return showNotification('No data to export', 'error');
      
      const keys = ['dateRaw','account','category','subcategory','type','amount','note'];
      const csv = [keys.join(',')]
        .concat(rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(',')))
        .join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      
      showNotification('CSV exported successfully', 'success');
    }

    function exportToXlsx(rows, filename = 'expenses.xlsx') {
      if (!rows.length) return showNotification('No data to export', 'error');
      
      const out = rows.map(r => ({
        Date: r.dateRaw,
        Account: r.account,
        Category: r.category,
        Subcategory: r.subcategory,
        Type: r.type,
        Amount: r.amount,
        Note: r.note
      }));
      
      const ws = XLSX.utils.json_to_sheet(out);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
      XLSX.writeFile(wb, filename);
      
      showNotification('Excel file exported successfully', 'success');
    }

    // ---------- EVENT LISTENERS ----------
    applyBtn.addEventListener('click', applyAndRender);
    
    resetBtn.addEventListener('click', () => {
      fromDateEl.value = '';
      toDateEl.value = '';
      categorySelect.value = '';
      typeSelect.value = '';
      accountSelect.value = '';
      searchInput.value = '';
      applyAndRender();
      showNotification('Filters reset', 'info');
    });
    
    searchInput.addEventListener('input', () => {
      clearTimeout(searchInput._timer);
      searchInput._timer = setTimeout(applyAndRender, 300);
    });
    
    exportCsvBtn.addEventListener('click', () => 
      exportToCsv(filteredData.length ? filteredData : allData));
    
    exportXlsxBtn.addEventListener('click', () => 
      exportToXlsx(filteredData.length ? filteredData : allData));
    
    refreshBtn.addEventListener('click', loadData);
    
    showAllBtn.addEventListener('click', () => {
      filteredData = allData;
      render(allData);
      showNotification('Showing all records', 'info');
    });
    
    toggleChartBtn.addEventListener('click', () => {
      isPieChart = !isPieChart;
      applyAndRender();
      showNotification(`Switched to ${isPieChart ? 'Pie Chart' : 'Bar Chart'}`, 'info');
    });

    // Set default date range to last 30 days
    window.addEventListener('DOMContentLoaded', () => {
      //const today = new Date();
      //const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      
      //toDateEl.value = today.toISOString().split('T')[0];
      //fromDateEl.value = lastMonth.toISOString().split('T')[0];
      
      loadData();
    });

