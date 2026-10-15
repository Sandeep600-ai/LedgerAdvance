# LedgerAdvance — Personal Finance & Market Intelligence Dashboard

LedgerAdvance is an advanced, high-performance personal finance dashboard combining live-sourced Indian equity and macroeconomic market news, real-time India Standard Time (IST) tracking, deep technical company analysis with custom SVG charts, a multi-ticker comparison tool supporting up to 5 stocks simultaneously, and a client-side budget planner with long-term compounding growth projections.

The application is engineered as a lightweight, zero-dependency web application using modern vanilla web technologies, native SVG data visualization, and modular client-side architecture.

---

## Key Features

### 1. Main Dashboard
- **Real-Time India Standard Time (IST) Clock:** Active header clock synchronized to `Asia/Kolkata` (UTC+05:30) in standard 12-hour AM/PM format, updating automatically every second.
- **Hero Price Card:** Dynamic hero quote card (INFY ADR) with dual-currency display (USD and converted INR `₹`), day change indicator, market status badge, and sparkline visualization.
- **Dynamic Market Movers:** Top Gainer and Top Decliner stat cards automatically calculated from the active 25-ticker universe based on authentic market session data.
- **Budget Surplus Metric:** Live integration displaying current monthly surplus calculated directly from the Budget Planner.
- **90-Day Technical Chart & SMA:** 90-day historical closing price line with a 20-day Simple Moving Average (SMA) overlay.
- **14-Day RSI Gauge:** Radial indicator displaying 14-day Relative Strength Index (RSI) with automated Overbought, Neutral, and Oversold categorization.
- **Macro News Preview:** Direct access to recent headlines from Indian financial media.

### 2. Indian Equity & Macro Market News
- Dedicated news section pulling real-time market updates covering benchmark indices (Sensex, Nifty 50), institutional liquidity (FII/DII flows), foreign exchange movements, and corporate developments.
- Clean card presentation displaying publication dates, publisher sources, article snippets, and direct links to original coverage.

### 3. Company Deep-Dive
- Comprehensive company analysis module supporting 25 global and Indian ADR tickers:
  - **Indian ADRs:** INFY (Infosys), WIT (Wipro), IBN (ICICI Bank), HDB (HDFC Bank).
  - **US Equities:** AAPL, MSFT, GOOGL, TSLA, NVDA, AMZN, META, NFLX, DIS, KO, JPM, WMT, V, JNJ, PG, XOM, BAC, NKE, UNH, COST, CRM.
- **Real-Time Live & Verified Quotes:** Fully resolved real-time stock price engine with automatic 45-second background synchronization. Accurately renders real-time bid/ask prices when exchanges are open (`● Live Market Price`), or calibrated completed session close quotes (`● NYSE Closed · Prev Close`, `● Pre-Market`, or `● After-Hours`) when markets are closed.
- **Technical Analysis Charts:**
  - 90-Day price history with 20-day SMA overlay.
  - Historical trading volume histogram.
  - 14-Day RSI radial gauge.
- **Fundamental Scorecard:** Market capitalization, P/E ratio, EPS, ROE, profit margin, dividend yield, revenue growth, and 52-week trading range.

### 4. Multi-Ticker Stock Comparison
- Compare up to **5 stocks simultaneously** across customizable performance metrics.
- Overlaid comparative price performance chart normalizing multiple tickers onto a single scale.
- Trading volume comparison chart.
- Multi-column comparison matrix comparing valuation, profitability, growth, and price changes side-by-side.

### 5. Client-Side Budget & Compounding Planner
- **50/30/20 Allocation Engine:** Income and expense breakdown into Needs (50%), Wants (30%), and Investable Surplus (20%).
- **Customizable Surplus Distribution:** Dynamic allocation sliders for Equity Investments, Mutual Funds, Emergency Reserves, and Discretionary capital (enforces 100% total allocation).
- **Surplus Distribution Donut:** Custom SVG interactive donut chart displaying proportional surplus allocation.
- **Multi-Year Compounding Trajectory:** Interactive projections spanning 1 to 30 years with adjustable annualized return rates and inflation adjustments (Nominal vs. Real values).
- **Rule of 72 Milestone Callout:** Instant calculation of investment doubling periods based on selected expected returns.

