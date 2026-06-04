"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarClock,
  LineChart as LineChartIcon,
  RefreshCw,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { clsx } from "clsx";
import { useApp } from "@/lib/context";
import {
  DEFAULT_USD_THB_RATE,
  formatCurrency,
  formatPercent,
  getPnLColor,
} from "@/lib/utils";
import type { IntradayApiResponse, IntradaySeries } from "@/types";

const PORTFOLIO_VALUE = "__PORTFOLIO__";
const AUTO_REFRESH_MS = 60 * 1000;

type ChartPoint = {
  timestamp: string;
  value: number;
};

function getLocalDateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatTimeLabel(timestamp: string) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatUpdatedAt(timestamp?: string) {
  if (!timestamp) return "ยังไม่ sync";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function ChartTooltip({
  active,
  payload,
  isPortfolio,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  isPortfolio: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#1e2d45] bg-[#0d1220] px-3 py-2 text-[12px] shadow-xl">
      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {formatTimeLabel(point.timestamp)}
      </p>
      <p className="mt-1 font-semibold text-slate-100">
        {isPortfolio
          ? formatCurrency(point.value, "THB")
          : formatCurrency(point.value)}
      </p>
    </div>
  );
}

function buildPortfolioPoints(
  seriesList: IntradaySeries[],
  sharesBySymbol: Map<string, number>
) {
  const sortedTimes = Array.from(
    new Set(
      seriesList.flatMap((series) =>
        series.points.map((point) => Date.parse(point.timestamp))
      )
    )
  ).sort((a, b) => a - b);
  const cursors = new Map(seriesList.map((series) => [series.symbol, 0]));
  const lastPrice = new Map<string, number>();
  const chartPoints: ChartPoint[] = [];

  for (const time of sortedTimes) {
    for (const series of seriesList) {
      let cursor = cursors.get(series.symbol) ?? 0;
      while (
        cursor < series.points.length &&
        Date.parse(series.points[cursor].timestamp) <= time
      ) {
        lastPrice.set(series.symbol, series.points[cursor].price);
        cursor += 1;
      }
      cursors.set(series.symbol, cursor);
    }

    let total = 0;
    let hasValue = false;
    for (const series of seriesList) {
      const shares = sharesBySymbol.get(series.symbol);
      const price = lastPrice.get(series.symbol);
      if (!shares || price === undefined) continue;
      total += shares * price * DEFAULT_USD_THB_RATE;
      hasValue = true;
    }

    if (hasValue) {
      chartPoints.push({
        timestamp: new Date(time).toISOString(),
        value: total,
      });
    }
  }

  return chartPoints;
}

export default function IntradayChart() {
  const { portfolio, watchlist } = useApp();
  const activeHoldings = useMemo(
    () => portfolio.holdings.filter((holding) => holding.shares > 0),
    [portfolio.holdings]
  );
  const symbolOptions = useMemo(
    () => watchlist.map((stock) => stock.symbol),
    [watchlist]
  );
  const [selectedSymbol, setSelectedSymbol] = useState(PORTFOLIO_VALUE);
  const [selectedDate, setSelectedDate] = useState("");
  const [payload, setPayload] = useState<IntradayApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPortfolio = selectedSymbol === PORTFOLIO_VALUE;
  const targetSymbols = useMemo(() => {
    if (isPortfolio) {
      return activeHoldings.map((holding) => holding.symbol);
    }
    return selectedSymbol ? [selectedSymbol] : [];
  }, [activeHoldings, isPortfolio, selectedSymbol]);
  const targetSymbolsKey = targetSymbols.join(",");

  const loadIntraday = useCallback(async () => {
    if (!targetSymbolsKey) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        symbols: targetSymbolsKey,
        t: String(Date.now()),
      });
      if (selectedDate) params.set("date", selectedDate);

      const res = await fetch(`/api/market/intraday?${params.toString()}`, {
        cache: "no-store",
      });
      const nextPayload = (await res.json()) as IntradayApiResponse;

      if (!res.ok) {
        throw new Error(
          nextPayload.errors[0]?.message ?? "Intraday data sync failed"
        );
      }

      setPayload(nextPayload);
      if (nextPayload.data.length === 0) {
        setError(
          nextPayload.errors[0]?.message ??
            "ยังไม่มีข้อมูล intraday สำหรับช่วงนี้"
        );
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Intraday data sync failed"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate, targetSymbolsKey]);

  useEffect(() => {
    const initialLoad = window.setTimeout(loadIntraday, 0);
    if (selectedDate) {
      return () => window.clearTimeout(initialLoad);
    }

    const interval = window.setInterval(loadIntraday, AUTO_REFRESH_MS);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadIntraday, selectedDate]);

  const chartPoints = useMemo(() => {
    const seriesList = payload?.data ?? [];
    if (seriesList.length === 0) return [];

    if (isPortfolio) {
      const sharesBySymbol = new Map(
        activeHoldings.map((holding) => [holding.symbol, holding.shares])
      );
      return buildPortfolioPoints(seriesList, sharesBySymbol);
    }

    return (
      seriesList
        .find((series) => series.symbol === selectedSymbol)
        ?.points.map((point) => ({
          timestamp: point.timestamp,
          value: point.price,
        })) ?? []
    );
  }, [activeHoldings, isPortfolio, payload, selectedSymbol]);

  const stats = useMemo(() => {
    if (chartPoints.length === 0) return null;
    const first = chartPoints[0].value;
    const latest = chartPoints.at(-1)?.value ?? first;
    const high = Math.max(...chartPoints.map((point) => point.value));
    const low = Math.min(...chartPoints.map((point) => point.value));
    const change = latest - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;

    return { first, latest, high, low, change, changePercent };
  }, [chartPoints]);

  const lineColor = stats && stats.change >= 0 ? "#10b981" : "#ef4444";
  const currentSymbolLabel = isPortfolio
    ? "Portfolio"
    : watchlist.find((stock) => stock.symbol === selectedSymbol)?.symbol ??
      selectedSymbol;

  return (
    <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
              Live 1D Chart
            </h3>
          </div>
          <p className="mt-1 truncate text-[13px] font-semibold text-slate-100">
            {currentSymbolLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSymbol}
            onChange={(event) => setSelectedSymbol(event.target.value)}
            className="h-9 min-w-[132px] rounded-lg border border-[#1e2d45] bg-[#141d2e] px-3 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          >
            {activeHoldings.length > 0 && (
              <option value={PORTFOLIO_VALUE}>Portfolio</option>
            )}
            {symbolOptions.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>

          <div className="flex h-9 items-center gap-2 rounded-lg border border-[#1e2d45] bg-[#141d2e] px-2">
            <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              max={getLocalDateInputValue()}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-[122px] bg-transparent text-[12px] text-slate-300 outline-none"
            />
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className="h-9 rounded-lg border border-[#1e2d45] px-3 text-[11px] text-slate-400 transition-colors hover:border-blue-500/40 hover:text-slate-200"
            >
              Latest
            </button>
          )}

          <button
            type="button"
            onClick={loadIntraday}
            className="grid h-9 w-9 place-items-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 transition-colors hover:bg-blue-500/15"
            title="Refresh intraday chart"
            aria-label="Refresh intraday chart"
          >
            <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-[24px] font-semibold leading-tight text-slate-100">
            {stats
              ? isPortfolio
                ? formatCurrency(stats.latest, "THB")
                : formatCurrency(stats.latest)
              : "--"}
          </p>
          <div
            className={clsx(
              "mt-1 flex items-center gap-2 text-[12px]",
              stats ? getPnLColor(stats.change) : "text-slate-600"
            )}
          >
            <LineChartIcon className="h-3.5 w-3.5" />
            <span>
              {stats
                ? `${stats.change >= 0 ? "+" : ""}${
                    isPortfolio
                      ? formatCurrency(stats.change, "THB")
                      : formatCurrency(stats.change)
                  } (${formatPercent(stats.changePercent)})`
                : "รอข้อมูล"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">
              High
            </p>
            <p className="mt-1 text-[12px] text-slate-300">
              {stats
                ? isPortfolio
                  ? formatCurrency(stats.high, "THB")
                  : formatCurrency(stats.high)
                : "--"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">
              Low
            </p>
            <p className="mt-1 text-[12px] text-slate-300">
              {stats
                ? isPortfolio
                  ? formatCurrency(stats.low, "THB")
                  : formatCurrency(stats.low)
                : "--"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">
              Sync
            </p>
            <p className="mt-1 text-[12px] text-slate-300">
              {formatUpdatedAt(payload?.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 h-[240px] overflow-hidden rounded-lg border border-[#162035] bg-[#080c14]/40">
        {chartPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartPoints}
              margin={{ top: 18, right: 18, bottom: 10, left: 10 }}
            >
              <CartesianGrid stroke="#162035" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTimeLabel}
                tick={{ fill: "#4a6080", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#4a6080", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={62}
                tickFormatter={(value) =>
                  isPortfolio
                    ? `฿${Math.round(Number(value)).toLocaleString()}`
                    : `$${Number(value).toFixed(0)}`
                }
              />
              <Tooltip
                content={<ChartTooltip isPortfolio={isPortfolio} />}
                cursor={{ stroke: "#334155", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-[12px] text-slate-600">
            {loading ? "กำลังโหลดกราฟ..." : error || "ยังไม่มีข้อมูลกราฟ"}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
        <span>{payload?.interval ?? (selectedDate ? "5m" : "1m")} candles</span>
        <span>{selectedDate ? selectedDate : "Latest session, auto 60s"}</span>
      </div>

      {error && chartPoints.length > 0 && (
        <p className="mt-2 text-[11px] text-amber-400">{error}</p>
      )}
    </div>
  );
}
