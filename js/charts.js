/* ============================================================
   LEDGER ADVANCE — Charts
   All SVG drawing functions, parametrized by svgId.
   Uses CSS custom properties for colors — theme-flip is automatic.
   Depends on: tokens.css (via CSS vars in stroke/fill)
   ============================================================ */

const Charts = (() => {
  'use strict';

  // ---- SVG namespace ----
  const NS = 'http://www.w3.org/2000/svg';

  // ---- Utilities ----
  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      e.setAttribute(k, v);
    }
    if (parent) parent.appendChild(e);
    return e;
  }

  function clearSvg(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg) return null;
    svg.innerHTML = '';
    return svg;
  }

  function getMinMax(arr) {
    let min = Infinity, max = -Infinity;
    for (const v of arr) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    // Add 5% padding
    const pad = (max - min) * 0.05 || 1;
    return { min: min - pad, max: max + pad };
  }

  function formatNum(n) {
    if (n == null || isNaN(n)) return '—';
    if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Number(n).toFixed(2);
  }

  function formatPrice(n) {
    if (n == null || isNaN(n)) return '—';
    return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---- Sparkline (Dashboard mini charts) ----
  function drawSparkline(svgId, series, color, opts = {}) {
    const svg = clearSvg(svgId);
    if (!svg || !series || series.length < 2) return;

    const w = opts.width || 120;
    const h = opts.height || 32;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const values = series.map(d => typeof d === 'object' ? d.close || d.value || 0 : d);
    const { min, max } = getMinMax(values);
    const range = max - min || 1;

    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    el('polyline', {
      points: points.join(' '),
      fill: 'none',
      stroke: color || 'var(--accent)',
      'stroke-width': '1.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke'
    }, svg);
  }

  // ---- Price + SMA Area Chart (Company & Dashboard hero) ----
  function drawPriceChart(svgId, priceData, smaData, opts = {}) {
    const svg = clearSvg(svgId);
    if (!svg || !priceData || priceData.length < 2) return;

    const W = opts.width || 700;
    const H = opts.height || 300;
    const PAD = { top: 20, right: 60, bottom: 40, left: 60 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    // Defs — gradient fill
    const defs = el('defs', {}, svg);
    const gradId = svgId + '-areaGrad';
    const grad = el('linearGradient', { id: gradId, x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    el('stop', { offset: '0%', 'stop-color': 'var(--chart-area-fill-start)' }, grad);
    el('stop', { offset: '100%', 'stop-color': 'var(--chart-area-fill-end)' }, grad);

    const prices = priceData.map(d => d.close);
    const allVals = [...prices];
    if (smaData && smaData.length) {
      smaData.forEach(d => allVals.push(d.sma));
    }
    const { min, max } = getMinMax(allVals);
    const range = max - min || 1;

    function xPos(i) { return PAD.left + (i / (priceData.length - 1)) * plotW; }
    function yPos(v) { return PAD.top + (1 - (v - min) / range) * plotH; }

    // Grid lines
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const y = PAD.top + (i / gridCount) * plotH;
      const val = max - (i / gridCount) * range;
      el('line', {
        x1: PAD.left, y1: y, x2: W - PAD.right, y2: y,
        stroke: 'var(--chart-grid)', 'stroke-width': '1'
      }, svg);
      el('text', {
        x: PAD.left - 8, y: y + 4,
        'text-anchor': 'end',
        'font-family': 'var(--font-mono)',
        'font-size': '10',
        fill: 'var(--ink-muted)'
      }, svg).textContent = formatNum(val);
    }

    // X-axis date labels
    const labelCount = Math.min(6, priceData.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round(i * (priceData.length - 1) / (labelCount - 1));
      const d = priceData[idx];
      if (!d) continue;
      const dateStr = d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      el('text', {
        x: xPos(idx), y: H - 8,
        'text-anchor': 'middle',
        'font-family': 'var(--font-mono)',
        'font-size': '10',
        fill: 'var(--ink-muted)'
      }, svg).textContent = dateStr;
    }

    // Area fill
    const areaPoints = priceData.map((d, i) => `${xPos(i).toFixed(1)},${yPos(d.close).toFixed(1)}`);
    const areaPath = `M${areaPoints.join(' L')} L${xPos(priceData.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${PAD.left},${(PAD.top + plotH).toFixed(1)} Z`;
    el('path', {
      d: areaPath,
      fill: `url(#${gradId})`,
    }, svg);

    // Price line
    const linePoints = priceData.map((d, i) => `${xPos(i).toFixed(1)},${yPos(d.close).toFixed(1)}`);
    el('polyline', {
      points: linePoints.join(' '),
      fill: 'none',
      stroke: 'var(--accent)',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }, svg);

    // SMA line
    if (smaData && smaData.length > 1) {
      // Align SMA to price dates
      const priceDateMap = {};
      priceData.forEach((d, i) => { priceDateMap[d.date] = i; });
      const smaPoints = smaData
        .filter(d => priceDateMap[d.date] !== undefined)
        .map(d => `${xPos(priceDateMap[d.date]).toFixed(1)},${yPos(d.sma).toFixed(1)}`);
      if (smaPoints.length > 1) {
        el('polyline', {
          points: smaPoints.join(' '),
          fill: 'none',
          stroke: 'var(--ink-muted)',
          'stroke-width': '1.5',
          'stroke-dasharray': '4,3',
          'stroke-linecap': 'round'
        }, svg);
      }
    }

    // Endpoint label
    const lastPrice = prices[prices.length - 1];
    el('circle', {
      cx: xPos(priceData.length - 1), cy: yPos(lastPrice), r: '3.5',
      fill: 'var(--accent)', stroke: 'var(--bg-card)', 'stroke-width': '2'
    }, svg);
    el('text', {
      x: xPos(priceData.length - 1) + 8, y: yPos(lastPrice) + 4,
      'font-family': 'var(--font-mono)',
      'font-size': '11',
      'font-weight': '600',
      fill: 'var(--accent)'
    }, svg).textContent = formatPrice(lastPrice);

    // Hover overlay
    _addCrosshair(svg, svgId, priceData, PAD, plotW, plotH, xPos, yPos, min, range, W, H);
  }

  // ---- Crosshair hover for price charts ----
  function _addCrosshair(svg, svgId, data, PAD, plotW, plotH, xPos, yPos, min, range, W, H) {
    const overlay = el('rect', {
      x: PAD.left, y: PAD.top, width: plotW, height: plotH,
      fill: 'transparent', style: 'cursor:crosshair'
    }, svg);

    const vLine = el('line', {
      x1: 0, y1: PAD.top, x2: 0, y2: PAD.top + plotH,
      stroke: 'var(--chart-axis)', 'stroke-width': '1', 'stroke-dasharray': '3,2',
      visibility: 'hidden'
    }, svg);

    const dot = el('circle', {
      cx: 0, cy: 0, r: '4',
      fill: 'var(--accent)', stroke: 'var(--bg-card)', 'stroke-width': '2',
      visibility: 'hidden'
    }, svg);

    const tooltipEl = document.querySelector(`#${svgId}-tooltip`) ||
      (() => {
        const t = document.createElement('div');
        t.id = svgId + '-tooltip';
        t.className = 'chart-tooltip';
        svg.parentElement.appendChild(t);
        return t;
      })();

    overlay.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      const scaleX = W / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      const relX = mx - PAD.left;
      const idx = Math.round((relX / plotW) * (data.length - 1));
      if (idx < 0 || idx >= data.length) return;

      const d = data[idx];
      const cx = xPos(idx);
      const cy = yPos(d.close);

      vLine.setAttribute('x1', cx);
      vLine.setAttribute('x2', cx);
      vLine.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', cx);
      dot.setAttribute('cy', cy);
      dot.setAttribute('visibility', 'visible');

      const dateStr = d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      tooltipEl.innerHTML = `<strong>${dateStr}</strong><br>${formatPrice(d.close)}`;
      tooltipEl.classList.add('visible');

      // Position tooltip
      const tx = (cx / W) * rect.width;
      const ty = (cy / H) * rect.height;
      tooltipEl.style.left = (tx + 12) + 'px';
      tooltipEl.style.top = (ty - 30) + 'px';
    });

    overlay.addEventListener('mouseleave', () => {
      vLine.setAttribute('visibility', 'hidden');
      dot.setAttribute('visibility', 'hidden');
      tooltipEl.classList.remove('visible');
    });
  }

  // ---- Volume Bar Chart ----
  function drawVolumeChart(svgId, data, opts = {}) {
    const svg = clearSvg(svgId);
    if (!svg || !data || data.length < 2) return;

    const W = opts.width || 700;
    const H = opts.height || 80;
    const PAD = { top: 5, right: 60, bottom: 5, left: 60 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const volumes = data.map(d => d.volume || 0);
    const maxVol = Math.max(...volumes) || 1;
    const barW = Math.max(1, (plotW / data.length) - 1);

    data.forEach((d, i) => {
      const x = PAD.left + (i / data.length) * plotW;
      const barH = (d.volume / maxVol) * plotH;
      el('rect', {
        x: x.toFixed(1), y: (PAD.top + plotH - barH).toFixed(1),
        width: barW.toFixed(1), height: barH.toFixed(1),
        fill: 'var(--chart-volume)',
        rx: '1'
      }, svg);
    });
  }

  // ---- RSI Gauge ----
  function drawRSIGauge(svgId, rsiValue) {
    const svg = clearSvg(svgId);
    if (!svg) return;

    const W = 200, H = 110;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const cx = W / 2, cy = 90, r = 70;
    const startAngle = Math.PI;
    const endAngle = 0;

    function arcPoint(angle) {
      return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
    }

    // Background arc
    const bgStart = arcPoint(startAngle);
    const bgEnd = arcPoint(endAngle);
    el('path', {
      d: `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`,
      fill: 'none',
      stroke: 'var(--chart-grid)',
      'stroke-width': '8',
      'stroke-linecap': 'round'
    }, svg);

    // Value arc
    const valAngle = startAngle - (Math.min(100, Math.max(0, rsiValue)) / 100) * Math.PI;
    const valEnd = arcPoint(valAngle);
    const largeArc = rsiValue > 50 ? 1 : 0;

    let color = 'var(--rsi-neutral)';
    if (rsiValue < 30) color = 'var(--rsi-oversold)';
    else if (rsiValue > 70) color = 'var(--rsi-overbought)';

    el('path', {
      d: `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${valEnd.x} ${valEnd.y}`,
      fill: 'none',
      stroke: color,
      'stroke-width': '8',
      'stroke-linecap': 'round'
    }, svg);

    // Center value
    el('text', {
      x: cx, y: cy - 10,
      'text-anchor': 'middle',
      'font-family': 'var(--font-mono)',
      'font-size': '24',
      'font-weight': '700',
      fill: 'var(--ink-primary)'
    }, svg).textContent = Math.round(rsiValue);

    el('text', {
      x: cx, y: cy + 8,
      'text-anchor': 'middle',
      'font-family': 'var(--font-body)',
      'font-size': '11',
      fill: 'var(--ink-muted)'
    }, svg).textContent = 'RSI (14)';

    // Scale labels
    el('text', { x: cx - r - 5, y: cy + 6, 'text-anchor': 'end', 'font-size': '9', fill: 'var(--ink-muted)', 'font-family': 'var(--font-mono)' }, svg).textContent = '0';
    el('text', { x: cx + r + 5, y: cy + 6, 'text-anchor': 'start', 'font-size': '9', fill: 'var(--ink-muted)', 'font-family': 'var(--font-mono)' }, svg).textContent = '100';
  }

  // ---- Indexed Performance Chart (Compare) ----
  function drawIndexedPerformance(svgId, tickerSeries, tickerColors, opts = {}) {
    const svg = clearSvg(svgId);
    if (!svg) return;

    const symbols = Object.keys(tickerSeries);
    if (symbols.length === 0) return;

    const W = opts.width || 600;
    const H = opts.height || 320;
    const PAD = { top: 20, right: 80, bottom: 40, left: 50 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    // Rebase each series to 100 at day 0
    const indexed = {};
    let minVal = Infinity, maxVal = -Infinity;
    let maxLen = 0;
    let refDates = [];

    for (const sym of symbols) {
      const series = tickerSeries[sym];
      if (!series || series.length < 2) continue;
      const base = series[0].close || series[0];
      if (!base) continue;
      indexed[sym] = series.map(d => {
        const v = ((typeof d === 'object' ? d.close : d) / base) * 100;
        return v;
      });
      indexed[sym].forEach(v => {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      });
      if (series.length > maxLen) {
        maxLen = series.length;
        refDates = series.map(d => typeof d === 'object' ? d.date : null);
      }
    }

    if (Object.keys(indexed).length === 0) return;

    const pad = (maxVal - minVal) * 0.08 || 5;
    minVal -= pad;
    maxVal += pad;
    const range = maxVal - minVal || 1;

    function xPos(i) { return PAD.left + (i / (maxLen - 1)) * plotW; }
    function yPos(v) { return PAD.top + (1 - (v - minVal) / range) * plotH; }

    // Grid
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const y = PAD.top + (i / gridCount) * plotH;
      const val = maxVal - (i / gridCount) * range;
      el('line', {
        x1: PAD.left, y1: y, x2: W - PAD.right, y2: y,
        stroke: 'var(--chart-grid)', 'stroke-width': '1'
      }, svg);
      el('text', {
        x: PAD.left - 8, y: y + 4,
        'text-anchor': 'end', 'font-family': 'var(--font-mono)', 'font-size': '10', fill: 'var(--ink-muted)'
      }, svg).textContent = val.toFixed(0);
    }

    // 100 baseline
    const baseY = yPos(100);
    if (baseY > PAD.top && baseY < PAD.top + plotH) {
      el('line', {
        x1: PAD.left, y1: baseY, x2: W - PAD.right, y2: baseY,
        stroke: 'var(--chart-axis)', 'stroke-width': '1', 'stroke-dasharray': '4,3'
      }, svg);
    }

    // Date labels
    const labelCount = Math.min(6, maxLen);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round(i * (maxLen - 1) / (labelCount - 1));
      const dateStr = refDates[idx] ? new Date(refDates[idx]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      el('text', {
        x: xPos(idx), y: H - 8,
        'text-anchor': 'middle', 'font-family': 'var(--font-mono)', 'font-size': '10', fill: 'var(--ink-muted)'
      }, svg).textContent = dateStr;
    }

    // Lines + endpoint labels with collision avoidance
    const endLabels = [];
    for (const sym of Object.keys(indexed)) {
      const vals = indexed[sym];
      const color = tickerColors[sym] || 'var(--accent)';
      const points = vals.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`);

      el('polyline', {
        points: points.join(' '),
        fill: 'none',
        stroke: color,
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }, svg);

      const lastVal = vals[vals.length - 1];
      endLabels.push({ sym, val: lastVal, y: yPos(lastVal), color });
    }

    // Collision avoidance for endpoint labels
    endLabels.sort((a, b) => a.y - b.y);
    const minGap = 14;
    for (let i = 1; i < endLabels.length; i++) {
      if (endLabels[i].y - endLabels[i - 1].y < minGap) {
        endLabels[i].y = endLabels[i - 1].y + minGap;
      }
    }

    for (const lbl of endLabels) {
      el('circle', {
        cx: xPos(maxLen - 1), cy: yPos(lbl.val), r: '3',
        fill: lbl.color, stroke: 'var(--bg-card)', 'stroke-width': '1.5'
      }, svg);
      el('text', {
        x: W - PAD.right + 8, y: lbl.y + 4,
        'font-family': 'var(--font-mono)', 'font-size': '10', 'font-weight': '600',
        fill: lbl.color
      }, svg).textContent = `${lbl.sym} ${lbl.val.toFixed(1)}`;
    }

    // Hover crosshair
    _addIndexedCrosshair(svg, svgId, indexed, tickerColors, refDates, maxLen, PAD, plotW, plotH, xPos, yPos, W, H);
  }

  function _addIndexedCrosshair(svg, svgId, indexed, colors, dates, len, PAD, plotW, plotH, xPos, yPos, W, H) {
    const overlay = el('rect', {
      x: PAD.left, y: PAD.top, width: plotW, height: plotH,
      fill: 'transparent', style: 'cursor:crosshair'
    }, svg);

    const vLine = el('line', {
      x1: 0, y1: PAD.top, x2: 0, y2: PAD.top + plotH,
      stroke: 'var(--chart-axis)', 'stroke-width': '1', 'stroke-dasharray': '3,2',
      visibility: 'hidden'
    }, svg);

    const tooltipEl = document.querySelector(`#${svgId}-tooltip`) ||
      (() => {
        const t = document.createElement('div');
        t.id = svgId + '-tooltip';
        t.className = 'chart-tooltip';
        svg.parentElement.appendChild(t);
        return t;
      })();

    overlay.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      const scaleX = W / rect.width;
      const mx = (e.clientX - rect.left) * scaleX;
      const relX = mx - PAD.left;
      const idx = Math.round((relX / plotW) * (len - 1));
      if (idx < 0 || idx >= len) return;

      const cx = xPos(idx);
      vLine.setAttribute('x1', cx);
      vLine.setAttribute('x2', cx);
      vLine.setAttribute('visibility', 'visible');

      const dateStr = dates[idx] ? new Date(dates[idx]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Day ${idx}`;
      let html = `<strong>${dateStr}</strong>`;
      for (const sym of Object.keys(indexed)) {
        const val = indexed[sym][idx];
        if (val != null) {
          html += `<br><span style="color:${colors[sym] || 'inherit'}">${sym}: ${val.toFixed(1)}</span>`;
        }
      }
      tooltipEl.innerHTML = html;
      tooltipEl.classList.add('visible');
      const tx = (cx / W) * rect.width;
      tooltipEl.style.left = (tx + 12) + 'px';
      tooltipEl.style.top = '10px';
    });

    overlay.addEventListener('mouseleave', () => {
      vLine.setAttribute('visibility', 'hidden');
      tooltipEl.classList.remove('visible');
    });
  }

  // ---- Radar Chart (Compare) ----
  function drawRadarChart(svgId, datasets, labels, opts = {}) {
    const svg = clearSvg(svgId);
    if (!svg || !datasets || datasets.length === 0) return;

    const W = opts.width || 300;
    const H = opts.height || 300;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const cx = W / 2, cy = H / 2;
    const r = Math.min(W, H) / 2 - 40;
    const n = labels.length;
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    // Grid rings
    for (let ring = 1; ring <= 4; ring++) {
      const rr = (ring / 4) * r;
      const points = [];
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep;
        points.push(`${(cx + rr * Math.cos(angle)).toFixed(1)},${(cy + rr * Math.sin(angle)).toFixed(1)}`);
      }
      el('polygon', {
        points: points.join(' '),
        fill: 'none',
        stroke: 'var(--chart-grid)',
        'stroke-width': '1'
      }, svg);
    }

    // Axis lines + labels
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const ex = cx + r * Math.cos(angle);
      const ey = cy + r * Math.sin(angle);

      el('line', {
        x1: cx, y1: cy, x2: ex, y2: ey,
        stroke: 'var(--chart-grid)', 'stroke-width': '1'
      }, svg);

      const lx = cx + (r + 16) * Math.cos(angle);
      const ly = cy + (r + 16) * Math.sin(angle);
      const anchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';

      el('text', {
        x: lx, y: ly + 4,
        'text-anchor': anchor,
        'font-family': 'var(--font-body)',
        'font-size': '10',
        fill: 'var(--ink-muted)'
      }, svg).textContent = labels[i];
    }

    // Data polygons
    for (const ds of datasets) {
      const points = ds.values.map((v, i) => {
        const vr = (Math.min(1, Math.max(0, v)) * r);
        const angle = startAngle + i * angleStep;
        return `${(cx + vr * Math.cos(angle)).toFixed(1)},${(cy + vr * Math.sin(angle)).toFixed(1)}`;
      });

      el('polygon', {
        points: points.join(' '),
        fill: ds.color ? ds.color.replace(')', ', 0.12)').replace('hsl', 'hsla').replace('rgb', 'rgba') : 'var(--accent-light)',
        stroke: ds.color || 'var(--accent)',
        'stroke-width': '2'
      }, svg);
    }
  }

  // ---- Donut Chart ----
  function drawDonut(svgId, segments, opts = {}) {
    const svg = clearSvg(svgId);
    if (!svg || !segments || segments.length === 0) return;

    const W = opts.width || 240;
    const H = opts.height || 240;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const cx = W / 2, cy = H / 2;
    const outerR = Math.min(W, H) / 2 - 10;
    const innerR = outerR * 0.62;
    const total = segments.reduce((s, seg) => s + (seg.value || 0), 0) || 1;

    let startAngle = -Math.PI / 2;

    for (const seg of segments) {
      const fraction = seg.value / total;
      const endAngle = startAngle + fraction * 2 * Math.PI;
      const largeArc = fraction > 0.5 ? 1 : 0;

      const x1 = cx + outerR * Math.cos(startAngle);
      const y1 = cy + outerR * Math.sin(startAngle);
      const x2 = cx + outerR * Math.cos(endAngle);
      const y2 = cy + outerR * Math.sin(endAngle);
      const x3 = cx + innerR * Math.cos(endAngle);
      const y3 = cy + innerR * Math.sin(endAngle);
      const x4 = cx + innerR * Math.cos(startAngle);
      const y4 = cy + innerR * Math.sin(startAngle);

      el('path', {
        d: `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`,
        fill: seg.color || 'var(--accent)',
        stroke: 'var(--bg-card)',
        'stroke-width': '2'
      }, svg);

      startAngle = endAngle;
    }

    // Center label
    if (opts.centerLabel) {
      el('text', {
        x: cx, y: cy - 4,
        'text-anchor': 'middle',
        'font-family': 'var(--font-mono)',
        'font-size': '18',
        'font-weight': '700',
        fill: 'var(--ink-primary)'
      }, svg).textContent = opts.centerLabel;
    }
    if (opts.centerSub) {
      el('text', {
        x: cx, y: cy + 14,
        'text-anchor': 'middle',
        'font-family': 'var(--font-body)',
        'font-size': '10',
        fill: 'var(--ink-muted)'
      }, svg).textContent = opts.centerSub;
    }
  }

  // ---- Projection Line Chart (Budget) ----
  function drawProjectionChart(svgId, bucketData, opts = {}) {
    const svg = clearSvg(svgId);
    if (!svg || !bucketData || bucketData.length === 0) return;

    const W = opts.width || 600;
    const H = opts.height || 280;
    const PAD = { top: 20, right: 80, bottom: 40, left: 70 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    // Find global max
    let maxVal = 0;
    let maxYears = 0;
    for (const b of bucketData) {
      if (b.projections && b.projections.length > maxYears) maxYears = b.projections.length;
      if (b.projections) b.projections.forEach(v => { if (v > maxVal) maxVal = v; });
    }
    if (maxYears < 2) maxYears = 2;
    if (maxVal === 0) maxVal = 100;
    const pad = maxVal * 0.08;
    maxVal += pad;

    function xPos(i) { return PAD.left + (i / (maxYears - 1)) * plotW; }
    function yPos(v) { return PAD.top + (1 - v / maxVal) * plotH; }

    // Grid
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const y = PAD.top + (i / gridCount) * plotH;
      const val = maxVal * (1 - i / gridCount);
      el('line', {
        x1: PAD.left, y1: y, x2: W - PAD.right, y2: y,
        stroke: 'var(--chart-grid)', 'stroke-width': '1'
      }, svg);
      el('text', {
        x: PAD.left - 8, y: y + 4,
        'text-anchor': 'end', 'font-family': 'var(--font-mono)', 'font-size': '10', fill: 'var(--ink-muted)'
      }, svg).textContent = formatNum(val);
    }

    // Year labels
    const yearLabelCount = Math.min(8, maxYears);
    for (let i = 0; i < yearLabelCount; i++) {
      const idx = Math.round(i * (maxYears - 1) / (yearLabelCount - 1));
      el('text', {
        x: xPos(idx), y: H - 8,
        'text-anchor': 'middle', 'font-family': 'var(--font-mono)', 'font-size': '10', fill: 'var(--ink-muted)'
      }, svg).textContent = `Y${idx}`;
    }

    // Lines
    const endLabels = [];
    for (const b of bucketData) {
      if (!b.projections || b.projections.length < 2) continue;
      const points = b.projections.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`);
      el('polyline', {
        points: points.join(' '),
        fill: 'none',
        stroke: b.color || 'var(--accent)',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }, svg);

      const lastVal = b.projections[b.projections.length - 1];
      endLabels.push({ name: b.name, val: lastVal, y: yPos(lastVal), color: b.color });
    }

    // Collision avoidance
    endLabels.sort((a, b) => a.y - b.y);
    const minGap = 14;
    for (let i = 1; i < endLabels.length; i++) {
      if (endLabels[i].y - endLabels[i - 1].y < minGap) {
        endLabels[i].y = endLabels[i - 1].y + minGap;
      }
    }

    for (const lbl of endLabels) {
      el('text', {
        x: W - PAD.right + 8, y: lbl.y + 4,
        'font-family': 'var(--font-mono)', 'font-size': '9', 'font-weight': '600',
        fill: lbl.color || 'var(--accent)'
      }, svg).textContent = `${lbl.name}: ${formatNum(lbl.val)}`;
    }
  }

  // ---- Public API ----
  return {
    drawSparkline,
    drawPriceChart,
    drawVolumeChart,
    drawRSIGauge,
    drawIndexedPerformance,
    drawRadarChart,
    drawDonut,
    drawProjectionChart,
    formatNum,
    formatPrice
  };
})();
