import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

/**
 * LEDGER ADVANCE — Alpha Vantage Daily Time Series Endpoint
 *
 * Provides historical daily close + volume data from Alpha Vantage as an
 * automatic fallback when Twelve Data is unavailable or rate-limited.
 *
 * Query param:
 *   symbol  (string, default "INFY") — ticker symbol
 *
 * Response shape on success:
 *   { symbol, timeSeries: [{ date, close, volume }], source, fetchedAt }
 *
 * Caching: Netlify Blobs store "alphavantage-cache", 30-minute TTL.
 * The API key is read exclusively from the server-side environment variable
 * ALPHA_VANTAGE_API_KEY. It is never logged or included in any response.
 */
export default async (req: Request, context: Context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get("symbol") || "INFY").toUpperCase().trim();

    const alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!alphaVantageKey) {
      return new Response(
        JSON.stringify({ error: "Alpha Vantage API key not configured on this deployment" }),
        { status: 503, headers: corsHeaders }
      );
    }

    // --- Blobs cache: 30-minute TTL (resilient fallback if Blobs store unconfigured) ---
    let store: any = null;
    const cacheKey = `series-${symbol}`;
    const now = Date.now();
    const TTL_MS = 30 * 60 * 1000; // 30 minutes

    try {
      store = getStore("alphavantage-cache");
      const cached = await store.get(cacheKey, { type: "json" }) as any;
      if (cached && cached._timestamp && now - cached._timestamp < TTL_MS) {
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, max-age=1800"
          }
        });
      }
    } catch (blobErr: any) {
      console.warn("Netlify Blobs cache unavailable on this deployment:", blobErr?.message);
      store = null;
    }

    // --- Fetch from Alpha Vantage TIME_SERIES_DAILY ---
    const avUrl =
      `https://www.alphavantage.co/query` +
      `?function=TIME_SERIES_DAILY` +
      `&symbol=${encodeURIComponent(symbol)}` +
      `&outputsize=compact` +
      `&apikey=${alphaVantageKey}`;

    const avRes = await fetch(avUrl);
    if (!avRes.ok) {
      return new Response(
        JSON.stringify({ error: `Alpha Vantage responded with HTTP ${avRes.status}` }),
        { status: 502, headers: corsHeaders }
      );
    }

    const avData = await avRes.json();

    // Rate-limit and informational notices returned by Alpha Vantage (free tier)
    if (avData["Note"] || avData["Information"]) {
      const detail: string = avData["Note"] || avData["Information"];
      console.warn("Alpha Vantage rate-limit notice:", detail.slice(0, 120));
      return new Response(
        JSON.stringify({ error: "Alpha Vantage rate limit reached — retry after 1 minute" }),
        { status: 429, headers: corsHeaders }
      );
    }

    const rawSeries = avData["Time Series (Daily)"];
    if (!rawSeries || typeof rawSeries !== "object") {
      return new Response(
        JSON.stringify({ error: "No daily time series returned from Alpha Vantage for " + symbol }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Normalise: Alpha Vantage returns newest-first; sort ascending and keep last 90 sessions
    const timeSeries: Array<{ date: string; close: number; volume: number }> =
      Object.entries(rawSeries)
        .map(([date, vals]: [string, any]) => ({
          date,
          close: parseFloat(vals["4. close"]),
          volume: parseInt(vals["5. volume"], 10)
        }))
        .filter(d => !isNaN(d.close))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-90);

    if (timeSeries.length < 2) {
      return new Response(
        JSON.stringify({ error: "Insufficient time series data returned from Alpha Vantage" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const result = {
      symbol,
      timeSeries,
      source: "Alpha Vantage",
      fetchedAt: new Date().toISOString()
    };

    // Cache successful response in Blobs if store is available
    if (store) {
      try {
        await store.setJSON(cacheKey, { _timestamp: now, data: result });
      } catch (_) {
        // Cache write failed non-fatally
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=1800"
      }
    });
  } catch (err: any) {
    console.error("alphavantage-series error:", err?.message);
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to fetch Alpha Vantage time series" }),
      { status: 500, headers: corsHeaders }
    );
  }
};
