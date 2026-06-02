"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Portfolio,
  StockWatchlistItem,
  InvestmentLogEntry,
  MarketApiResponse,
  MarketSnapshot,
  MarketSyncStatus,
  ExecuteTradeInput,
  PortfolioHolding,
} from "@/types";
import {
  mockPortfolio,
  mockWatchlist,
  mockInvestmentLog,
} from "@/data/mockData";
import { saveToStorage, loadFromStorage, getStockStatus, getRecommendation, calcPortfolioMetrics, generateId, DEFAULT_USD_THB_RATE } from "@/lib/utils";

const MARKET_REFRESH_INTERVAL_MS = 60 * 1000;

interface AppContextType {
  portfolio: Portfolio;
  watchlist: StockWatchlistItem[];
  investmentLog: InvestmentLogEntry[];
  totalPortfolioValue: number;
  marketStatus: MarketSyncStatus;
  refreshMarketData: () => Promise<void>;
  executeTrade: (input: ExecuteTradeInput) => { ok: boolean; message?: string };
  executeLogEntry: (id: string) => { ok: boolean; message?: string };
  updatePortfolio: (p: Portfolio) => void;
  updateWatchlist: (w: StockWatchlistItem[]) => void;
  addLogEntry: (entry: InvestmentLogEntry) => void;
  updateLogEntry: (id: string, updates: Partial<InvestmentLogEntry>) => void;
  deleteLogEntry: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function isLegacySeedPortfolio(portfolio: Portfolio) {
  const googl = portfolio.holdings.find((holding) => holding.symbol === "GOOGL");
  return Boolean(
    googl &&
      Math.abs(googl.shares - 12.06) < 0.001 &&
      Math.abs(googl.currentPrice - 175) < 0.001
  );
}

function isLegacySeedWatchlist(watchlist: StockWatchlistItem[]) {
  const googl = watchlist.find((stock) => stock.symbol === "GOOGL");
  return Boolean(
    googl &&
      Math.abs(googl.currentPrice - 175) < 0.001 &&
      watchlist.some((stock) => stock.symbol === "ANET")
  );
}

function mergeDefaultWatchlist(watchlist: StockWatchlistItem[]) {
  const existingSymbols = new Set(watchlist.map((stock) => stock.symbol));
  const missingDefaults = mockWatchlist.filter(
    (stock) => !existingSymbols.has(stock.symbol)
  );
  return missingDefaults.length > 0
    ? [...watchlist, ...missingDefaults]
    : watchlist;
}

function migrateLegacySeedPortfolio(portfolio: Portfolio) {
  return isLegacySeedPortfolio(portfolio)
    ? {
        ...mockPortfolio,
        cashBalance: portfolio.cashBalance,
        totalInvested: portfolio.totalInvested,
      }
    : portfolio;
}

type RepairedHoldingDraft = {
  shares: number;
  costBasis: number;
  lastPrice: number;
};

function getExecutedShares(entry: InvestmentLogEntry) {
  const priceUsd = entry.actualPrice ?? entry.targetPrice;
  const exchangeRate = entry.exchangeRate ?? DEFAULT_USD_THB_RATE;

  if (entry.shares && entry.shares > 0) return entry.shares;
  if (entry.amount <= 0 || priceUsd <= 0 || exchangeRate <= 0) return null;

  const shares = entry.amount / exchangeRate / priceUsd;
  return Number.isFinite(shares) && shares > 0 ? shares : null;
}

function repairMissingHoldingsFromExecutedLogs(
  portfolio: Portfolio,
  logs: InvestmentLogEntry[],
  watchlist: StockWatchlistItem[]
) {
  const activeSymbols = new Set(
    portfolio.holdings
      .filter((holding) => holding.shares > 0)
      .map((holding) => holding.symbol)
  );
  const watchlistBySymbol = new Map(
    watchlist.map((stock) => [stock.symbol, stock])
  );
  const drafts = new Map<string, RepairedHoldingDraft>();

  const executedLogs = [...logs]
    .filter((entry) => entry.status === "executed")
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const entry of executedLogs) {
    if (activeSymbols.has(entry.symbol)) continue;

    const shares = getExecutedShares(entry);
    const priceUsd = entry.actualPrice ?? entry.targetPrice;
    if (!shares || priceUsd <= 0) continue;

    const action = entry.action ?? "buy";
    const draft =
      drafts.get(entry.symbol) ?? {
        shares: 0,
        costBasis: 0,
        lastPrice: priceUsd,
      };

    if (action === "buy") {
      draft.shares += shares;
      draft.costBasis += shares * priceUsd;
    } else {
      const sharesToSell = Math.min(draft.shares, shares);
      const avgCost = draft.shares > 0 ? draft.costBasis / draft.shares : 0;
      draft.shares = Math.max(0, draft.shares - sharesToSell);
      draft.costBasis = Math.max(0, draft.costBasis - sharesToSell * avgCost);
    }

    draft.lastPrice = priceUsd;
    drafts.set(entry.symbol, draft);
  }