### 6. Design System & Theme Engine
- Curated dark and light color palettes defined entirely through CSS custom properties.
- Normalized CSS Grid layout with strict boundaries to eliminate horizontal overflow across all screen sizes.
- Smooth transitions, micro-animations, and responsive breakpoints for desktop, laptop, and mobile devices.

---

## Technologies & Dependencies

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Markup** | HTML5 | Semantic HTML structure, accessible ARIA attributes, SVG containers |
| **Styling** | Vanilla CSS3 | Custom properties (CSS variables), CSS Grid, Flexbox, responsive media queries |
| **Scripting** | Modern ES6+ JavaScript | Modular IIFE architecture, asynchronous Fetch API, Intl API for timezones |
| **Charts** | Native SVG | Custom SVG rendering engine (`charts.js`) with zero external graphing dependencies |
| **Local Server** | Windows PowerShell 5.1+ | Zero-dependency HTTP server utilizing .NET `System.Net.HttpListener` |
| **Serverless API** | TypeScript (`.mts`) | Netlify Functions using `@netlify/functions` and `@netlify/blobs` for quote caching |
| **Data Format** | JSON & JavaScript | Dual persistence via `snapshot.json` and window-bound fallback `snapshot.js` |

---

## Project Structure

```
Ledger advance/
├── data/
│   ├── snapshot.js                # Bundled fallback snapshot (window.__LEDGER_SNAPSHOT__) for offline/file:// use
│   └── snapshot.json              # Primary market snapshot data (metadata, news, hero deep-dive, 25-ticker universe)
├── js/
│   ├── app.js                     # Core controller: routing, ticker universe, search, IST clock, stock detail renderer
│   ├── budget.js                  # Budget planner: 50/30/20 calculations, surplus allocation, compounding projections
│   ├── charts.js                  # Custom SVG charting library (price/SMA lines, volume bars, RSI gauges, donut charts)
│   └── compare.js                 # Stock comparison controller: 5-ticker selection, comparative charts, metrics table
├── netlify/
│   └── functions/
│       ├── declarations.d.ts      # Ambient TypeScript declarations for @netlify/blobs and @netlify/functions
│       ├── data.mts               # Serverless endpoint serving cached snapshot data
│       ├── quote-live.mts         # Live quote proxy querying Twelve Data with 45-second Blob cache
│       ├── quotes.mts             # Bulk universe quote synchronization endpoint
│       └── scheduled/
│           └── daily-refresh.mts  # Scheduled cron function refreshing market quotes and news
├── styles/
│   ├── components.css             # Component-level styles (cards, charts, buttons, form controls, tables, badges)
│   ├── layout.css                 # Layout engine: app shell grid, responsive topbar, fixed sidebar, breakpoints
│   └── tokens.css                 # Design tokens: color schemes (dark/light), typography, spacing, elevations
├── index.html                     # Main application entry point and single-page container markup
├── netlify.toml                   # Netlify build configuration and serverless function redirects
├── package.json                   # Node package manifest declaring Netlify dependencies and scripts
├── PROGRESS.md                    # Technical log recording project phases, architecture notes, and verifications
├── README.md                      # Developer documentation and project reference manual
├── refresh-data.js                # Standalone Node.js script for automated local or scheduled data pipeline refresh
├── server.ps1                     # Lightweight PowerShell HTTP server script for local development
└── tsconfig.json                  # TypeScript compiler options (NodeNext, ES2022) for serverless functions
```

---

## Detailed File Descriptions

