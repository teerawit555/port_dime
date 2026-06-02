import {
  getMarketSnapshotResults,
  MARKET_DATA_SOURCE,
} from "@/lib/market-data";
import type { MarketApiResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return Response.json(
      {
        data: [],
        errors: [{ symbol: "", message: "Missing symbols query parameter" }],
        updatedAt: new Date().toISOString(),
        source: MARKET_DATA_SOURCE,
      } satisfies MarketApiResponse,
      { status: 400 }
    );
  }

  const { data, errors } = await getMarketSnapshotResults(symbols);
  const source =
    data.length > 0
      ? Array.from(new Set(data.map((snapshot) => snapshot.source))).join(", ")
      : MARKET_DATA_SOURCE;

  return Response.json(
    {
      data,
      errors,
      updatedAt: new Date().toISOString(),
      source,
    } satisfies MarketApiResponse,
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