  const repairedHoldings: PortfolioHolding[] = [];
  drafts.forEach((draft, symbol) => {
    if (draft.shares <= 0 || activeSymbols.has(symbol)) return;

    const stock = watchlistBySymbol.get(symbol);
    repairedHoldings.push({
      symbol,
      companyName: stock?.companyName ?? symbol,
      shares: draft.shares,
      avgCost: draft.costBasis / draft.shares,
      currentPrice: stock?.currentPrice ?? draft.lastPrice,
      previousClose: stock?.previousClose,
      changePercent: stock?.changePercent,
      peRatio: stock?.peRatio,
      forwardPeRatio: stock?.forwardPeRatio,
      rsi14: stock?.rsi14,
      quoteUpdatedAt: stock?.quoteUpdatedAt,
      dataSource: stock?.dataSource,
      allocationPercent: 0,
      category: stock?.category ?? "Tech",
    });
  });

  return repairedHoldings.length > 0
    ? {
        ...portfolio,
        holdings: [...portfolio.holdings, ...repairedHoldings],
      }
    : portfolio;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [portfolio, setPortfolio] = useState<Portfolio>(mockPortfolio);
  const [watchlist, setWatchlist] = useState<StockWatchlistItem[]>(mockWatchlist);
  const [investmentLog, setInvestmentLog] = useState<InvestmentLogEntry[]>(mockInvestmentLog);
  const [marketStatus, setMarketStatus] = useState<MarketSyncStatus>({
    isLoading: false,
    refreshIntervalMs: MARKET_REFRESH_INTERVAL_MS,
  });
  const marketRequestInFlight = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedPortfolio = loadFromStorage("PORTFOLIO", mockPortfolio);
    const savedWatchlist = loadFromStorage("WATCHLIST", mockWatchlist);
    const savedLog = loadFromStorage("LOG", mockInvestmentLog);
    const watchlistToUse = isLegacySeedWatchlist(savedWatchlist)
      ? mockWatchlist
      : mergeDefaultWatchlist(savedWatchlist);
    const migratedPortfolio = migrateLegacySeedPortfolio(savedPortfolio);
    const portfolioToUse = repairMissingHoldingsFromExecutedLogs(
      migratedPortfolio,
      savedLog,
      watchlistToUse
    );

