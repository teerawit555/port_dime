import type {
  IntradaySeries,
  MarketSnapshot,
  PricePoint,
  SupportResistance,
} from "@/types";

const SOURCE = "Yahoo Finance";
const FUNDAMENTALS_SOURCE = "Yahoo Finance fundamentals";
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
  MU: "Micron Technology, Inc.",
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
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
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

type IntradayHistoryResult = {
  points: IntradaySeries["points"];
  meta?: YahooChartMeta;
};

type YahooFundamentalPoint = {
  asOfDate?: string;
  reportedValue?: {
    raw?: number;
  };
};

type YahooFundamentalSeries = {
  meta?: {
    type?: string[];
  };
  [key: string]: unknown;
};

type YahooFundamentals = {
  series: Map<string, YahooFundamentalPoint[]>;
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

const FUNDAMENTAL_TYPES = [
  "trailingMarketCap",
  "trailingPeRatio",
  "trailingPsRatio",
  "trailingTotalRevenue",
  "trailingNetIncomeContinuousOperations",
  "trailingFreeCashFlow",
  "trailingOperatingCashFlow",
  "trailingGrossProfit",
  "quarterlyTotalDebt",
  "quarterlyStockholdersEquity",
  "quarterlyTotalRevenue",
  "quarterlyNetIncomeContinuousOperations",
  "quarterlyDilutedEPS",
] as const;

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

async function fetchCachedJson<T>(url: string, revalidateSeconds: number): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: revalidateSeconds },
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

async function fetchPriceHistory(symbol: string): Promise<PriceHistoryResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=1y&interval=1d`;
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

function getIntradayUrl(symbol: string, date?: string) {
  const encodedSymbol = encodeURIComponent(symbol);

  if (!date) {
    return `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=1d&interval=1m&includePrePost=true`;
  }

  const [year, month, day] = date.split("-").map(Number);
  const start = Math.floor(Date.UTC(year, month - 1, day, 0, 0, 0) / 1000);
  const end = start + 24 * 60 * 60;

  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?period1=${start}&period2=${end}&interval=5m&includePrePost=true`;
}

function getEasternSessionKey(timestamp: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(values.hour);
  const minute = Number(values.minute);

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: hour * 60 + minute,
  };
}

function isRegularMarketPoint(timestamp: string, targetDate?: string) {
  const eastern = getEasternSessionKey(timestamp);
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;

  return (
    (!targetDate || eastern.date === targetDate) &&
    eastern.minutes >= marketOpen &&
    eastern.minutes <= marketClose
  );
}

async function fetchIntradayHistory(
  symbol: string,
  date?: string
): Promise<IntradayHistoryResult> {
  const json = await fetchJson<{ chart?: { result?: YahooChartResult[] } }>(
    getIntradayUrl(symbol, date)
  );
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];
  const opens = quote?.open ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];
  const closes = quote?.close ?? [];
  const volumes = quote?.volume ?? [];

  const points: IntradaySeries["points"] = [];

  timestamps.forEach((timestamp, index) => {
    const price = asFiniteNumber(closes[index]);
    if (price === undefined) return;

    const open = asFiniteNumber(opens[index]);
    const high = asFiniteNumber(highs[index]);
    const low = asFiniteNumber(lows[index]);
    const volume = asFiniteNumber(volumes[index]);

    points.push({
      timestamp: new Date(timestamp * 1000).toISOString(),
      price,
      ...(open === undefined ? {} : { open }),
      ...(high === undefined ? {} : { high }),
      ...(low === undefined ? {} : { low }),
      ...(volume === undefined ? {} : { volume }),
    });
  });

  return {
    points: points.filter((point) => isRegularMarketPoint(point.timestamp, date)),
    meta: result?.meta,
  };
}

