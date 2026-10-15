import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  try {
    const store = getStore("market-data");
    const snapshot = await store.get("daily-snapshot", { type: "json" }) as any;

    if (snapshot && snapshot.universe) {
      const quotesMap: Record<string, any> = {};
      for (const [sym, u] of Object.entries<any>(snapshot.universe)) {
        quotesMap[sym] = {
          symbol: sym,
          name: u.name,
          price: u.price,
          change: u.change,
          changePercent: u.changePercent,
          previousClose: u.previousClose,
          lastMarketSession: u.lastMarketSession || "2026-10-14"
        };
      }

      return new Response(JSON.stringify(quotesMap), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to load universe quotes" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