    setPortfolio(portfolioToUse);
    setWatchlist(watchlistToUse);
    setInvestmentLog(savedLog);
    if (portfolioToUse !== savedPortfolio) saveToStorage("PORTFOLIO", portfolioToUse);
    if (watchlistToUse !== savedWatchlist) saveToStorage("WATCHLIST", watchlistToUse);
    setHydrated(true);
  }, []);

  // Recompute statuses whenever watchlist prices change
  const enrichedWatchlist = React.useMemo(() => {
    const { totalValue } = calcPortfolioMetrics(portfolio.holdings);
    return watchlist.map((stock) => {
      const status = getStockStatus(stock.currentPrice, stock.levels);
      const holding = portfolio.holdings.find((h) => h.symbol === stock.symbol) || null;
      const recommendation = getRecommendation(status, holding, totalValue, stock.category);
      return { ...stock, status, recommendation };
    });
  }, [watchlist, portfolio]);

  const { totalValue } = calcPortfolioMetrics(portfolio.holdings);

  const symbolsKey = React.useMemo(() => {
    const symbols = new Set<string>();
    watchlist.forEach((stock) => symbols.add(stock.symbol));
    portfolio.holdings.forEach((holding) => symbols.add(holding.symbol));
    return Array.from(symbols).sort().join(",");
  }, [watchlist, portfolio.holdings]);

  const applyMarketSnapshots = useCallback((snapshots: MarketSnapshot[]) => {
    if (snapshots.length === 0) return;
    const marketBySymbol = new Map(
      snapshots.map((snapshot) => [snapshot.symbol, snapshot])
    );

    setWatchlist((prev) => {
      const updated = prev.map((stock) => {
        const snapshot = marketBySymbol.get(stock.symbol);
        if (!snapshot) return stock;

        return {
          ...stock,
          companyName: snapshot.companyName || stock.companyName,
          currentPrice: snapshot.currentPrice,
          previousClose: snapshot.previousClose,
          changePercent: snapshot.changePercent,
          changeAmount: snapshot.changeAmount,
          currency: snapshot.currency,
          dayHigh: snapshot.dayHigh,
          dayLow: snapshot.dayLow,
          volume: snapshot.volume,
          marketCap: snapshot.marketCap,
          peRatio: snapshot.peRatio,
          forwardPeRatio: snapshot.forwardPeRatio,
          rsi14: snapshot.rsi14,
          levels: snapshot.levels ?? stock.levels,
          marketTime: snapshot.marketTime,
          quoteUpdatedAt: snapshot.quoteUpdatedAt,
          dataSource: snapshot.source,
          priceHistory:
            snapshot.priceHistory.length > 0
              ? snapshot.priceHistory
              : stock.priceHistory,
        };
      });
      saveToStorage("WATCHLIST", updated);
      return updated;
    });

    setPortfolio((prev) => {
      const updated = {
        ...prev,
        holdings: prev.holdings.map((holding) => {
          const snapshot = marketBySymbol.get(holding.symbol);
          if (!snapshot) return holding;

          return {
            ...holding,
            companyName: snapshot.companyName || holding.companyName,
            currentPrice: snapshot.currentPrice,
            previousClose: snapshot.previousClose,
            changePercent: snapshot.changePercent,
            peRatio: snapshot.peRatio,
            forwardPeRatio: snapshot.forwardPeRatio,
            rsi14: snapshot.rsi14,
            quoteUpdatedAt: snapshot.quoteUpdatedAt,
            dataSource: snapshot.source,
          };
        }),
      };
      saveToStorage("PORTFOLIO", updated);
      return updated;
    });
  }, []);

  const refreshMarketData = useCallback(async () => {
    if (!symbolsKey) return;
    if (marketRequestInFlight.current) return;
    marketRequestInFlight.current = true;

    setMarketStatus((prev) => ({
      ...prev,
      isLoading: true,
      refreshIntervalMs: MARKET_REFRESH_INTERVAL_MS,
      error: undefined,
    }));

    try {
      const res = await fetch(
        `/api/market?symbols=${encodeURIComponent(symbolsKey)}&t=${Date.now()}`,
        {
          cache: "no-store",
        }
      );
      const payload = (await res.json()) as MarketApiResponse;

      if (!res.ok) {
        throw new Error(payload.errors[0]?.message ?? "Market data sync failed");
      }

      applyMarketSnapshots(payload.data);
      setMarketStatus({
        isLoading: false,
        updatedAt: payload.updatedAt,
        source: payload.data[0]?.source ?? payload.source,
        refreshIntervalMs: MARKET_REFRESH_INTERVAL_MS,
        error:
          payload.data.length === 0
            ? payload.errors[0]?.message ?? "No market data returned"
            : undefined,
      });
    } catch (error) {
      setMarketStatus((prev) => ({
        ...prev,
        isLoading: false,
        refreshIntervalMs: MARKET_REFRESH_INTERVAL_MS,
        error:
          error instanceof Error ? error.message : "Market data sync failed",
      }));
    } finally {
      marketRequestInFlight.current = false;
    }
  }, [applyMarketSnapshots, symbolsKey]);

  useEffect(() => {
    if (!hydrated || !symbolsKey) return;

    refreshMarketData();
    const interval = window.setInterval(
      refreshMarketData,
      MARKET_REFRESH_INTERVAL_MS
    );

    return () => window.clearInterval(interval);
  }, [hydrated, refreshMarketData, symbolsKey]);

  const updatePortfolio = useCallback((p: Portfolio) => {
    setPortfolio(p);
    saveToStorage("PORTFOLIO", p);
  }, []);

  const updateWatchlist = useCallback((w: StockWatchlistItem[]) => {
    setWatchlist(w);
    saveToStorage("WATCHLIST", w);
  }, []);

  const executeTrade = useCallback((input: ExecuteTradeInput) => {
    if (input.amountThb <= 0 || input.priceUsd <= 0 || input.exchangeRate <= 0) {
      return { ok: false, message: "กรุณากรอกจำนวนเงินและราคาให้ถูกต้อง" };
    }

    const amountUsd = input.amountThb / input.exchangeRate;
    const executedShares = amountUsd / input.priceUsd;
    const existing = portfolio.holdings.find((h) => h.symbol === input.symbol);

    if (input.action === "sell") {
      if (!existing || existing.shares <= 0) {
        return { ok: false, message: "ยังไม่มีหุ้นตัวนี้ให้ขาย" };
      }
      if (executedShares > existing.shares + 0.000001) {
        return { ok: false, message: "จำนวนขายมากกว่าหุ้นที่ถืออยู่" };
      }
    }

    let updatedHoldings = portfolio.holdings;
    let cashBalance = portfolio.cashBalance;
    let realizedPnL: number | undefined;

    if (input.action === "buy") {
      cashBalance -= input.amountThb;
      if (existing) {
        updatedHoldings = portfolio.holdings.map((holding) => {
          if (holding.symbol !== input.symbol) return holding;
          const nextShares = holding.shares + executedShares;
          const nextAvgCost =
            nextShares > 0
              ? (holding.shares * holding.avgCost +
                  executedShares * input.priceUsd) /
                nextShares
              : input.priceUsd;
          return {
            ...holding,
            shares: nextShares,
            avgCost: nextAvgCost,
            currentPrice: input.priceUsd,
          };
        });
      } else {
        updatedHoldings = [
          ...portfolio.holdings,
          {
            symbol: input.symbol,
            companyName: input.companyName,
            shares: executedShares,
            avgCost: input.priceUsd,
            currentPrice: input.priceUsd,
            allocationPercent: 0,
            category: input.category,
          },
        ];
      }
    } else if (existing) {
      realizedPnL =
        (input.priceUsd - existing.avgCost) *
        executedShares *
        input.exchangeRate;
      cashBalance += input.amountThb;
      updatedHoldings = portfolio.holdings.map((holding) =>
        holding.symbol === input.symbol
          ? {
              ...holding,
              shares: Math.max(0, holding.shares - executedShares),
              currentPrice: input.priceUsd,
            }
          : holding
      );
    }

    const createdEntry: InvestmentLogEntry = {
      id: generateId(),
      date: input.date ?? new Date().toISOString().slice(0, 10),
      symbol: input.symbol,
      amount: input.amountThb,
      targetPrice: input.priceUsd,
      actualPrice: input.priceUsd,
      action: input.action,
      shares: executedShares,
      exchangeRate: input.exchangeRate,
      realizedPnL,
      reason: input.reason,
      status: "executed",
      notes: input.notes,
    };

    const updatedPortfolio = {
      ...portfolio,
      cashBalance,
      holdings: updatedHoldings,
    };
    setPortfolio(updatedPortfolio);
    saveToStorage("PORTFOLIO", updatedPortfolio);

    setInvestmentLog((prev) => {
      const updated = [createdEntry, ...prev];
      saveToStorage("LOG", updated);
      return updated;
    });

    return { ok: true };
  }, [portfolio]);

  const executeLogEntry = useCallback((id: string) => {
    const entry = investmentLog.find((logEntry) => logEntry.id === id);
    if (!entry) return { ok: false, message: "ไม่พบรายการนี้" };
    if (entry.status !== "planned") {
      return { ok: false, message: "รายการนี้ไม่ได้อยู่ในสถานะ planned" };
    }

    const action = entry.action ?? "buy";
    const amountThb = entry.amount;
    const priceUsd = entry.actualPrice ?? entry.targetPrice;
    const exchangeRate = entry.exchangeRate ?? DEFAULT_USD_THB_RATE;

    if (amountThb <= 0 || priceUsd <= 0 || exchangeRate <= 0) {
      return { ok: false, message: "ข้อมูลจำนวนเงินหรือราคาไม่ถูกต้อง" };
    }

    const amountUsd = amountThb / exchangeRate;
    const executedShares = amountUsd / priceUsd;
    const existing = portfolio.holdings.find((h) => h.symbol === entry.symbol);
    const watchlistStock = watchlist.find((stock) => stock.symbol === entry.symbol);

    if (action === "sell") {
      if (!existing || existing.shares <= 0) {
        return { ok: false, message: "ยังไม่มีหุ้นตัวนี้ให้ขาย" };
      }
      if (executedShares > existing.shares + 0.000001) {
        return { ok: false, message: "จำนวนขายมากกว่าหุ้นที่ถืออยู่" };
      }
    }

    let updatedHoldings = portfolio.holdings;
    let cashBalance = portfolio.cashBalance;
    let realizedPnL: number | undefined;

    if (action === "buy") {
      cashBalance -= amountThb;
      if (existing) {
        updatedHoldings = portfolio.holdings.map((holding) => {
          if (holding.symbol !== entry.symbol) return holding;
          const nextShares = holding.shares + executedShares;
          const nextAvgCost =
            nextShares > 0
              ? (holding.shares * holding.avgCost +
                  executedShares * priceUsd) /
                nextShares
              : priceUsd;
          return {
            ...holding,
            shares: nextShares,
            avgCost: nextAvgCost,
            currentPrice: priceUsd,
          };
        });
      } else {
        updatedHoldings = [
          ...portfolio.holdings,
          {
            symbol: entry.symbol,
            companyName: watchlistStock?.companyName ?? entry.symbol,
            shares: executedShares,
            avgCost: priceUsd,
            currentPrice: priceUsd,
            allocationPercent: 0,
            category: watchlistStock?.category ?? "Tech",
          },
        ];
      }
    } else if (existing) {
      realizedPnL =
        (priceUsd - existing.avgCost) * executedShares * exchangeRate;
      cashBalance += amountThb;
      updatedHoldings = portfolio.holdings.map((holding) =>
        holding.symbol === entry.symbol
          ? {
              ...holding,
              shares: Math.max(0, holding.shares - executedShares),
              currentPrice: priceUsd,
            }
          : holding
      );
    }

    const updatedPortfolio = {
      ...portfolio,
      cashBalance,
      holdings: updatedHoldings,
    };
    setPortfolio(updatedPortfolio);
    saveToStorage("PORTFOLIO", updatedPortfolio);

    setInvestmentLog((prev) => {
      const updated = prev.map((logEntry) =>
        logEntry.id === id
          ? {
              ...logEntry,
              status: "executed" as const,
              actualPrice: priceUsd,
              shares: executedShares,
              exchangeRate,
              realizedPnL,
            }
          : logEntry
      );
      saveToStorage("LOG", updated);
      return updated;
    });

    return { ok: true };
  }, [investmentLog, portfolio, watchlist]);

  const addLogEntry = useCallback((entry: InvestmentLogEntry) => {
    setInvestmentLog((prev) => {
      const updated = [entry, ...prev];
      saveToStorage("LOG", updated);
      return updated;
    });
  }, []);

  const updateLogEntry = useCallback(
    (id: string, updates: Partial<InvestmentLogEntry>) => {
      setInvestmentLog((prev) => {
        const updated = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
        saveToStorage("LOG", updated);
        return updated;
      });
    },
    []
  );

  const deleteLogEntry = useCallback((id: string) => {
    setInvestmentLog((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveToStorage("LOG", updated);
      return updated;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        portfolio,
        watchlist: enrichedWatchlist,
        investmentLog,
        totalPortfolioValue: totalValue,
        marketStatus,
        refreshMarketData,
        executeTrade,
        executeLogEntry,
        updatePortfolio,
        updateWatchlist,
        addLogEntry,
        updateLogEntry,
        deleteLogEntry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