async function fetchYahooFundamentals(symbol: string): Promise<YahooFundamentals> {
  const end = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const start = end - 3 * 365 * 24 * 60 * 60;
  const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(
    symbol
  )}?symbol=${encodeURIComponent(symbol)}&type=${FUNDAMENTAL_TYPES.join(
    ","
  )}&period1=${start}&period2=${end}`;
  const json = await fetchCachedJson<{
    timeseries?: { result?: YahooFundamentalSeries[] };
  }>(url, 6 * 60 * 60);
  const series = new Map<string, YahooFundamentalPoint[]>();

  for (const result of json.timeseries?.result ?? []) {
    const type = result.meta?.type?.[0];
    if (!type) continue;
    const points = result[type];
    if (Array.isArray(points)) {
      series.set(type, points as YahooFundamentalPoint[]);
    }
  }

  return { series };
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

function getLatestFundamentalPoint(
  fundamentals: YahooFundamentals | null,
  type: string
) {
  const points = fundamentals?.series.get(type) ?? [];
  return points
    .filter(
      (point) =>
        typeof point.asOfDate === "string" &&
        asFiniteNumber(point.reportedValue?.raw) !== undefined
    )
    .sort((a, b) => (a.asOfDate ?? "").localeCompare(b.asOfDate ?? ""))
    .at(-1);
}

function getFundamentalValue(
  fundamentals: YahooFundamentals | null,
  type: string
) {
  return asFiniteNumber(
    getLatestFundamentalPoint(fundamentals, type)?.reportedValue?.raw
  );
}

function calculateLatestQuarterYoYGrowth(
  fundamentals: YahooFundamentals | null,
  type: string
) {
  const points = (fundamentals?.series.get(type) ?? [])
    .filter(
      (point) =>
        typeof point.asOfDate === "string" &&
        asFiniteNumber(point.reportedValue?.raw) !== undefined
    )
    .sort((a, b) => (a.asOfDate ?? "").localeCompare(b.asOfDate ?? ""));
  const latest = points.at(-1);
  if (!latest?.asOfDate) return null;

  const latestDate = new Date(`${latest.asOfDate}T00:00:00Z`);
  const prior = points.find((point) => {
    if (!point.asOfDate || point === latest) return false;
    const pointDate = new Date(`${point.asOfDate}T00:00:00Z`);
    const monthDifference =
      (latestDate.getUTCFullYear() - pointDate.getUTCFullYear()) * 12 +
      latestDate.getUTCMonth() -
      pointDate.getUTCMonth();
    return monthDifference === 12;
  });
  const latestValue = asFiniteNumber(latest.reportedValue?.raw);
  const priorValue = asFiniteNumber(prior?.reportedValue?.raw);
  if (latestValue === undefined || priorValue === undefined || priorValue === 0) {
    return null;
  }

  return Number((((latestValue - priorValue) / Math.abs(priorValue)) * 100).toFixed(2));
}

function calculateSma(prices: PricePoint[], period: number) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const average =
    slice.reduce((sum, point) => sum + point.price, 0) / slice.length;
  return Number(average.toFixed(2));
}

function findHistoryPrice(prices: PricePoint[], date?: string) {
  if (!date) return undefined;
  return prices.find((point) => point.date === date)?.price;
}

function calculateFundamentalMetrics({
  fundamentals,
  currentPrice,
  priceHistory,
}: {
  fundamentals: YahooFundamentals | null;
  currentPrice: number;
  priceHistory: PricePoint[];
}) {
  const rawMarketCap = getFundamentalValue(fundamentals, "trailingMarketCap");
  const marketCapPoint = getLatestFundamentalPoint(
    fundamentals,
    "trailingMarketCap"
  );
  const marketCapReferencePrice = findHistoryPrice(
    priceHistory,
    marketCapPoint?.asOfDate
  );
  const marketCap =
    rawMarketCap !== undefined &&
    marketCapReferencePrice !== undefined &&
    marketCapReferencePrice > 0
      ? rawMarketCap * (currentPrice / marketCapReferencePrice)
      : rawMarketCap;
  const totalRevenueTtm =
    getFundamentalValue(fundamentals, "trailingTotalRevenue") ?? null;
  const netIncomeTtm =
    getFundamentalValue(
      fundamentals,
      "trailingNetIncomeContinuousOperations"
    ) ?? null;
  const operatingCashFlowTtm =
    getFundamentalValue(fundamentals, "trailingOperatingCashFlow") ?? null;
  const freeCashFlowTtm =
    getFundamentalValue(fundamentals, "trailingFreeCashFlow") ?? null;
  const grossProfitTtm =
    getFundamentalValue(fundamentals, "trailingGrossProfit") ?? null;
  const totalDebt =
    getFundamentalValue(fundamentals, "quarterlyTotalDebt") ?? null;
  const stockholdersEquity =
    getFundamentalValue(fundamentals, "quarterlyStockholdersEquity") ?? null;
  const dilutedEpsPoints = fundamentals?.series.get("quarterlyDilutedEPS") ?? [];
  const epsTtm =
    dilutedEpsPoints.length >= 4
      ? Number(
          dilutedEpsPoints
            .slice(-4)
            .reduce(
              (sum, point) =>
                sum + (asFiniteNumber(point.reportedValue?.raw) ?? 0),
              0
            )
            .toFixed(4)
        )
      : marketCap && currentPrice > 0 && netIncomeTtm !== null
        ? Number((netIncomeTtm / (marketCap / currentPrice)).toFixed(4))
        : null;
  const fundamentalsAsOf = [
    getLatestFundamentalPoint(fundamentals, "trailingTotalRevenue")?.asOfDate,
    getLatestFundamentalPoint(fundamentals, "quarterlyStockholdersEquity")
      ?.asOfDate,
  ]
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);

  return {
    marketCap,
    peRatio:
      marketCap !== undefined && netIncomeTtm !== null && netIncomeTtm > 0
        ? Number((marketCap / netIncomeTtm).toFixed(2))
        : null,
    priceToSalesRatio:
      marketCap !== undefined &&
      totalRevenueTtm !== null &&
      totalRevenueTtm > 0
        ? Number((marketCap / totalRevenueTtm).toFixed(2))
        : null,
    priceToBookRatio:
      marketCap !== undefined &&
      stockholdersEquity !== null &&
      stockholdersEquity > 0
        ? Number((marketCap / stockholdersEquity).toFixed(2))
        : null,
    epsTtm,
    totalRevenueTtm,
    netIncomeTtm,
    operatingCashFlowTtm,
    freeCashFlowTtm,
    totalDebt,
    stockholdersEquity,
    grossMarginPercent:
      grossProfitTtm !== null && totalRevenueTtm !== null && totalRevenueTtm > 0
        ? Number(((grossProfitTtm / totalRevenueTtm) * 100).toFixed(2))
        : null,
    netMarginPercent:
      netIncomeTtm !== null && totalRevenueTtm !== null && totalRevenueTtm > 0
        ? Number(((netIncomeTtm / totalRevenueTtm) * 100).toFixed(2))
        : null,
    freeCashFlowMarginPercent:
      freeCashFlowTtm !== null &&
      totalRevenueTtm !== null &&
      totalRevenueTtm > 0
        ? Number(((freeCashFlowTtm / totalRevenueTtm) * 100).toFixed(2))
        : null,
    freeCashFlowYieldPercent:
      freeCashFlowTtm !== null && marketCap !== undefined && marketCap > 0
        ? Number(((freeCashFlowTtm / marketCap) * 100).toFixed(2))
        : null,
    debtToEquityPercent:
      totalDebt !== null &&
      stockholdersEquity !== null &&
      stockholdersEquity > 0
        ? Number(((totalDebt / stockholdersEquity) * 100).toFixed(2))
        : null,
    revenueGrowthYoYPercent: calculateLatestQuarterYoYGrowth(
      fundamentals,
      "quarterlyTotalRevenue"
    ),
    earningsGrowthYoYPercent: calculateLatestQuarterYoYGrowth(
      fundamentals,
      "quarterlyNetIncomeContinuousOperations"
    ),
    fundamentalsAsOf,
    fundamentalsSource: fundamentalsAsOf ? FUNDAMENTALS_SOURCE : undefined,
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
      (existing) => Math.abs(existing - rounded) / rounded < 0.012
    );
    if (!duplicate) unique.push(rounded);
    if (unique.length === 3) break;
  }

  return unique;
}

function getSwingLevels(prices: PricePoint[], direction: "low" | "high") {
  const slice = prices.slice(-126);
  const levels: number[] = [];

  for (let index = 2; index < slice.length - 2; index++) {
    const values = slice
      .slice(index - 2, index + 3)
      .map((point) =>
        direction === "low"
          ? (point.low ?? point.price)
          : (point.high ?? point.price)
      );
    const current = values[2];
    const extreme =
      direction === "low" ? Math.min(...values) : Math.max(...values);
    if (current === extreme) levels.push(current);
  }

  return levels;
}

export function calculateSupportResistance(
  prices: PricePoint[],
  currentPrice: number
): SupportResistance {
  const windows = [5, 10, 20, 50, 126, 252];
  const lows = windows.flatMap((size) => {
    const slice = prices.slice(-size);
    return slice.length
      ? Math.min(...slice.map((point) => point.low ?? point.price))
      : [];
  });
  const highs = windows.flatMap((size) => {
    const slice = prices.slice(-size);
    return slice.length
      ? Math.max(...slice.map((point) => point.high ?? point.price))
      : [];
  });
  const movingAverages = [20, 50, 100, 200]
    .map((period) => calculateSma(prices, period))
    .filter((value): value is number => value !== null);
  const swingLows = getSwingLevels(prices, "low");
  const swingHighs = getSwingLevels(prices, "high");

  const support = uniqueSortedLevels(
    [...swingLows, ...movingAverages, ...lows].filter(
      (level) => level < currentPrice * 0.995
    ),
    "desc"
  );
  const resistance = uniqueSortedLevels(
    [...swingHighs, ...movingAverages, ...highs].filter(
      (level) => level > currentPrice * 1.005
    ),
    "asc"
  );

  while (support.length < 3) {
    support.push(
      roundPriceLevel(currentPrice * (1 - 0.05 * (support.length + 1)))
    );
  }
  while (resistance.length < 3) {
    resistance.push(
      roundPriceLevel(currentPrice * (1 + 0.06 * (resistance.length + 1)))
    );
  }

  return {
    support: support.slice(0, 3) as [number, number, number],
    resistance: resistance.slice(0, 3) as [number, number, number],
  };
}

async function buildMarketSnapshot(symbol: string) {
  const [historyResult, fundamentalsResult, finnhubResult, stooqResult] =
    await Promise.allSettled([
      fetchPriceHistory(symbol),
      fetchYahooFundamentals(symbol),
      fetchFinnhubData(symbol),
      fetchStooqQuote(symbol),
    ]);
  const fundamentals =
    fundamentalsResult.status === "fulfilled" ? fundamentalsResult.value : null;
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
    asFiniteNumber(chartMeta?.regularMarketPrice) ??
    latestHistoryPrice ??
    stooqQuote?.currentPrice;
  const previousClose =
    asFiniteNumber(finnhubQuote?.pc) ??
    asFiniteNumber(chartMeta?.previousClose) ??
    priceHistory.at(-2)?.price ??
    asFiniteNumber(chartMeta?.chartPreviousClose) ??
    currentPrice;

  if (currentPrice === undefined || previousClose === undefined) {
    const error = new Error(`No quote data returned for ${symbol}`);
    error.name = symbol;
    throw error;
  }

  const changeAmount =
    asFiniteNumber(finnhubQuote?.d) ??
    currentPrice - previousClose;
  const changePercent =
    asFiniteNumber(finnhubQuote?.dp) ??
    (previousClose > 0 ? (changeAmount / previousClose) * 100 : 0);
  const dayHigh =
    asFiniteNumber(finnhubQuote?.h) ??
    asFiniteNumber(chartMeta?.regularMarketDayHigh) ??
    latestHistoryPoint?.high ??
    stooqQuote?.dayHigh;
  const dayLow =
    asFiniteNumber(finnhubQuote?.l) ??
    asFiniteNumber(chartMeta?.regularMarketDayLow) ??
    latestHistoryPoint?.low ??
    stooqQuote?.dayLow;
  const volume =
    asFiniteNumber(chartMeta?.regularMarketVolume) ??
    latestHistoryPoint?.volume ??
    stooqQuote?.volume;
  const fundamentalMetrics = calculateFundamentalMetrics({
    fundamentals,
    currentPrice,
    priceHistory,
  });
  const sma20 = calculateSma(priceHistory, 20);
  const sma50 = calculateSma(priceHistory, 50);
  const sma200 = calculateSma(priceHistory, 200);
  const fiftyTwoWeekHigh =
    asFiniteNumber(chartMeta?.fiftyTwoWeekHigh) ??
    (priceHistory.length > 0
      ? Math.max(...priceHistory.map((point) => point.high ?? point.price))
      : null);
  const fiftyTwoWeekLow =
    asFiniteNumber(chartMeta?.fiftyTwoWeekLow) ??
    (priceHistory.length > 0
      ? Math.min(...priceHistory.map((point) => point.low ?? point.price))
      : null);
  const sourceParts = [
    finnhub ? FINNHUB_SOURCE : null,
    SOURCE,
    fundamentals && fundamentals.series.size > 0 ? FUNDAMENTALS_SOURCE : null,
    stooqQuote ? STOOQ_SOURCE : null,
  ].filter(Boolean);

  return {
    symbol,
    companyName:
      chartMeta?.longName ??
      KNOWN_COMPANY_NAMES[symbol] ??
      chartMeta?.shortName ??
      symbol,
    currentPrice,
    previousClose,
    changeAmount,
    changePercent,
    currency: chartMeta?.currency ?? "USD",
    dayHigh,
    dayLow,
    volume,
    ...fundamentalMetrics,
    marketCap:
      fundamentalMetrics.marketCap ??
      (asFiniteNumber(finnhubMetrics?.marketCapitalization) === undefined
        ? undefined
        : asFiniteNumber(finnhubMetrics?.marketCapitalization)! * 1_000_000),
    peRatio:
      asFiniteNumber(finnhubMetrics?.peBasicExclExtraTTM) ??
      asFiniteNumber(finnhubMetrics?.peNormalizedAnnual) ??
      asFiniteNumber(finnhubMetrics?.peTTM) ??
      fundamentalMetrics.peRatio,
    forwardPeRatio:
      asFiniteNumber(finnhubMetrics?.forwardPE) ?? null,
    rsi14: calculateRsi(priceHistory),
    sma20,
    sma50,
    sma200,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    distanceFrom52WeekHighPercent:
      fiftyTwoWeekHigh && fiftyTwoWeekHigh > 0
        ? Number((((currentPrice - fiftyTwoWeekHigh) / fiftyTwoWeekHigh) * 100).toFixed(2))
        : null,
    levels: calculateSupportResistance(priceHistory, currentPrice),
    marketTime:
      finnhubQuote?.t || chartMeta?.regularMarketTime
        ? new Date(
            (finnhubQuote?.t ??
              chartMeta?.regularMarketTime ??
              0) * 1000
          ).toISOString()
        : undefined,
    quoteUpdatedAt: new Date().toISOString(),
    source: Array.from(new Set(sourceParts)).join(" + "),
    priceHistory,
  } satisfies MarketSnapshot;
}

async function buildIntradaySeries(symbol: string, date?: string) {
  const { points, meta } = await fetchIntradayHistory(symbol, date);

  if (points.length === 0) {
    const error = new Error(`No intraday data returned for ${symbol}`);
    error.name = symbol;
    throw error;
  }

  return {
    symbol,
    companyName:
      meta?.longName ??
      KNOWN_COMPANY_NAMES[symbol] ??
      meta?.shortName ??
      symbol,
    currency: meta?.currency ?? "USD",
    previousClose:
      asFiniteNumber(meta?.previousClose) ??
      asFiniteNumber(meta?.chartPreviousClose),
    marketTime: meta?.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : undefined,
    points,
    source: SOURCE,
  } satisfies IntradaySeries;
}

export async function getMarketSnapshotResults(symbols: string[]) {
  const normalizedSymbols = normalizeSymbols(symbols);

  const settled = await Promise.allSettled(
    normalizedSymbols.map((symbol) => buildMarketSnapshot(symbol))
  );

  return {
    data: settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    ),
    errors: [
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

export async function getIntradaySeriesResults(
  symbols: string[],
  date?: string
) {
  const normalizedSymbols = normalizeSymbols(symbols);

  const settled = await Promise.allSettled(
    normalizedSymbols.map((symbol) => buildIntradaySeries(symbol, date))
  );

  return {
    data: settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    ),
    errors: [
      ...settled.flatMap((result) =>
        result.status === "rejected"
          ? [
              {
                symbol:
                  result.reason instanceof Error ? result.reason.name : "",
                message:
                  result.reason instanceof Error
                    ? result.reason.message
                    : "Unknown intraday market data error",
              },
            ]
          : []
      ),
    ],
  };
}

export { SOURCE as MARKET_DATA_SOURCE };
