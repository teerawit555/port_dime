import type {
  InvestmentLogAction,
  InvestmentLogEntry,
  InvestmentStatus,
  Portfolio,
  PortfolioHolding,
  StockCategory,
  StockWatchlistItem,
} from "@/types";

type DimeTransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "DIVIDEND_ADJUSTMENT"
  | "TAX"
  | "FEE";
type DimeCurrency = "THB" | "USD";
type DimeStatus = "EXECUTED" | "EXPIRED";
type RawDimeTransaction = readonly [
  date: string,
  time: string,
  type: DimeTransactionType,
  symbol: string,
  amount: number,
  currency: DimeCurrency,
  executedPrice: number | null,
  shares: number | null,
  status: DimeStatus
];

type DimeTransaction = {
  index: number;
  date: string;
  time: string;
  type: DimeTransactionType;
  symbol: string;
  amount: number;
  currency: DimeCurrency;
  executedPrice: number | null;
  shares: number | null;
  status: DimeStatus;
};

const FALLBACK_USD_THB_RATE = 32.49;

const DIME_TRANSACTIONS = [
  ["2024-10-03", "00:52:10", "BUY", "TSM", 1.5, "USD", 175.614, 0.0085414, "EXECUTED"],
  ["2024-10-08", "23:52:32", "BUY", "TSM", 1.8, "USD", 185.692, 0.0096396, "EXECUTED"],
  ["2025-01-10", "00:43:49", "DIVIDEND", "TSM", 0.01, "USD", null, null, "EXECUTED"],
  ["2025-04-10", "21:37:35", "DIVIDEND", "TSM", 0.01, "USD", null, null, "EXECUTED"],
  ["2025-07-10", "22:28:53", "DIVIDEND", "TSM", 0.01, "USD", null, null, "EXECUTED"],
  ["2025-09-15", "21:47:08", "BUY", "NVDA", 199.82, "THB", 175.248, 0.0357208, "EXECUTED"],
  ["2025-09-16", "22:31:35", "BUY", "MSFT", 199.89, "THB", 512.486, 0.0122344, "EXECUTED"],
  ["2025-09-17", "23:14:04", "BUY", "AAPL", 199.9, "THB", 239.448, 0.0262269, "EXECUTED"],
  ["2025-09-22", "22:30:47", "BUY", "NVDA", 199.95, "THB", 175.468, 0.035676, "EXECUTED"],
  ["2025-09-26", "23:09:09", "BUY", "GOOGL", 199.74, "THB", 246.424, 0.0250381, "EXECUTED"],
  ["2025-10-09", "17:53:16", "DIVIDEND", "TSM", 0.01, "USD", null, null, "EXECUTED"],
  ["2025-10-10", "23:03:29", "BUY", "GOOGL", 299.75, "THB", 238.332, 0.0383918, "EXECUTED"],
  ["2025-10-10", "23:09:36", "BUY", "NVDA", 99.68, "THB", 189.626, 0.0159788, "EXECUTED"],
  ["2025-10-18", "00:31:56", "BUY", "NVDA", 499.93, "THB", 182.418, 0.0832154, "EXECUTED"],
  ["2025-11-01", "00:13:36", "BUY", "GOOGL", 499.83, "THB", 279.5, 0.054991, "EXECUTED"],
  ["2025-11-13", "23:33:40", "DIVIDEND", "AAPL", 0.01, "USD", null, null, "EXECUTED"],
  ["2025-11-13", "23:55:49", "DIVIDEND", "AAPL", 0.01, "USD", null, null, "EXECUTED"],
  ["2025-11-14", "15:27:25", "DIVIDEND_ADJUSTMENT", "AAPL", -0.01, "USD", null, null, "EXECUTED"],
  ["2025-11-20", "02:13:49", "BUY", "GOOGL", 499.78, "THB", 293.762, 0.052151, "EXECUTED"],
  ["2025-12-02", "21:32:44", "BUY", "GOOGL", 499.96, "THB", 315.472, 0.0493863, "EXECUTED"],
  ["2025-12-04", "22:13:22", "BUY", "VOO", 199.79, "THB", 627.814, 0.0098914, "EXECUTED"],
  ["2025-12-04", "22:13:58", "SELL", "TSM", 5.27, "USD", 291.1, 0.018181, "EXECUTED"],
  ["2025-12-05", "08:20:29", "FEE", "TAF_FEE", -0.01, "USD", null, null, "EXECUTED"],
  ["2025-12-09", "21:46:12", "BUY", "GOOGL", 5, "USD", 312.95, 0.015945, "EXECUTED"],
  ["2025-12-12", "00:11:04", "DIVIDEND", "MSFT", 0.01, "USD", null, null, "EXECUTED"],
  ["2025-12-13", "00:26:21", "BUY", "GOOGL", 199.9, "THB", 308.542, 0.0204186, "EXECUTED"],
  ["2025-12-16", "00:49:23", "DIVIDEND", "GOOGL", 0.05, "USD", null, null, "EXECUTED"],
  ["2025-12-23", "23:21:22", "BUY", "GOOGL", 16, "USD", 313.774, 0.0508965, "EXECUTED"],
  ["2025-12-25", "00:47:38", "DIVIDEND", "VOO", 0.02, "USD", null, null, "EXECUTED"],
  ["2026-01-07", "22:27:17", "BUY", "GOOGL", 32, "USD", 319.252, 0.1002342, "EXECUTED"],
  ["2026-01-07", "22:29:23", "BUY", "VOO", 499.74, "THB", 636.166, 0.0249148, "EXECUTED"],
  ["2026-01-27", "23:25:13", "BUY", "VOO", 499.95, "THB", 640.434, 0.0250299, "EXECUTED"],
  ["2026-02-03", "22:54:58", "BUY", "NVDA", 499.75, "THB", 180.448, 0.0873935, "EXECUTED"],
  ["2026-02-03", "23:02:57", "BUY", "AAPL", 499.91, "THB", 270.956, 0.0580537, "EXECUTED"],
  ["2026-02-05", "23:44:46", "BUY", "GOOGL", 699.94, "THB", 323.336, 0.067886, "EXECUTED"],
  ["2026-02-05", "23:45:27", "SELL", "MSFT", 4.92, "USD", 403.704, 0.0122344, "EXECUTED"],
  ["2026-02-06", "08:22:30", "FEE", "TAF_FEE", -0.01, "USD", null, null, "EXECUTED"],
  ["2026-02-13", "00:56:24", "DIVIDEND", "AAPL", 0.02, "USD", null, null, "EXECUTED"],
  ["2026-02-19", "00:08:28", "BUY", "VOO", 5, "USD", 633.326, 0.007879, "EXECUTED"],
  ["2026-02-19", "00:15:49", "BUY", "GOOGL", 299.76, "THB", 304.056, 0.0314415, "EXECUTED"],
  ["2026-02-19", "23:37:25", "BUY", "AAPL", 20, "USD", 263.742, 0.0757179, "EXECUTED"],
  ["2026-02-19", "23:38:07", "BUY", "VOO", 32, "USD", 629.694, 0.0507389, "EXECUTED"],
  ["2026-02-19", "23:38:36", "BUY", "GOOGL", 12, "USD", 304.6, 0.0393302, "EXECUTED"],
  ["2026-03-16", "23:55:22", "TAX", "GOOGL", -0.01, "USD", null, null, "EXECUTED"],
  ["2026-03-16", "23:55:35", "DIVIDEND", "GOOGL", 0.11, "USD", null, null, "EXECUTED"],
  ["2026-03-25", "00:46:17", "BUY", "VOO", 999.86, "THB", 601.794, 0.0505156, "EXECUTED"],
  ["2026-04-01", "01:38:36", "DIVIDEND", "VOO", 0.32, "USD", null, null, "EXECUTED"],
  ["2026-04-01", "01:39:13", "TAX", "VOO", -0.04, "USD", null, null, "EXECUTED"],
  ["2026-04-11", "00:16:38", "BUY", "VOO", 499.91, "THB", 624.05, 0.0248858, "EXECUTED"],
  ["2026-04-11", "00:17:08", "BUY", "AAPL", 199.9, "THB", 259.676, 0.0238759, "EXECUTED"],
  ["2026-04-11", "00:18:04", "BUY", "NVDA", 299.69, "THB", 188.308, 0.0493871, "EXECUTED"],
  ["2026-04-24", "21:56:10", "BUY", "NVDA", 199.89, "THB", 207.464, 0.0296436, "EXECUTED"],
  ["2026-04-24", "21:56:47", "BUY", "VOO", 599.68, "THB", 654.06, 0.0282084, "EXECUTED"],
  ["2026-04-24", "21:57:21", "BUY", "AAPL", 199.89, "THB", 271.684, 0.0226365, "EXECUTED"],
  ["2026-05-11", "23:47:12", "BUY", "VOO", 499.76, "THB", 680.132, 0.022672, "EXECUTED"],
  ["2026-05-12", "00:17:47", "BUY", "VOO", 15.5, "USD", 679.372, 0.0227857, "EXECUTED"],
  ["2026-05-14", "22:48:25", "BUY", "RKLB", 299.93, "THB", 128.6, 0.0719631, "EXECUTED"],
  ["2026-05-15", "01:29:34", "DIVIDEND", "AAPL", 0.06, "USD", null, null, "EXECUTED"],
  ["2026-05-19", "22:29:52", "BUY", "RKLB", 199.96, "THB", 119.248, 0.05107, "EXECUTED"],
  ["2026-05-26", "22:26:36", "BUY", "NVDA", 499.74, "THB", 214.604, 0.0709679, "EXECUTED"],
  ["2026-05-26", "22:32:13", "BUY", "AAPL", 499.74, "THB", 311.522, 0.048889, "EXECUTED"],
  ["2026-05-28", "21:11:15", "BUY", "RKLB", 199.84, "THB", 143.006, 0.0425856, "EXECUTED"],
  ["2026-05-29", "21:02:27", "BUY", "RKLB", 199.96, "THB", 139.974, 0.0437224, "EXECUTED"],
  ["2026-06-01", "23:42:25", "BUY", "AAPL", 299.9, "THB", null, null, "EXPIRED"],
  ["2026-06-02", "13:27:07", "BUY", "RKLB", 299.83, "THB", 121.9975, 0.0754113, "EXECUTED"],
  ["2026-06-02", "20:40:39", "BUY", "GOOGL", 9.79, "USD", 359.632, 0.0271666, "EXECUTED"],
  ["2026-06-02", "20:46:03", "SELL", "VOO", 111.8, "USD", 696.488, 0.1608067, "EXECUTED"],
  ["2026-06-02", "21:28:49", "BUY", "PLTR", 299.99, "THB", 151.93, 0.0602251, "EXECUTED"],
  ["2026-06-02", "22:01:02", "BUY", "NVDA", 499.96, "THB", 224, 0.068125, "EXECUTED"],
  ["2026-06-02", "22:23:49", "BUY", "PLTR", 399.96, "THB", null, null, "EXPIRED"],
  ["2026-06-03", "07:38:24", "FEE", "MARKET_FEE", -0.01, "USD", null, null, "EXECUTED"],
  ["2026-06-03", "07:38:24", "FEE", "TAF_FEE", -0.01, "USD", null, null, "EXECUTED"],
  ["2026-06-03", "20:45:24", "BUY", "PLTR", 199.85, "THB", 144.998, 0.0418626, "EXECUTED"],
  ["2026-06-03", "21:50:16", "BUY", "NVDA", 200, "THB", 214.998, 0.0282793, "EXECUTED"],
] satisfies RawDimeTransaction[];

