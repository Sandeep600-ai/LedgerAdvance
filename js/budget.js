/* ============================================================
   LEDGER ADVANCE — Budget Planner
   Income/expense tracker, allocation buckets, compound projections.
   Depends on: charts.js (Charts.drawDonut, Charts.drawProjectionChart)
   ============================================================ */

const Budget = (() => {
  'use strict';

  // ---- State ----
  let monthlyIncome = 80000;       // ₹
  let monthlyExpenses = 50000;     // ₹
  let buckets = [
    { id: _uid(), name: 'Emergency Fund',    pct: 20, color: 'hsl(202, 70%, 50%)' },
    { id: _uid(), name: 'Equity / Mutual Funds', pct: 40, color: 'hsl(144, 70%, 45%)' },
    { id: _uid(), name: 'Fixed Deposits',    pct: 20, color: 'hsl(43, 70%, 50%)' },
    { id: _uid(), name: 'Gold / Commodities', pct: 10, color: 'hsl(29, 80%, 55%)' },
    { id: _uid(), name: 'Discretionary',     pct: 10, color: 'hsl(274, 65%, 50%)' }
  ];
  let projectionYears = 15;
  let annualReturn = 12;   // %
  let inflationRate = 6;   // %
  let showReal = false;    // true = inflation-adjusted

  // ---- Bucket color palette for new buckets ----
  const BUCKET_COLORS = [
    'hsl(0, 70%, 50%)',   'hsl(30, 80%, 55%)',  'hsl(55, 70%, 45%)',
    'hsl(120, 60%, 40%)', 'hsl(180, 60%, 45%)', 'hsl(210, 70%, 50%)',
    'hsl(260, 65%, 55%)', 'hsl(310, 65%, 50%)', 'hsl(340, 70%, 50%)',
    'hsl(160, 70%, 40%)'
  ];

  // ---- Unique ID generator ----
  function _uid() {
    return 'b-' + Math.random().toString(36).substr(2, 8);
  }

  // ---- Core computations ----
  function currentSurplus() {
    return monthlyIncome - monthlyExpenses;
  }

  function totalPct() {
    return buckets.reduce((s, b) => s + b.pct, 0);
  }

  function bucketAllocation(bucket) {
    const surplus = currentSurplus();
    return Math.max(0, surplus * (bucket.pct / 100));
  }

  /**
   * Compound projection for a single bucket.
   * monthlyContribution = surplus * (pct/100)
   * Returns array of values [year0, year1, ..., yearN]
   * If showReal, adjusts for inflation using real rate.
   */
  function projectBucket(bucket, years, rate, inflation, useReal) {
    const monthly = bucketAllocation(bucket);
    const effectiveRate = useReal
      ? ((1 + rate / 100) / (1 + inflation / 100) - 1)
      : rate / 100;
    const r = effectiveRate / 12;

    const result = [0];
    for (let y = 1; y <= years; y++) {
      const n = y * 12;
      // Future value of annuity: PMT × [((1+r)^n - 1) / r]
      let fv;
      if (Math.abs(r) < 1e-10) {
        fv = monthly * n;
      } else {
        fv = monthly * ((Math.pow(1 + r, n) - 1) / r);
      }
      result.push(fv);
    }
    return result;
  }

  function ruleOf72(rate) {
    if (!rate || rate <= 0) return null;
    return +(72 / rate).toFixed(1);
  }

  // ---- DOM Rendering ----

  /** Render income/expense inputs */
  function renderIncomeExpense() {
    const incomeEl = document.getElementById('budget-income');
    const expenseEl = document.getElementById('budget-expenses');
    if (incomeEl) incomeEl.value = monthlyIncome;
    if (expenseEl) expenseEl.value = monthlyExpenses;
    _updateSurplusDisplay();
  }

  function _updateSurplusDisplay() {
    const surplus = currentSurplus();
    const surplusEl = document.getElementById('budget-surplus');
    if (!surplusEl) return;

    surplusEl.textContent = '₹' + surplus.toLocaleString('en-IN');
    surplusEl.classList.toggle('gain', surplus >= 0);
    surplusEl.classList.toggle('loss', surplus < 0);
  }

  /** Render bucket editor rows */
  function renderBuckets() {
    const container = document.getElementById('bucket-list');
    if (!container) return;
    container.innerHTML = '';

    for (const bucket of buckets) {
      const row = document.createElement('div');
      row.className = 'bucket-row';

      // Color dot
      const dot = document.createElement('span');
      dot.className = 'bucket-dot';
      dot.style.width = '10px';
      dot.style.height = '10px';
      dot.style.borderRadius = '50%';
      dot.style.background = bucket.color;
      dot.style.flexShrink = '0';
      row.appendChild(dot);

      // Name input
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'bucket-name-input';
      nameInput.value = bucket.name;
      nameInput.setAttribute('aria-label', 'Bucket name');
      nameInput.addEventListener('input', (e) => {
        bucket.name = e.target.value;
        _onBucketChange();
      });
      row.appendChild(nameInput);

      // Percentage input
      const pctInput = document.createElement('input');
      pctInput.type = 'number';
      pctInput.className = 'bucket-pct-input';
      pctInput.value = bucket.pct;
      pctInput.min = '0';
      pctInput.max = '100';
      pctInput.setAttribute('aria-label', 'Percentage');
      pctInput.addEventListener('input', (e) => {
        bucket.pct = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
        _onBucketChange();
      });
      row.appendChild(pctInput);

      // Percent label
      const pctLabel = document.createElement('span');
      pctLabel.className = 'bucket-pct-label';
      pctLabel.textContent = '%';
      pctLabel.style.color = 'var(--ink-muted)';
      pctLabel.style.fontSize = 'var(--text-sm)';
      row.appendChild(pctLabel);

      // Monthly amount readout
      const amtLabel = document.createElement('span');
      amtLabel.className = 'budget-slider-value';
      amtLabel.textContent = '₹' + Math.round(bucketAllocation(bucket)).toLocaleString('en-IN');
      row.appendChild(amtLabel);

      // Remove button
      if (buckets.length > 1) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'bucket-remove';
        removeBtn.innerHTML = '×';
        removeBtn.setAttribute('aria-label', 'Remove bucket');
        removeBtn.addEventListener('click', () => {
          buckets = buckets.filter(b => b.id !== bucket.id);
          renderBuckets();
          _onBucketChange();
        });
        row.appendChild(removeBtn);
      }

      container.appendChild(row);
    }

    // Add bucket button
    const addBtn = document.createElement('button');
    addBtn.className = 'bucket-add-btn';
    addBtn.innerHTML = '<span>+</span> Add bucket';
    addBtn.addEventListener('click', () => {
      const colorIdx = buckets.length % BUCKET_COLORS.length;
      buckets.push({
        id: _uid(),
        name: 'New Bucket',
        pct: 0,
        color: BUCKET_COLORS[colorIdx]
      });
      renderBuckets();
      _onBucketChange();
    });
    container.appendChild(addBtn);

    // Validation warning
    _renderPctWarning(container);
  }

  function _renderPctWarning(container) {
    // Remove existing warning
    const existing = container.parentElement.querySelector('.bucket-warning');
    if (existing) existing.remove();

    const total = totalPct();
    if (total !== 100) {
      const warn = document.createElement('div');
      warn.className = 'bucket-warning';
      warn.textContent = `Total allocation is ${total}% — must equal 100%`;
      container.parentElement.appendChild(warn);
    }
  }

  /** Render projection controls (sliders) */
  function renderProjectionControls() {
    // Years slider
    _bindSlider('proj-years', projectionYears, 1, 30, 1, (v) => {
      projectionYears = v;
      _onProjectionChange();
    }, (v) => `${v} yr`);

    // Return rate slider
    _bindSlider('proj-return', annualReturn, 1, 25, 0.5, (v) => {
      annualReturn = v;
      _onProjectionChange();
    }, (v) => `${v}%`);

    // Inflation rate slider
    _bindSlider('proj-inflation', inflationRate, 0, 15, 0.5, (v) => {
      inflationRate = v;
      _onProjectionChange();
    }, (v) => `${v}%`);

    // Real vs Nominal toggle
    const toggleSwitch = document.getElementById('proj-real-toggle');
    const nomLabel = document.getElementById('proj-label-nominal');
    const realLabel = document.getElementById('proj-label-real');

    if (toggleSwitch) {
      toggleSwitch.classList.toggle('active', showReal);
      if (nomLabel) nomLabel.classList.toggle('active', !showReal);
      if (realLabel) realLabel.classList.toggle('active', showReal);

      toggleSwitch.addEventListener('click', () => {
        showReal = !showReal;
        toggleSwitch.classList.toggle('active', showReal);
        if (nomLabel) nomLabel.classList.toggle('active', !showReal);
        if (realLabel) realLabel.classList.toggle('active', showReal);
        _onProjectionChange();
      });
    }
  }

  function _bindSlider(id, initial, min, max, step, onChange, formatFn) {
    const slider = document.getElementById(id);
    const valueEl = document.getElementById(id + '-value');
    if (!slider) return;

    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = initial;
    if (valueEl) valueEl.textContent = formatFn(initial);

    slider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (valueEl) valueEl.textContent = formatFn(v);
      onChange(v);
    });
  }

  // ---- Chart wiring ----

  function renderDonut() {
    if (typeof Charts === 'undefined') return;
    const surplus = currentSurplus();
    const segments = buckets.map(b => ({
      value: Math.max(0, surplus * (b.pct / 100)),
      color: b.color
    }));

    Charts.drawDonut('budget-donut-svg', segments, {
      width: 240,
      height: 240,
      centerLabel: '₹' + Charts.formatNum(Math.max(0, surplus)),
      centerSub: 'Monthly surplus'
    });

    // Legend
    const legendEl = document.getElementById('budget-donut-legend');
    if (legendEl) {
      legendEl.innerHTML = '';
      for (const b of buckets) {
        const item = document.createElement('div');
        item.className = 'chart-legend-item';
        item.innerHTML = `
          <span class="chart-legend-swatch" style="background:${b.color}"></span>
          <span>${b.name} (${b.pct}%)</span>
        `;
        legendEl.appendChild(item);
      }
    }
  }

  function renderProjectionChart() {
    if (typeof Charts === 'undefined') return;
    const bucketData = buckets
      .filter(b => b.pct > 0)
      .map(b => ({
        name: b.name,
        color: b.color,
        projections: projectBucket(b, projectionYears, annualReturn, inflationRate, showReal)
      }));

    Charts.drawProjectionChart('budget-projection-svg', bucketData, {
      width: 600,
      height: 280
    });
  }

  function renderRuleOf72() {
    const container = document.getElementById('rule-of-72');
    if (!container) return;

    const effectiveRate = showReal
      ? ((1 + annualReturn / 100) / (1 + inflationRate / 100) - 1) * 100
      : annualReturn;

    const doublingYears = ruleOf72(effectiveRate);
    if (!doublingYears || doublingYears <= 0 || doublingYears > 100) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    const suffix = showReal ? ' (inflation-adjusted)' : '';
    container.innerHTML = `
      <span class="callout-icon">⚡</span>
      <span class="callout-text">
        At <strong>${effectiveRate.toFixed(1)}%</strong> ${showReal ? 'real' : 'nominal'} return${suffix},
        your money doubles roughly every <strong>${doublingYears} years</strong>.
        <span style="color:var(--ink-muted)">(Rule of 72)</span>
      </span>
    `;
  }

  /** Render summary totals at end of projection */
  function renderSummary() {
    const container = document.getElementById('budget-summary');
    if (!container) return;

    const surplus = currentSurplus();
    if (surplus <= 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Increase income or reduce expenses to see projections.</div></div>';
      return;
    }

    const totalContributed = surplus * 12 * projectionYears;

    let totalFutureValue = 0;
    for (const b of buckets) {
      if (b.pct <= 0) continue;
      const proj = projectBucket(b, projectionYears, annualReturn, inflationRate, showReal);
      totalFutureValue += proj[proj.length - 1];
    }

    const totalGrowth = totalFutureValue - totalContributed;
    const suffix = showReal ? ' (real)' : ' (nominal)';

    container.innerHTML = `
      <div class="metric-grid" style="grid-template-columns: repeat(3, 1fr); gap: var(--space-4);">
        <div class="metric-item">
          <div class="metric-label">Total Invested</div>
          <div class="metric-value mono tabular-nums">₹${Charts.formatNum(totalContributed)}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Projected Value${suffix}</div>
          <div class="metric-value mono tabular-nums" style="color:var(--delta-gain)">₹${Charts.formatNum(totalFutureValue)}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Growth</div>
          <div class="metric-value mono tabular-nums" style="color:var(--delta-gain)">₹${Charts.formatNum(totalGrowth)}</div>
        </div>
      </div>
    `;
  }

  // ---- Event handlers ----

  function _onIncomeExpenseChange() {
    _updateSurplusDisplay();
    renderBuckets();   // refresh monthly amounts
    renderDonut();
    renderProjectionChart();
    renderRuleOf72();
    renderSummary();
  }

  function _onBucketChange() {
    renderDonut();
    renderProjectionChart();
    renderRuleOf72();
    renderSummary();
    // Refresh bucket amount readouts
    const rows = document.querySelectorAll('.bucket-row');
    rows.forEach((row, i) => {
      if (i < buckets.length) {
        const amtEl = row.querySelector('.budget-slider-value');
        if (amtEl) {
          amtEl.textContent = '₹' + Math.round(bucketAllocation(buckets[i])).toLocaleString('en-IN');
        }
      }
    });
    // Re-render percentage warning
    const container = document.getElementById('bucket-list');
    if (container) _renderPctWarning(container);
  }

  function _onProjectionChange() {
    renderProjectionChart();
    renderRuleOf72();
    renderSummary();
  }

  // ---- Init ----
  function init() {
    // Bind income/expense inputs
    const incomeEl = document.getElementById('budget-income');
    const expenseEl = document.getElementById('budget-expenses');

    if (incomeEl) {
      incomeEl.value = monthlyIncome;
      incomeEl.addEventListener('input', (e) => {
        monthlyIncome = Math.max(0, parseInt(e.target.value) || 0);
        _onIncomeExpenseChange();
      });
    }
    if (expenseEl) {
      expenseEl.value = monthlyExpenses;
      expenseEl.addEventListener('input', (e) => {
        monthlyExpenses = Math.max(0, parseInt(e.target.value) || 0);
        _onIncomeExpenseChange();
      });
    }

    _updateSurplusDisplay();
    renderBuckets();
    renderProjectionControls();
    renderDonut();
    renderProjectionChart();
    renderRuleOf72();
    renderSummary();
  }

  // ---- Public API ----
  return {
    init,
    currentSurplus,
    renderDonut,
    renderProjectionChart,
    renderBuckets,
    renderSummary
  };
})();
