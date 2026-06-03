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

export default function HoldingsTable({
  holdings,
  totalValue,
  exchangeRate = 1,
  onSelectStock,
}: HoldingsTableProps) {
  const active = holdings.filter((h) => h.shares > 0);

  return (
    <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e2d45]">
        <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
          Holdings
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-slate-600 text-[11px] uppercase tracking-wider">
              <th className="text-left px-4 py-2.5">Symbol</th>
              <th className="text-right px-3 py-2.5">Shares</th>
              <th className="text-right px-3 py-2.5">Avg Cost</th>
              <th className="text-right px-3 py-2.5">Price</th>
              <th className="text-right px-3 py-2.5">RSI</th>
              <th className="text-right px-3 py-2.5">P/E</th>
              <th className="text-right px-3 py-2.5">P/S</th>
              <th className="text-right px-3 py-2.5">Value (THB)</th>
              <th className="text-right px-3 py-2.5">P&amp;L</th>
              <th className="text-right px-4 py-2.5">Alloc</th>
            </tr>
          </thead>
          <tbody>
            {active.map((h) => {
              const { currentValue, pnl, pnlPercent } = calcHoldingMetrics(h);
              const currentValueThb = currentValue * exchangeRate;
              const pnlThb = pnl * exchangeRate;
              const realAlloc =
                totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
              const color = ALLOCATION_COLORS[h.symbol] ?? "#475569";
              return (
                <tr
                  key={h.symbol}
                  className="table-row-hover border-t border-[#162035] cursor-pointer"
                  onClick={() => onSelectStock?.(h.symbol)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-6 rounded-full"
                        style={{ background: color }}
                      />
                      <div>
                        <p className="font-semibold text-slate-200">
                          {h.symbol}
                        </p>
                        <p className="text-[10px] text-slate-600">
                          {h.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">
                    {h.shares < 1 ? h.shares.toFixed(4) : h.shares.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-400">
                    ${h.avgCost.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-200">
                    ${h.currentPrice.toFixed(2)}
                  </td>
                  <td className={clsx("px-3 py-3 text-right", getRsiColor(h.rsi14))}>
                    {formatOptionalNumber(h.rsi14, 1)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-400">
                    {formatPeRatio(
                      h.peRatio ?? h.forwardPeRatio,
                      h.netIncomeTtm,
                      h.category
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-400">
                    {formatMultiple(h.priceToSalesRatio)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-200">
                    {formatCurrency(currentValueThb, "THB")}
                    <div className="text-[10px] text-slate-600 mt-0.5">
                      ≈ {formatCurrency(currentValue)}
                    </div>
                  </td>
                  <td className={clsx("px-3 py-3 text-right", getPnLColor(pnl))}>
                    <div className="flex items-center justify-end gap-1">
                      {pnl > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : pnl < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      {formatPercent(pnlPercent)}
                    </div>
                    <div className="text-[10px] mt-0.5">
                      {pnl >= 0 ? "+" : ""}
                      {formatCurrency(pnlThb, "THB")}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 bg-[#141d2e] rounded-full h-1">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(realAlloc, 100)}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <span className="text-slate-400 w-10">
                        {realAlloc.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