function normalizeTransactions(): DimeTransaction[] {
  return DIME_TRANSACTIONS.map(
    ([
      date,
      time,
      type,
      symbol,
      amount,
      currency,
      executedPrice,
      shares,
      status,
    ], index) => ({
      index,
      date,
      time,
      type,
      symbol,
      amount,
      currency,
      executedPrice,
      shares,
      status,
    })
  );
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function getTransactionId(tx: DimeTransaction) {
  return `dime-${tx.date}-${tx.time.replaceAll(":", "")}-${tx.type.toLowerCase()}-${tx.symbol}-${tx.index + 1}`;
}

function dateNumber(date: string) {
  return Number(date.replaceAll("-", ""));
}

function getKnownExchangeRates(transactions: DimeTransaction[]) {
  const rates = new Map<string, number>();

  for (const tx of transactions) {
    if (
      tx.type !== "BUY" ||
      tx.status !== "EXECUTED" ||
      tx.currency !== "THB" ||
      !tx.shares ||
      !tx.executedPrice
    ) {
      continue;
    }

    const usdValue = tx.shares * tx.executedPrice;
    if (usdValue > 0) rates.set(tx.date, tx.amount / usdValue);
  }

  return rates;
}

function getExchangeRate(date: string, rates: Map<string, number>) {
  const exact = rates.get(date);
  if (exact) return exact;

  let closest = FALLBACK_USD_THB_RATE;
  let closestDistance = Number.POSITIVE_INFINITY;
  const target = dateNumber(date);

  rates.forEach((rate, rateDate) => {
    const distance = Math.abs(dateNumber(rateDate) - target);
    if (distance < closestDistance) {
      closest = rate;
      closestDistance = distance;
    }
  });

  return closest;
}

function getAmountThb(tx: DimeTransaction, rates: Map<string, number>) {
  if (tx.currency === "THB") return tx.amount;
  return tx.amount * getExchangeRate(tx.date, rates);
}

function getAmountUsd(tx: DimeTransaction) {
  if (tx.currency === "USD") return tx.amount;
  if (!tx.shares || !tx.executedPrice) return 0;
  return tx.shares * tx.executedPrice;
}

function getLogAction(type: DimeTransactionType): InvestmentLogAction {
  switch (type) {
    case "BUY":
      return "buy";
    case "SELL":
      return "sell";
    case "DIVIDEND":
      return "dividend";
    case "DIVIDEND_ADJUSTMENT":
      return "adjustment";
    case "TAX":
      return "tax";
    case "FEE":
      return "fee";
  }
}

function getLogReason(tx: DimeTransaction) {
  if (tx.status === "EXPIRED") return "Expired Dime order";
  switch (tx.type) {
    case "BUY":
      return "Dime buy";
    case "SELL":
      return "Dime sell";
    case "DIVIDEND":
      return "Dividend";
    case "DIVIDEND_ADJUSTMENT":
      return "Dividend adjustment";
    case "TAX":
      return "Withholding tax";
    case "FEE":
      return "Trading fee";
  }
}

function getFallbackCategory(symbol: string): StockCategory {
  if (symbol === "VOO") return "ETF";
  if (symbol === "AAPL") return "Blue Chip";
  if (symbol === "RKLB") return "Growth";
  return "Tech";
}

function buildInvestmentLog(
  transactions: DimeTransaction[],
  rates: Map<string, number>,
  realizedPnlById: Map<string, number>
) {
  return [...transactions]
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .map((tx): InvestmentLogEntry => {
      const rate = getExchangeRate(tx.date, rates);
      const sourceNote =
        tx.currency === "USD"
          ? `${tx.type} source ${tx.amount} USD @ ${rate.toFixed(4)}`
          : `${tx.type} source ${tx.amount} THB`;
      const id = getTransactionId(tx);
      const status: InvestmentStatus =
        tx.status === "EXECUTED" ? "executed" : "skipped";

      return {
        id,
        date: tx.date,
        symbol: tx.symbol,
        amount: round(getAmountThb(tx, rates)),
        targetPrice: tx.executedPrice ?? 0,
        actualPrice:
          tx.status === "EXECUTED" && tx.executedPrice
            ? tx.executedPrice
            : undefined,
        action: getLogAction(tx.type),
        shares: tx.shares ?? undefined,
        exchangeRate: round(rate, 4),
        realizedPnL: realizedPnlById.has(id)
          ? round(realizedPnlById.get(id) ?? 0)
          : undefined,
        reason: getLogReason(tx),
        status,
        notes: sourceNote,
      };
    });
}

function buildPortfolio(
  transactions: DimeTransaction[],
  rates: Map<string, number>,
  watchlist: StockWatchlistItem[]
) {
  const holdings = new Map<string, { shares: number; totalCostUsd: number }>();
  const realizedPnlById = new Map<string, number>();
  let totalInvestedThb = 0;

  for (const tx of transactions) {
    if (tx.status !== "EXECUTED") continue;

    if (tx.type === "BUY" && tx.shares && tx.executedPrice) {
      const holding = holdings.get(tx.symbol) ?? {
        shares: 0,
        totalCostUsd: 0,
      };
      holding.shares += tx.shares;
      holding.totalCostUsd += getAmountUsd(tx);
      holdings.set(tx.symbol, holding);
      totalInvestedThb += getAmountThb(tx, rates);
      continue;
    }

    if (tx.type === "SELL" && tx.shares && tx.executedPrice) {
      const holding = holdings.get(tx.symbol);
      if (!holding || holding.shares <= 0) continue;

      const avgCostUsd = holding.totalCostUsd / holding.shares;
      const sharesToSell = Math.min(holding.shares, tx.shares);
      const pnlUsd = getAmountUsd(tx) - sharesToSell * avgCostUsd;
      realizedPnlById.set(
        getTransactionId(tx),
        pnlUsd * getExchangeRate(tx.date, rates)
      );

      holding.shares -= sharesToSell;
      holding.totalCostUsd -= sharesToSell * avgCostUsd;
      holdings.set(tx.symbol, holding);
    }
  }

  const watchlistBySymbol = new Map(
    watchlist.map((stock) => [stock.symbol, stock])
  );
  const activeHoldings: PortfolioHolding[] = [];

  holdings.forEach((holding, symbol) => {
    if (holding.shares <= 0) return;

    const stock = watchlistBySymbol.get(symbol);
    activeHoldings.push({
      symbol,
      companyName: stock?.companyName ?? symbol,
      shares: holding.shares,
      avgCost: holding.totalCostUsd / holding.shares,
      currentPrice: stock?.currentPrice ?? holding.totalCostUsd / holding.shares,
      previousClose: stock?.previousClose,
      changePercent: stock?.changePercent,
      marketCap: stock?.marketCap,
      peRatio: stock?.peRatio,
      forwardPeRatio: stock?.forwardPeRatio,
      priceToSalesRatio: stock?.priceToSalesRatio,
      priceToBookRatio: stock?.priceToBookRatio,
      epsTtm: stock?.epsTtm,
      totalRevenueTtm: stock?.totalRevenueTtm,
      netIncomeTtm: stock?.netIncomeTtm,
      operatingCashFlowTtm: stock?.operatingCashFlowTtm,
      freeCashFlowTtm: stock?.freeCashFlowTtm,
      totalDebt: stock?.totalDebt,
      stockholdersEquity: stock?.stockholdersEquity,
      grossMarginPercent: stock?.grossMarginPercent,
      netMarginPercent: stock?.netMarginPercent,
      freeCashFlowMarginPercent: stock?.freeCashFlowMarginPercent,
      freeCashFlowYieldPercent: stock?.freeCashFlowYieldPercent,
      debtToEquityPercent: stock?.debtToEquityPercent,
      revenueGrowthYoYPercent: stock?.revenueGrowthYoYPercent,
      earningsGrowthYoYPercent: stock?.earningsGrowthYoYPercent,
      fundamentalsAsOf: stock?.fundamentalsAsOf,
      fundamentalsSource: stock?.fundamentalsSource,
      rsi14: stock?.rsi14,
      sma20: stock?.sma20,
      sma50: stock?.sma50,
      sma200: stock?.sma200,
      fiftyTwoWeekHigh: stock?.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: stock?.fiftyTwoWeekLow,
      distanceFrom52WeekHighPercent: stock?.distanceFrom52WeekHighPercent,
      quoteUpdatedAt: stock?.quoteUpdatedAt,
      dataSource: stock?.dataSource,
      allocationPercent: 0,
      category: stock?.category ?? getFallbackCategory(symbol),
    });
  });

  const totalValue = activeHoldings.reduce(
    (sum, holding) => sum + holding.shares * holding.currentPrice,
    0
  );
  const portfolio: Portfolio = {
    holdings: activeHoldings
      .map((holding) => ({
        ...holding,
        allocationPercent:
          totalValue > 0
            ? ((holding.shares * holding.currentPrice) / totalValue) * 100
            : 0,
      }))
      .sort((a, b) => b.allocationPercent - a.allocationPercent),
    cashBalance: 0,
    totalInvested: round(totalInvestedThb),
  };

  return { portfolio, realizedPnlById };
}

export function buildDimeSeedData(watchlist: StockWatchlistItem[]): {
  portfolio: Portfolio;
  investmentLog: InvestmentLogEntry[];
} {
  const transactions = normalizeTransactions().sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
  const rates = getKnownExchangeRates(transactions);
  const { portfolio, realizedPnlById } = buildPortfolio(
    transactions,
    rates,
    watchlist
  );
  const investmentLog = buildInvestmentLog(
    transactions,
    rates,
    realizedPnlById
  );

  return { portfolio, investmentLog };
}
