import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "INFY").toUpperCase();
    const store = getStore("live-quotes");
    const cacheKey = `quote-${symbol}`;
    const cached = await store.get(cacheKey, { type: "json" }) as any;

    const now = Date.now();
    // Cache for 45 seconds (45,000 ms)
    if (cached && cached._timestamp && now - cached._timestamp < 45000) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=45",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    let result: any = null;
    const twelveDataKey = process.env.TWELVE_DATA_API_KEY;
    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;

    // 1. Try Twelve Data if key is configured
    if (twelveDataKey) {
      try {
        const apiUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${twelveDataKey}`;
        const apiRes = await fetch(apiUrl);
        if (apiRes.ok) {
          const q = await apiRes.json();
          if (q.status !== "error" && q.close) {
            result = {
              symbol,
              name: q.name || symbol,
              price: parseFloat(q.close || q.price || "0"),
              change: parseFloat(q.change || "0"),
              changePercent: parseFloat(q.percent_change || "0"),
              previousClose: parseFloat(q.previous_close || "0"),
              is_market_open: q.is_market_open === true || q.is_market_open === "true",
              lastMarketSession: q.datetime ? q.datetime.split(" ")[0] : "2026-10-14",
              datetime: q.datetime || "",
              timestamp: q.timestamp || Math.floor(now / 1000)
            };
          }
        }
      } catch (_) { /* Fallback to Alpha Vantage or Snapshot */ }
    }

    // 2. Try Alpha Vantage if Twelve Data didn't return a result and Alpha Vantage key is configured
    if (!result && alphaVantageKey) {
      try {
        const avUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${alphaVantageKey}`;
        const avRes = await fetch(avUrl);
        if (avRes.ok) {
          const avData = await avRes.json();
          const gq = avData["Global Quote"];
          if (gq && gq["05. price"]) {
            const price = parseFloat(gq["05. price"]);
            const change = parseFloat(gq["09. change"] || "0");
            const changePct = parseFloat((gq["10. change percent"] || "0").replace("%", ""));
            const prevClose = parseFloat(gq["08. previous close"] || price.toString());
            const latestTradingDay = gq["07. latest trading day"] || "2026-10-14";
            result = {
              symbol,
              name: symbol,
              price,
              change,
              changePercent: changePct,
              previousClose: prevClose,
              is_market_open: false,
              lastMarketSession: latestTradingDay,
              datetime: `${latestTradingDay} 16:00:00`,
              timestamp: Math.floor(now / 1000)
            };
          }
        }
      } catch (_) { /* Fallback to Snapshot Blobs */ }
    }

    // 3. Fallback: Retrieve from snapshot in Netlify Blobs if external APIs fail or are unconfigured
    if (!result) {
      try {
        const snapshotStore = getStore("market-data");
        const dailySnapshot = await snapshotStore.get("daily-snapshot", { type: "json" }) as any;
        if (dailySnapshot && dailySnapshot.universe && dailySnapshot.universe[symbol]) {
          const u = dailySnapshot.universe[symbol];
          result = {
            symbol,
            name: u.name || symbol,
            price: u.price,
            change: u.change,
            changePercent: u.changePercent,
            previousClose: u.previousClose || u.price,
            is_market_open: false,
            lastMarketSession: u.lastMarketSession || "2026-10-14",
            datetime: `${u.lastMarketSession || "2026-10-14"} 16:00:00`,
            timestamp: Math.floor(now / 1000)
          };
        }
      } catch (_) {}
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: `Market quote currently unavailable for ${symbol}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save to Blobs with timestamp
    await store.setJSON(cacheKey, { _timestamp: now, data: result });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=45",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to fetch live quote" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
