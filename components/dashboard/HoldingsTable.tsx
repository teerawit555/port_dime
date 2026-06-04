"use client";

import { PortfolioHolding } from "@/types";
import {
  formatCurrency,
  formatPercent,
  formatMultiple,
  formatOptionalNumber,
  formatPeRatio,
  calcHoldingMetrics,
  getPnLColor,
  getRsiColor,
} from "@/lib/utils";
import { ALLOCATION_COLORS } from "@/data/mockData";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HoldingsTableProps {
  holdings: PortfolioHolding[];
  totalValue: number;
  exchangeRate?: number;
  onSelectStock?: (symbol: string) => void;
}

function formatShares(shares: number) {
  return shares < 1 ? shares.toFixed(4) : shares.toFixed(2);
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <div className={clsx("mt-1 truncate text-[12px] text-slate-300", className)}>
        {value}
      </div>
    </div>
  );
}

export default function HoldingsTable({
  holdings,
  totalValue,
  exchangeRate = 1,
  onSelectStock,
}: HoldingsTableProps) {
  const active = holdings.filter((h) => h.shares > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-[#1e2d45] bg-[#0d1220]">
      <div className="flex items-center justify-between gap-3 border-b border-[#1e2d45] px-4 py-3">
        <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
          Holdings
        </h3>
        <span className="text-[11px] text-slate-600">
          {active.length} positions
        </span>
      </div>

      <div>
        {active.map((h) => {
          const { currentValue, pnl, pnlPercent } = calcHoldingMetrics(h);
          const currentValueThb = currentValue * exchangeRate;
          const pnlThb = pnl * exchangeRate;
          const realAlloc =
            totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
          const color = ALLOCATION_COLORS[h.symbol] ?? "#475569";

          return (
            <button
              key={h.symbol}
              type="button"
              className="table-row-hover block w-full border-t border-[#162035] px-4 py-3 text-left transition-colors first:border-t-0"
              onClick={() => onSelectStock?.(h.symbol)}
            >
              <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(130px,0.9fr)_minmax(155px,1fr)_minmax(190px,1.25fr)_minmax(150px,1fr)]">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-9 w-1.5 flex-shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-100">
                      {h.symbol}
                    </p>
                    <p className="truncate text-[10px] text-slate-600">
                      {h.category}
                    </p>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-600">
                    Value
                  </p>
                  <p className="mt-1 truncate text-[13px] font-medium text-slate-100">
                    {formatCurrency(currentValueThb, "THB")}
                  </p>
                  <p className="truncate text-[10px] text-slate-600">
                    ~ {formatCurrency(currentValue)}
                  </p>
                </div>

                <div className="grid min-w-0 grid-cols-3 gap-3">
                  <Metric label="Shares" value={formatShares(h.shares)} />
                  <Metric label="Avg" value={`$${h.avgCost.toFixed(2)}`} />
                  <Metric
                    label="Price"
                    value={`$${h.currentPrice.toFixed(2)}`}
                    className="text-slate-100"
                  />
                </div>

                <div className="grid min-w-0 grid-cols-3 gap-3">
                  <Metric
                    label="RSI"
                    value={formatOptionalNumber(h.rsi14, 1)}
                    className={getRsiColor(h.rsi14)}
                  />
                  <Metric
                    label="P/E"
                    value={formatPeRatio(
                      h.peRatio ?? h.forwardPeRatio,
                      h.netIncomeTtm,
                      h.category
                    )}
                  />
                  <Metric label="P/S" value={formatMultiple(h.priceToSalesRatio)} />
                </div>
              </div>

              <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(135px,auto)] sm:items-center">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#141d2e]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(realAlloc, 100)}%`,
                        background: color,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right text-[11px] text-slate-500">
                    {realAlloc.toFixed(1)}%
                  </span>
                </div>

                <div className={clsx("flex items-center justify-end gap-1 text-[12px]", getPnLColor(pnl))}>
                  {pnl > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : pnl < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span>{formatPercent(pnlPercent)}</span>
                  <span className="text-[10px] opacity-80">
                    {pnl >= 0 ? "+" : ""}
                    {formatCurrency(pnlThb, "THB")}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
