import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  try {
    const store = getStore("market-data");
    const cached = await store.get("daily-snapshot", { type: "json" });

    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Fallback: If blob store is not seeded yet, return initial snapshot schema or error
    return new Response(
      JSON.stringify({
        error: "Snapshot not yet generated in Netlify Blobs. Please trigger scheduled refresh."
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to load snapshot" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
