import type { MarketSnapshot, PricePoint, SupportResistance } from "@/types";

const SOURCE = "Yahoo Finance";
const FINNHUB_SOURCE = "Finnhub";
const STOOQ_SOURCE = "Stooq";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const KNOWN_COMPANY_NAMES: Record<string, string> = {
  GOOGL: "Alphabet Inc. Class A",
  VOO: "Vanguard S&P 500 ETF",
  NVDA: "NVIDIA Corporation",
  AAPL: "Apple Inc.",
  RKLB: "Rocket Lab USA, Inc.",
  ANET: "Arista Networks, Inc.",
  PLTR: "Palantir Technologies Inc.",
  ASTS: "AST SpaceMobile, Inc.",
  NOW: "ServiceNow, Inc.",
  IREN: "IREN Limited",
};

type YahooQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  regularMarketTime?: number;
};

type YahooChartResult = {
  timestamp?: number[];
  meta?: {
    symbol?: string;
    regularMarketPrice?: number;
    previousClose?: number;
    chartPreviousClose?: number;
    currency?: string;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
    regularMarketTime?: number;
    longName?: string;
    shortName?: string;
  };
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
};

type YahooRawValue<T> = {
  raw?: T;
  fmt?: string;
};

type YahooQuoteSummary = {
  price?: {
    longName?: string;
    shortName?: string;
    currency?: string;
    regularMarketPrice?: YahooRawValue<number>;
    marketCap?: YahooRawValue<number>;
  };
  summaryDetail?: {
    previousClose?: YahooRawValue<number>;
    regularMarketPreviousClose?: YahooRawValue<number>;
    dayHigh?: YahooRawValue<number>;
    dayLow?: YahooRawValue<number>;
    volume?: YahooRawValue<number>;
    trailingPE?: YahooRawValue<number>;
    forwardPE?: YahooRawValue<number>;
  };
  defaultKeyStatistics?: {
    trailingPE?: YahooRawValue<number>;
    forwardPE?: YahooRawValue<number>;
  };
};

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  pc?: number;
  t?: number;
};

type FinnhubMetrics = {
  metric?: {
    peBasicExclExtraTTM?: number;
    peNormalizedAnnual?: number;
    peTTM?: number;
    forwardPE?: number;
    marketCapitalization?: number;
  };
};

type YahooChartMeta = NonNullable<YahooChartResult["meta"]>;

type PriceHistoryResult = {
  points: PricePoint[];
  meta?: YahooChartMeta;
};

type StooqQuote = {
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  currentPrice?: number;
};

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function cleanSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9.^=-]/g, "");
}

export function normalizeSymbols(symbols: string[]) {
  return Array.from(
    new Set(symbols.map(cleanSymbol).filter((symbol) => symbol.length > 0))
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`Market data request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: {
      Accept: "text/csv,text/plain,*/*",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(`Market data request failed (${res.status})`);
  }

  return res.text();
}

async function fetchQuotes(symbols: string[]) {
  if (symbols.length === 0) return new Map<string, YahooQuote>();

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    symbols.join(",")
  )}`;
  const json = await fetchJson<{
    quoteResponse?: { result?: YahooQuote[]; error?: unknown };
  }>(url);

  const map = new Map<string, YahooQuote>();
  for (const quote of json.quoteResponse?.result ?? []) {
    if (quote.symbol) map.set(quote.symbol.toUpperCase(), quote);
  }
  return map;
}

async function fetchPriceHistory(symbol: string): Promise<PriceHistoryResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=6mo&interval=1d`;
  const json = await fetchJson<{ chart?: { result?: YahooChartResult[] } }>(url);
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const opens = quote?.open ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];
  const closes = quote?.close ?? [];
  const volumes = quote?.volume ?? [];

  const points: PricePoint[] = [];

  timestamps.forEach((timestamp, index) => {
    const price = asFiniteNumber(closes[index]);
    if (price === undefined) return;

    const open = asFiniteNumber(opens[index]);
    const high = asFiniteNumber(highs[index]);
    const low = asFiniteNumber(lows[index]);
    const volume = asFiniteNumber(volumes[index]);
    points.push({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      price,
      ...(open === undefined ? {} : { open }),
      ...(high === undefined ? {} : { high }),
      ...(low === undefined ? {} : { low }),
      ...(volume === undefined ? {} : { volume }),
    });
  });

  return { points, meta: result?.meta };
}

async function fetchQuoteSummary(symbol: string): Promise<YahooQuoteSummary | null> {
  const modules = "price,summaryDetail,defaultKeyStatistics";
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol
  )}?modules=${modules}`;
  const json = await fetchJson<{
    quoteSummary?: { result?: YahooQuoteSummary[] };
  }>(url);

  return json.quoteSummary?.result?.[0] ?? null;
}

