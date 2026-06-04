import {
  getIntradaySeriesResults,
  MARKET_DATA_SOURCE,
} from "@/lib/market-data";
import type { IntradayApiResponse } from "@/types";

export const dynamic = "force-dynamic";

function cleanDate(value: string | null) {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get("symbols") ?? searchParams.get("symbol") ?? "")
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);
  const date = cleanDate(searchParams.get("date"));

  if (symbols.length === 0) {
    return Response.json(
      {
        data: [],
        errors: [{ symbol: "", message: "Missing symbols query parameter" }],
        updatedAt: new Date().toISOString(),
        source: MARKET_DATA_SOURCE,
        interval: date ? "5m" : "1m",
        ...(date ? { date } : {}),
      } satisfies IntradayApiResponse,
      { status: 400 }
    );
  }

  const { data, errors } = await getIntradaySeriesResults(symbols, date);
  const source =
    data.length > 0
      ? Array.from(new Set(data.map((series) => series.source))).join(", ")
      : MARKET_DATA_SOURCE;

  return Response.json(
    {
      data,
      errors,
      updatedAt: new Date().toISOString(),
      source,
      interval: date ? "5m" : "1m",
      ...(date ? { date } : {}),
    } satisfies IntradayApiResponse,
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
