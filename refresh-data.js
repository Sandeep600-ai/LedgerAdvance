/**
 * LEDGERLINE — Standalone Data Refresh Script
 * Slices and refreshes data/snapshot.json directly.
 * Designed for Windows Task Scheduler or manual cron execution.
 *
 * Usage:
 *   node refresh-data.js
 *
 * Environment variables (optional, fallback to existing snapshot if missing):
 *   TAVILY_API_KEY
 *   TWELVE_DATA_API_KEY
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.join(__dirname, 'data', 'snapshot.json');
const LOG_PATH = path.join(__dirname, 'refresh.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
  } catch (_) {}
}

async function run() {
  log('Starting Ledgerline data refresh job...');

  let snapshot = { meta: {}, news: [], deepDive: null, universe: {} };
  if (fs.existsSync(SNAPSHOT_PATH)) {
    try {
      snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
      log('Loaded existing snapshot with ' + Object.keys(snapshot.universe || {}).length + ' tickers.');
    } catch (e) {
      log('Failed to parse existing snapshot: ' + e.message);
    }
  }

  const tavilyKey = process.env.TAVILY_API_KEY;
  const twelveDataKey = process.env.TWELVE_DATA_API_KEY;

  // 1. Fetch Indian Market News via Tavily
  if (tavilyKey) {
    log('Fetching Indian market news via Tavily...');
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: 'Indian stock market Sensex Nifty FII DII Indian economy news',
          max_results: 10,
          search_depth: 'basic'
        })
      });
      if (res.ok) {
        const data = await res.json();
        snapshot.news = (data.results || []).map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.content ? r.content.slice(0, 240) + '...' : '',
          source: new URL(r.url).hostname.replace(/^www\./, ''),
          publishedAt: new Date().toISOString().split('T')[0]
        }));
        log(`Successfully fetched ${snapshot.news.length} news articles.`);
      } else {
        log(`Tavily API responded with status ${res.status}`);
      }
    } catch (err) {
      log(`Tavily request error: ${err.message}`);
    }
  } else {
    log('TAVILY_API_KEY not set in environment; preserving current news articles.');
  }

  // 2. Fetch Universe Quotes via Twelve Data
  if (twelveDataKey) {
    const tickers = Object.keys(snapshot.universe || {});
    log(`Fetching market quotes from Twelve Data for ${tickers.length} tickers...`);
    for (const sym of tickers) {
      try {
        const quoteRes = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(sym)}&apikey=${twelveDataKey}`);
        if (quoteRes.ok) {
          const q = await quoteRes.json();
          if (q.status !== 'error') {
            const price = parseFloat(q.close || q.price || '0');
            const change = parseFloat(q.change || '0');
            const changePercent = parseFloat(q.percent_change || '0');

            if (snapshot.universe[sym] && price > 0) {
              snapshot.universe[sym].price = price;
              snapshot.universe[sym].change = change;
              snapshot.universe[sym].changePercent = changePercent;
              snapshot.universe[sym].previousClose = parseFloat(q.previous_close || price);
              snapshot.universe[sym].fiftyTwoWeekHigh = parseFloat(q.fifty_two_week_high || '0');
              snapshot.universe[sym].fiftyTwoWeekLow = parseFloat(q.fifty_two_week_low || '0');
              snapshot.universe[sym].volume = parseInt(q.volume || '0', 10);
            }

            if (sym === 'INFY' && snapshot.deepDive && snapshot.deepDive.quote) {
              snapshot.deepDive.quote.close = price;
              snapshot.deepDive.quote.change = change;
              snapshot.deepDive.quote.changePercent = changePercent;
              snapshot.deepDive.quote.volume = parseInt(q.volume || '0', 10);
            }
          }
        }
      } catch (err) {
        log(`Twelve Data error for ${sym}: ${err.message}`);
      }
    }
    log('Universe quotes refresh completed.');
  } else {
    log('TWELVE_DATA_API_KEY not set in environment; preserving current market quotes.');
  }

  // 3. Update metadata
  snapshot.meta = {
    generatedAt: new Date().toISOString(),
    dataSource: 'Local Refresh Script (refresh-data.js)',
    notes: 'Scheduled execution'
  };

  // 4. Ensure data folder exists & write snapshot
  const dataDir = path.dirname(SNAPSHOT_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
  log('Updated snapshot successfully written to: ' + SNAPSHOT_PATH);

  // 5. Also synchronize data/snapshot.js for direct file:/// execution
  const JS_PATH = path.join(__dirname, 'data', 'snapshot.js');
  const jsHeader = `/**\n * LEDGER ADVANCE - Bundled Snapshot Fallback\n * Auto-generated by refresh-data.js on ${new Date().toISOString()}\n */\nwindow.__LEDGER_SNAPSHOT__ = `;
  fs.writeFileSync(JS_PATH, jsHeader + JSON.stringify(snapshot, null, 2) + ';\n', 'utf8');
  log('Updated bundled snapshot successfully written to: ' + JS_PATH);
}

run().catch(err => {
  log('Fatal refresh error: ' + err.stack);
  process.exit(1);
});