async function fetchFinnhubData(symbol: string) {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return null;

  const params = `symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`;
  const [quoteResult, metricsResult] = await Promise.allSettled([
    fetchJson<FinnhubQuote>(`https://finnhub.io/api/v1/quote?${params}`),
    fetchJson<FinnhubMetrics>(
      `https://finnhub.io/api/v1/stock/metric?${params}&metric=all`
    ),
  ]);

  return {
    quote: quoteResult.status === "fulfilled" ? quoteResult.value : null,
    metrics: metricsResult.status === "fulfilled" ? metricsResult.value : null,
  };
}

async function fetchStooqQuote(symbol: string): Promise<StooqQuote | null> {
  const stooqSymbol = `${symbol.toLowerCase()}.us`;
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(
    stooqSymbol
  )}&f=sd2t2ohlcv&h&e=csv`;
  const csv = await fetchText(url);
  const [, row] = csv.trim().split(/\r?\n/);
  if (!row) return null;

  const [, , , , highRaw, lowRaw, closeRaw, volumeRaw] = row.split(",");
  const dayHigh = asFiniteNumber(Number(highRaw));
  const dayLow = asFiniteNumber(Number(lowRaw));
  const currentPrice = asFiniteNumber(Number(closeRaw));
  const volume = asFiniteNumber(Number(volumeRaw));

  if (
    dayHigh === undefined &&
    dayLow === undefined &&
    currentPrice === undefined &&
    volume === undefined
  ) {
    return null;
  }

  return {
    dayHigh,
    dayLow,
    currentPrice,
    volume,
  };
}

export function calculateRsi(
  prices: PricePoint[],
  period = 14
): number | null {
  if (prices.length <= period) return null;

  const closes = prices.map((point) => point.price);
  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index++) {
    const delta = closes[index] - closes[index - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < closes.length; index++) {
    const delta = closes[index] - closes[index - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) return 100;
  const relativeStrength = averageGain / averageLoss;
  return Number((100 - 100 / (1 + relativeStrength)).toFixed(2));
}

function roundPriceLevel(price: number) {
  if (price >= 500) return Math.round(price);
  if (price >= 100) return Number(price.toFixed(1));
  return Number(price.toFixed(2));
}

function uniqueSortedLevels(levels: number[], direction: "asc" | "desc") {
  const sorted = [...levels]
    .filter((level) => Number.isFinite(level) && level > 0)
    .sort((a, b) => (direction === "asc" ? a - b : b - a));
  const unique: number[] = [];

  for (const level of sorted) {
    const rounded = roundPriceLevel(level);
    const duplicate = unique.some(
      (existing) => Math.abs(existing - rounded) / rounded < 0.006
    );
    if (!duplicate) unique.push(rounded);
    if (unique.length === 3) break;
  }

  return unique;
}

export function calculateSupportResistance(
  prices: PricePoint[],
  currentPrice: number
): SupportResistance {
  const windows = [20, 50, 126];
  const lows = windows.flatMap((size) => {
    const slice = prices.slice(-size);
    return slice.length ? Math.min(...slice.map((point) => point.price)) : [];
  });
  const highs = windows.flatMap((size) => {
    const slice = prices.slice(-size);
    return slice.length ? Math.max(...slice.map((point) => point.price)) : [];
  });
  const latestCloses = prices
    .slice(-30)
    .map((point) => point.price)
    .filter((price) => price < currentPrice);
  const recentUpside = prices
    .slice(-30)
    .map((point) => point.price)
    .filter((price) => price > currentPrice);

  const support = uniqueSortedLevels(
    [...lows, ...latestCloses, currentPrice * 0.97, currentPrice * 0.93].filter(
      (level) => level < currentPrice * 0.999
    ),
    "desc"
  );
  const resistance = uniqueSortedLevels(
    [
      ...recentUpside,
      ...highs,
      currentPrice * 1.03,
      currentPrice * 1.08,
      currentPrice * 1.15,
    ].filter((level) => level > currentPrice * 1.001),
    "asc"
  );

  while (support.length < 3) {
    support.push(roundPriceLevel(currentPrice * (1 - 0.04 * (support.length + 1))));
  }
  while (resistance.length < 3) {
    resistance.push(
      roundPriceLevel(currentPrice * (1 + 0.05 * (resistance.length + 1)))
    );
  }

  return {
    support: support.slice(0, 3) as [number, number, number],
    resistance: resistance.slice(0, 3) as [number, number, number],
  };
}

async function buildMarketSnapshot(
  symbol: string,
  quoteMap: Map<string, YahooQuote>
) {
  const [historyResult, summaryResult, finnhubResult, stooqResult] =
    await Promise.allSettled([
      fetchPriceHistory(symbol),
      fetchQuoteSummary(symbol),
      fetchFinnhubData(symbol),
      fetchStooqQuote(symbol),
    ]);
  const quote = quoteMap.get(symbol);
  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const finnhub =
    finnhubResult.status === "fulfilled" ? finnhubResult.value : null;
  const finnhubQuote = finnhub?.quote;
  const finnhubMetrics = finnhub?.metrics?.metric;
  const priceHistory =
    historyResult.status === "fulfilled" ? historyResult.value.points : [];
  const chartMeta =
    historyResult.status === "fulfilled" ? historyResult.value.meta : undefined;
  const stooqQuote =
    stooqResult.status === "fulfilled" ? stooqResult.value : null;
  const latestHistoryPrice = priceHistory.at(-1)?.price;
  const latestHistoryPoint = priceHistory.at(-1);
  const currentPrice =
    asFiniteNumber(finnhubQuote?.c) ??
    asFiniteNumber(quote?.regularMarketPrice) ??
    asFiniteNumber(summary?.price?.regularMarketPrice?.raw) ??
    asFiniteNumber(chartMeta?.regularMarketPrice) ??
    latestHistoryPrice ??
    stooqQuote?.currentPrice;
  const previousClose =
    asFiniteNumber(finnhubQuote?.pc) ??
    asFiniteNumber(quote?.regularMarketPreviousClose) ??
    asFiniteNumber(summary?.summaryDetail?.previousClose?.raw) ??
    asFiniteNumber(summary?.summaryDetail?.regularMarketPreviousClose?.raw) ??
    asFiniteNumber(chartMeta?.previousClose) ??
    asFiniteNumber(chartMeta?.chartPreviousClose) ??
    priceHistory.at(-2)?.price ??
    currentPrice;

  if (currentPrice === undefined || previousClose === undefined) {
    const error = new Error(`No quote data returned for ${symbol}`);
    error.name = symbol;
    throw error;
  }

  const changeAmount =
    asFiniteNumber(finnhubQuote?.d) ??
    asFiniteNumber(quote?.regularMarketChange) ??
    currentPrice - previousClose;
  const changePercent =
    asFiniteNumber(finnhubQuote?.dp) ??
    asFiniteNumber(quote?.regularMarketChangePercent) ??
    (previousClose > 0 ? (changeAmount / previousClose) * 100 : 0);
  const dayHigh =
    asFiniteNumber(finnhubQuote?.h) ??
    asFiniteNumber(quote?.regularMarketDayHigh) ??
    asFiniteNumber(summary?.summaryDetail?.dayHigh?.raw) ??
    asFiniteNumber(chartMeta?.regularMarketDayHigh) ??
    latestHistoryPoint?.high ??
    stooqQuote?.dayHigh;
  const dayLow =
    asFiniteNumber(finnhubQuote?.l) ??
    asFiniteNumber(quote?.regularMarketDayLow) ??
    asFiniteNumber(summary?.summaryDetail?.dayLow?.raw) ??
    asFiniteNumber(chartMeta?.regularMarketDayLow) ??
    latestHistoryPoint?.low ??
    stooqQuote?.dayLow;
  const volume =
    asFiniteNumber(quote?.regularMarketVolume) ??
    asFiniteNumber(summary?.summaryDetail?.volume?.raw) ??
    asFiniteNumber(chartMeta?.regularMarketVolume) ??
    latestHistoryPoint?.volume ??
    stooqQuote?.volume;
  const sourceParts = [
    finnhub ? FINNHUB_SOURCE : null,
    SOURCE,
    stooqQuote ? STOOQ_SOURCE : null,
  ].filter(Boolean);

  return {
    symbol,
    companyName:
      quote?.longName ??
      summary?.price?.longName ??
      chartMeta?.longName ??
      KNOWN_COMPANY_NAMES[symbol] ??
      quote?.shortName ??
      summary?.price?.shortName ??
      chartMeta?.shortName ??
      symbol,
    currentPrice,
    previousClose,
    changeAmount,
    changePercent,
    currency: quote?.currency ?? summary?.price?.currency ?? chartMeta?.currency ?? "USD",
    dayHigh,
    dayLow,
    volume,
    marketCap:
      asFiniteNumber(quote?.marketCap) ??
      asFiniteNumber(summary?.price?.marketCap?.raw) ??
      (asFiniteNumber(finnhubMetrics?.marketCapitalization) === undefined
        ? undefined
        : asFiniteNumber(finnhubMetrics?.marketCapitalization)! * 1_000_000),
    peRatio:
      asFiniteNumber(finnhubMetrics?.peBasicExclExtraTTM) ??
      asFiniteNumber(finnhubMetrics?.peNormalizedAnnual) ??
      asFiniteNumber(finnhubMetrics?.peTTM) ??
      asFiniteNumber(quote?.trailingPE) ??
      asFiniteNumber(summary?.summaryDetail?.trailingPE?.raw) ??
      asFiniteNumber(summary?.defaultKeyStatistics?.trailingPE?.raw) ??
      null,
    forwardPeRatio:
      asFiniteNumber(finnhubMetrics?.forwardPE) ??
      asFiniteNumber(quote?.forwardPE) ??
      asFiniteNumber(summary?.summaryDetail?.forwardPE?.raw) ??
      asFiniteNumber(summary?.defaultKeyStatistics?.forwardPE?.raw) ??
      null,
    rsi14: calculateRsi(priceHistory),
    levels: calculateSupportResistance(priceHistory, currentPrice),
    marketTime:
      finnhubQuote?.t || quote?.regularMarketTime || chartMeta?.regularMarketTime
        ? new Date(
            (finnhubQuote?.t ??
              quote?.regularMarketTime ??
              chartMeta?.regularMarketTime ??
              0) * 1000
          ).toISOString()
        : undefined,
    quoteUpdatedAt: new Date().toISOString(),
    source: Array.from(new Set(sourceParts)).join(" + "),
    priceHistory,
  } satisfies MarketSnapshot;
}

export async function getMarketSnapshotResults(symbols: string[]) {
  const normalizedSymbols = normalizeSymbols(symbols);
  let quoteMap = new Map<string, YahooQuote>();
  let quoteError: string | undefined;

  try {
    quoteMap = await fetchQuotes(normalizedSymbols);
  } catch (error) {
    quoteError =
      error instanceof Error ? error.message : "Quote request failed";
  }

  const settled = await Promise.allSettled(
    normalizedSymbols.map((symbol) => buildMarketSnapshot(symbol, quoteMap))
  );

  return {
    data: settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    ),
    errors: [
      ...(quoteError ? [{ symbol: "", message: quoteError }] : []),
      ...settled.flatMap((result) =>
        result.status === "rejected"
          ? [
              {
                symbol:
                  result.reason instanceof Error ? result.reason.name : "",
                message:
                  result.reason instanceof Error
                    ? result.reason.message
                    : "Unknown market data error",
              },
            ]
          : []
      ),
    ],
  };
}

export { SOURCE as MARKET_DATA_SOURCE };
