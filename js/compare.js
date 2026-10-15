/* ============================================================
   LEDGER ADVANCE — Compare Section
   Ticker picker, tape cards, indexed chart, radar, donut, table.
   Depends on: charts.js, app.js (for shared state)
   ============================================================ */

const Compare = (() => {
  'use strict';

  const MAX_SELECTED = 5;
  let selected = []; // array of ticker symbols (up to 5)

  // ---- Render pill picker ----
  function renderPicker(containerId, universe) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'pill-grid';

    for (const ticker of universe) {
      const pill = document.createElement('button');
      pill.className = 'pill' + (selected.includes(ticker.symbol) ? ' active' : '');
      pill.dataset.symbol = ticker.symbol;

      const dot = document.createElement('span');
      dot.className = 'pill-dot';
      dot.style.background = ticker.color;
      pill.appendChild(dot);

      const label = document.createTextNode(ticker.symbol);
      pill.appendChild(label);

      pill.addEventListener('click', () => {
        toggleTicker(ticker.symbol, universe);
      });

      grid.appendChild(pill);
    }

    container.appendChild(grid);
  }

  // ---- Toggle ticker selection ----
  function toggleTicker(symbol, universe) {
    const idx = selected.indexOf(symbol);
    if (idx !== -1) {
      // Deselect
      selected.splice(idx, 1);
    } else {
      // Select — FIFO eviction if at max
      if (selected.length >= MAX_SELECTED) {
        selected.shift();
      }
      selected.push(symbol);
    }

    // Re-render everything
    renderAll(universe);

    // Pulse the newly added pill
    if (idx === -1) {
      const pill = document.querySelector(`.pill[data-symbol="${symbol}"]`);
      if (pill) {
        pill.classList.add('pulse');
        setTimeout(() => pill.classList.remove('pulse'), 400);
      }
    }
  }

  // ---- Render tape row ----
  function renderTape(containerId, universe) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (selected.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-text">Select up to 5 tickers above to compare</div></div>';
      return;
    }

    for (const sym of selected) {
      const ticker = universe.find(t => t.symbol === sym);
      if (!ticker) continue;

      const card = document.createElement('div');
      card.className = 'tape-card';

      const info = document.createElement('div');
      const symEl = document.createElement('div');
      symEl.className = 'tape-card-symbol';
      symEl.textContent = ticker.symbol;
      info.appendChild(symEl);

      const priceEl = document.createElement('div');
      priceEl.className = 'tape-card-price';
      priceEl.textContent = Charts.formatPrice(ticker.price);
      info.appendChild(priceEl);

      const changeEl = document.createElement('div');
      const pct = ticker.changePercent || 0;
      changeEl.className = 'tape-card-change ' + (pct >= 0 ? 'gain' : 'loss');
      changeEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
      info.appendChild(changeEl);

      card.appendChild(info);

      // Mini sparkline
      const sparkDiv = document.createElement('div');
      sparkDiv.className = 'tape-card-sparkline';
      const sparkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sparkSvg.id = 'tape-spark-' + sym;
      sparkDiv.appendChild(sparkSvg);
      card.appendChild(sparkDiv);

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'tape-card-close';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTicker(sym, universe);
      });
      card.appendChild(closeBtn);

      container.appendChild(card);

      // Draw sparkline after DOM insertion
      requestAnimationFrame(() => {
        Charts.drawSparkline('tape-spark-' + sym, ticker.timeSeries, ticker.color, { width: 60, height: 24 });
      });
    }
  }

  // ---- Render indexed performance chart ----
  function renderIndexedChart(svgId, universe) {
    const series = {};
    const colors = {};
    for (const sym of selected) {
      const ticker = universe.find(t => t.symbol === sym);
      if (ticker && ticker.timeSeries && ticker.timeSeries.length > 1) {
        series[sym] = ticker.timeSeries;
        colors[sym] = ticker.color;
      }
    }
    Charts.drawIndexedPerformance(svgId, series, colors);
  }

  // ---- Render radar chart ----
  function renderRadarChart(svgId, universe) {
    const labels = ['ROE', 'Profit Margin', 'Div. Yield', 'Value (inv P/E)', 'Rev. Growth'];
    const datasets = [];

    for (const sym of selected) {
      const t = universe.find(u => u.symbol === sym);
      if (!t) continue;

      // Normalize each metric to 0–1
      const roe = Math.min(1, Math.max(0, (t.roe || 0) / 50));
      const margin = Math.min(1, Math.max(0, (t.profitMargin || 0) / 40));
      const divYield = Math.min(1, Math.max(0, (t.dividendYield || 0) / 5));
      const invPE = t.pe ? Math.min(1, Math.max(0, (1 / t.pe) * 30)) : 0;
      const growth = Math.min(1, Math.max(0, ((t.revenueGrowth || 0) + 10) / 50));

      datasets.push({
        label: sym,
        values: [roe, margin, divYield, invPE, growth],
        color: t.color
      });
    }

    Charts.drawRadarChart(svgId, datasets, labels);
  }

  // ---- Render market cap donut ----
  function renderDonut(svgId, universe) {
    const segments = [];
    for (const sym of selected) {
      const t = universe.find(u => u.symbol === sym);
      if (t && t.marketCap) {
        segments.push({
          label: sym,
          value: t.marketCap,
          color: t.color
        });
      }
    }
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    Charts.drawDonut(svgId, segments, {
      centerLabel: Charts.formatNum(total),
      centerSub: 'Total Mkt Cap'
    });
  }

  // ---- Render donut legend ----
  function renderDonutLegend(containerId, universe) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const total = selected.reduce((s, sym) => {
      const t = universe.find(u => u.symbol === sym);
      return s + (t && t.marketCap ? t.marketCap : 0);
    }, 0);

    for (const sym of selected) {
      const t = universe.find(u => u.symbol === sym);
      if (!t || !t.marketCap) continue;

      const item = document.createElement('div');
      item.className = 'chart-legend-item';

      const swatch = document.createElement('span');
      swatch.className = 'chart-legend-swatch';
      swatch.style.background = t.color;
      item.appendChild(swatch);

      const text = document.createTextNode(`${sym}: ${Charts.formatNum(t.marketCap)} (${((t.marketCap / total) * 100).toFixed(1)}%)`);
      item.appendChild(text);

      container.appendChild(item);
    }
  }

  // ---- Render metrics table ----
  function renderTable(tableId, universe) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (const sym of selected) {
      const t = universe.find(u => u.symbol === sym);
      if (!t) continue;

      const tr = document.createElement('tr');
      const cells = [
        t.symbol,
        Charts.formatPrice(t.price),
        (t.changePercent >= 0 ? '+' : '') + (t.changePercent || 0).toFixed(2) + '%',
        Charts.formatNum(t.marketCap),
        t.pe ? t.pe.toFixed(1) : '—',
        t.roe ? t.roe.toFixed(1) + '%' : '—',
        t.dividendYield ? t.dividendYield.toFixed(2) + '%' : '—'
      ];

      cells.forEach((text, i) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (i === 2) {
          td.className = (t.changePercent || 0) >= 0 ? 'gain' : 'loss';
          td.style.color = (t.changePercent || 0) >= 0 ? 'var(--delta-gain)' : 'var(--delta-loss)';
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }
  }

  // ---- Render all ----
  function renderAll(universe) {
    renderPicker('compare-picker', universe);
    renderTape('compare-tape', universe);
    renderIndexedChart('compare-indexed-svg', universe);
    renderRadarChart('compare-radar-svg', universe);
    renderDonut('compare-donut-svg', universe);
    renderDonutLegend('compare-donut-legend', universe);
    renderTable('compare-table', universe);
  }

  // ---- Get selected tickers (for Dashboard watchlist) ----
  function getSelected() {
    return [...selected];
  }

  // ---- Add ticker programmatically (from search) ----
  function addTicker(symbol, universe) {
    if (!selected.includes(symbol)) {
      if (selected.length >= MAX_SELECTED) {
        selected.shift();
      }
      selected.push(symbol);
      renderAll(universe);
    }
  }

  // ---- Init with defaults ----
  function init(universe, defaults) {
    selected = defaults || ['INFY', 'AAPL', 'MSFT'];
    renderAll(universe);
  }

  return {
    init,
    renderAll,
    getSelected,
    addTicker,
    toggleTicker,
    renderPicker,
    renderTape
  };
})();
