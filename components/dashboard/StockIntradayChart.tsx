"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, RefreshCw, Radio } from "lucide-react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { clsx } from "clsx";
import { formatPercent } from "@/lib/utils";
import type {
  IntradayApiResponse,
  StockWatchlistItem,
} from "@/types";

const AUTO_REFRESH_MS = 60 * 1000;

type ChartPoint = {
  time: string;
  timestamp: string;
  price: number;
};

type TooltipPayload = {
  payload: ChartPoint;
  value?: number;
};

function getLocalDateInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatSyncTime(timestamp?: string) {
  if (!timestamp) return "waiting";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function IntradayTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#1e2d45] bg-[#0d1220] px-2.5 py-2 text-[11px] shadow-xl">
      <p className="text-slate-500">{point.time}</p>
      <p className="font-medium text-slate-100">
        ${point.price.toFixed(2)}
      </p>
    </div>
  );
}

export default function StockIntradayChart({
  stock,
  avgCost,
}: {
  stock: StockWatchlistItem;
  avgCost?: number;
}) {
  const [selectedDate, setSelectedDate] = useState("");
  const [payload, setPayload] = useState<IntradayApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadIntraday = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        symbol: stock.symbol,
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
            "ยังไม่มีข้อมูล intraday สำหรับ session นี้"
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
  }, [selectedDate, stock.symbol]);

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

  const chartData = useMemo<ChartPoint[]>(() => {
    const series = payload?.data.find((item) => item.symbol === stock.symbol);
    return (
      series?.points.map((point) => ({
        timestamp: point.timestamp,
        time: formatTime(point.timestamp),
        price: point.price,
      })) ?? []
    );
  }, [payload, stock.symbol]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const first = chartData[0].price;
    const latest = chartData.at(-1)?.price ?? first;
    const high = Math.max(...chartData.map((point) => point.price));
    const low = Math.min(...chartData.map((point) => point.price));
    const change = latest - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;

    return { first, latest, high, low, change, changePercent };
  }, [chartData]);

  const lineColor = stats && stats.change >= 0 ? "#10b981" : "#ef4444";
  const minPrice =
    chartData.length > 0
      ? Math.min(...chartData.map((point) => point.price)) * 0.998
      : stock.currentPrice * 0.98;
  const maxPrice =
    chartData.length > 0
      ? Math.max(...chartData.map((point) => point.price)) * 1.002
      : stock.currentPrice * 1.02;

  return (
    <div className="px-5 py-3">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-emerald-400/80">
            <Radio className="h-3.5 w-3.5" />
            Live regular session
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-numeric text-[13px] font-semibold text-slate-100">
              {stats ? `$${stats.latest.toFixed(2)}` : "--"}
            </span>
            <span
              className={clsx(
                "font-numeric text-[11px]",
                stats
                  ? stats.change >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                  : "text-slate-600"
              )}
            >
              {stats
                ? `${stats.change >= 0 ? "+" : ""}$${stats.change.toFixed(
                    2
                  )} (${formatPercent(stats.changePercent)})`
                : "market open-close"}
            </span>
            <span className="text-[10px] text-slate-600">
              Sync {formatSyncTime(payload?.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 items-center gap-2 rounded-lg border border-[#1e2d45] bg-[#141d2e] px-2">
            <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              max={getLocalDateInputValue()}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-[122px] bg-transparent text-[11px] text-slate-300 outline-none"
            />
          </div>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className="h-8 rounded-lg border border-[#1e2d45] px-2.5 text-[10px] text-slate-400 transition-colors hover:border-blue-500/40 hover:text-slate-200"
            >
              Latest
            </button>
          )}
          <button
            type="button"
            onClick={loadIntraday}
            className="grid h-8 w-8 place-items-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 transition-colors hover:bg-blue-500/15"
            title="Refresh intraday chart"
            aria-label="Refresh intraday chart"
          >
            <RefreshCw className={clsx("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="h-[174px] overflow-hidden rounded-lg border border-[#162035] bg-[#080c14]/35">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={174}>
            <AreaChart
              data={chartData}
              margin={{ top: 16, right: 14, bottom: 4, left: 0 }}
            >
              <defs>
                <linearGradient
                  id={`intradayGrad-${stock.symbol}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#4a6080" }}
                tickLine={false}
                axisLine={false}
                minTickGap={22}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                tick={{ fontSize: 10, fill: "#4a6080" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
                width={45}
              />
              <Tooltip content={<IntradayTooltip />} />
              {stock.levels.support.slice(0, 2).map((support, index) => (
                <ReferenceLine
                  key={`support-${index}`}
                  y={support}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
              ))}
              {stock.levels.resistance.slice(0, 2).map((resistance, index) => (
                <ReferenceLine
                  key={`resistance-${index}`}
                  y={resistance}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
              ))}
              {avgCost && avgCost > 0 && (
                <ReferenceLine
                  y={avgCost}
                  stroke="#f59e0b"
                  strokeDasharray="4 2"
                  strokeOpacity={0.7}
                  strokeWidth={1.5}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke={lineColor}
                strokeWidth={1.8}
                fill={`url(#intradayGrad-${stock.symbol})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-[12px] text-slate-600">
            {loading ? "กำลังโหลดกราฟ..." : error || "รอข้อมูลตลาดเปิด"}
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-2 text-[10px] text-slate-600">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 text-emerald-500">
            <span className="w-3 border-t border-dashed border-emerald-500" />{" "}
            Support
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <span className="w-3 border-t border-dashed border-red-500" />{" "}
            Resistance
          </span>
          {avgCost && avgCost > 0 && (
            <span className="flex items-center gap-1 text-amber-500">
              <span className="w-3 border-t border-dashed border-amber-500" />{" "}
              Avg Cost
            </span>
          )}
        </div>
        <span>{selectedDate ? selectedDate : "Auto refresh 60s"}</span>
      </div>
    </div>
  );
}