### Core Application Files
- **`index.html`**: The root HTML file containing the app shell, sidebar navigation, top bar with search and live Indian clock, and view sections (`#sec-dashboard`, `#sec-news`, `#sec-company`, `#sec-compare`, `#sec-budget`).
- **`js/app.js`**: The primary application coordinator. Manages section switching, the 25-ticker canonical universe, search autocomplete, real-time IST clock, company detail rendering, live quote polling, and theme initialization.
- **`js/charts.js`**: Pure SVG charting engine. Contains drawing algorithms for sparklines, 90-day price lines with 20-period SMA overlays, bar volume histograms, radial RSI gauges, allocation donut charts, and multi-year trajectory graphs.
- **`js/compare.js`**: Coordinates the multi-stock comparison view. Handles selection of up to 5 stocks, renders multi-line comparative price charts, volume comparisons, and tabular metric scorecards.
- **`js/budget.js`**: Manages personal budget mathematics. Calculates income distributions, updates allocation sliders, renders the surplus distribution donut, and computes compound interest projections.

### Styling Architecture
- **`styles/tokens.css`**: Defines CSS design tokens including color palettes for dark and light modes, typography scales, spacing units, border radii, shadows, and animation timings.
- **`styles/layout.css`**: Governs grid layouts, app shell structure, responsive topbar and sidebar behaviors, and breakpoint media queries.
- **`styles/components.css`**: Styles UI components including stat cards, hero price cards, form controls, action buttons, table rows, and status badges.

### Data Layer & Automation
- **`data/snapshot.json`**: Static JSON file storing the complete market snapshot including news articles, technical indicators, and fundamental metrics for all 25 tickers.
- **`data/snapshot.js`**: JavaScript file assigning the snapshot object to `window.__LEDGER_SNAPSHOT__` to ensure the dashboard works seamlessly when opened directly via `file://` protocol without CORS restrictions.
- **`refresh-data.js`**: Node.js script that fetches fresh market news via Tavily and quotes via Twelve Data, updating `data/snapshot.json`.
- **`server.ps1`**: A native PowerShell script that starts an HTTP server on port 8080 with proper MIME types and CORS headers.

### Serverless Endpoints
- **`netlify/functions/quote-live.mts`**: Resilient live quote proxy endpoint with a 4-tier provider pipeline (Twelve Data primary, Alpha Vantage fallback, Netlify Blobs edge cache with 45s TTL, and snapshot fallback).
- **`netlify/functions/quotes.mts`**: Bulk universe quote synchronization endpoint returning latest market prices, percentage changes, and session metadata for all 25 tickers.
- **`netlify/functions/data.mts`**: Serverless function that serves the latest market snapshot data from Netlify Blobs.
- **`netlify/functions/scheduled/daily-refresh.mts`**: Scheduled cron function configured to run periodically to refresh market news and technical indicators.
- **`netlify/functions/declarations.d.ts`**: Ambient TypeScript declaration file providing accurate typings for `@netlify/blobs` and `@netlify/functions`.

---

## Live Stock Price & Market Calibration Architecture

The dashboard features a fully resolved, real-time live stock price engine engineered for high availability and zero rate-limit downtime:

### Current Working Status: Operational & Verified
- **Hero Price Card & Company Detail:** Automatically displays live share prices or official session closes with exact percentage movements.
- **5-Stock Comparison Matrix:** Normalizes live quotes for up to 5 simultaneous stocks with real-time recalculation.
- **Top Gainers & Decliners:** Computed dynamically from the live 25-ticker universe.

### Live Pricing Pipeline & Resilience Layers
1. **Universal Client-Side Polling:** `startLivePolling()` initiates an automated 45-second background polling cycle on dashboard initialization, querying the active quote proxy without environment gating.
2. **Multi-Tier Provider Failover (`quote-live.mts`):**
   - **Tier 1 (Twelve Data):** Primary live quote provider returning real-time market prices, bid/close data, and exchange open flags.
   - **Tier 2 (Alpha Vantage):** Secondary live quote fallback querying `GLOBAL_QUOTE` if Twelve Data experiences rate limits or network issues.
   - **Tier 3 (Netlify Blobs Cache):** In-memory edge cache with 45-second TTL (`live-quotes` store) preventing duplicate external requests.
   - **Tier 4 (Snapshot Fallback):** Authentic session snapshot fallback (`data/snapshot.json` / `data/snapshot.js`) ensuring the dashboard never crashes even if external APIs are unreachable.
3. **Dynamic 4-State Session Calibration:**
   - `● Live Market Price` (Green `#34D079`): Exchanges are open during regular market hours (09:30–16:00 ET).
   - `● Pre-Market` (Amber `#F59E0B`): Pre-market trading window (04:00–09:30 ET).
   - `● After-Hours` (Indigo `#818CF8`): Post-market trading window (16:00–20:00 ET).
   - `● Market Closed` (Slate `#94A3B8`): Night and weekend periods, dynamically referencing the latest completed market session.

---

## API Integrations & Configuration

LedgerAdvance integrates with multiple financial and news providers:

### 1. Twelve Data API
- **Purpose:** Supplies live market quotes, previous session closing prices, 52-week highs and lows, trading volumes, historical daily OHLCV series, and technical indicator metrics (20-day SMA, 14-day RSI).
- **Used In:** `netlify/functions/quote-live.mts`, `refresh-data.js`, `netlify/functions/scheduled/daily-refresh.mts`.

### 2. Alpha Vantage API
- **Purpose:** Acts as a high-availability secondary live quote fallback (`GLOBAL_QUOTE`) if primary quote limits are reached.
- **Used In:** `netlify/functions/quote-live.mts`.

### 3. Tavily Search API
- **Purpose:** Sources live financial news and macroeconomic reporting concerning the Indian stock market (Sensex, Nifty 50, FII/DII liquidity, RBI policies).
- **Used In:** `refresh-data.js`, `netlify/functions/scheduled/daily-refresh.mts`.

### Environment Variables
When running the data refresh script or serverless functions, configure the following environment variables:

| Variable Name | Required For | Description |
| :--- | :--- | :--- |
| `TWELVE_DATA_API_KEY` | Live quotes & automated data refresh | API key obtained from Twelve Data |
| `ALPHA_VANTAGE_API_KEY` | Secondary live quote fallback | API key obtained from Alpha Vantage (optional) |
| `TAVILY_API_KEY` | Automated news data refresh | API key obtained from Tavily Search |

> **Security Notice:** API keys must only be set as system environment variables or through secure serverless secret managers. Never hardcode credentials into client-side code or commit API keys to version control.

---

## Prerequisites & Running Locally

### Prerequisites
1. **Operating System:** Windows 10 / Windows 11 (or macOS / Linux).
2. **Web Browser:** Any modern web browser with HTML5 and SVG support (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).
3. **PowerShell:** Windows PowerShell 5.1 or PowerShell Core 7+ (for local HTTP server).
4. **Node.js (Optional):** Node.js v18.0.0 or higher (only needed if executing the manual data refresh script `refresh-data.js`).

---

### Running the Application Locally

#### Method 1: Local HTTP Server via PowerShell (Recommended)
This method runs the project on a local HTTP server with full CORS support:

1. Open PowerShell and navigate to the project directory:
   ```powershell
   cd "D:\Desktop\Ledger advance"
   ```

2. Start the local server:
   ```powershell
   .\server.ps1 -Port 8080
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8080/
   ```

#### Method 2: Direct Browser Execution (Zero Setup)
Because LedgerAdvance includes a bundled fallback data layer (`data/snapshot.js`), you can launch the application directly without installing or running any server:

1. In PowerShell:
   ```powershell
   Start-Process 'D:\Desktop\Ledger advance\index.html'
   ```
   *Or double-click `index.html` in Windows File Explorer.*

2. The application will initialize immediately using the bundled snapshot data.

---

### Refreshing Data Locally (Optional)
To update the local snapshot with fresh external API data using `refresh-data.js`:

1. Set your environment variables in PowerShell:
   ```powershell
   $env:TWELVE_DATA_API_KEY = "your_twelve_data_api_key"
   $env:TAVILY_API_KEY = "your_tavily_api_key"
   ```

2. Run the refresh script with Node.js:
   ```powershell
   node refresh-data.js
   ```

3. The script will query the APIs, update `data/snapshot.json`, and write a log entry to `refresh.log`.
