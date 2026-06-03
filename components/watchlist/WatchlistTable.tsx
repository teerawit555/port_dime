"use client";
import { useState } from "react";
import { useApp } from "@/lib/context";
import {
  formatPercent,
  formatCompactCurrency,
  formatMultiple,
  formatOptionalNumber,
  formatPeRatio,
  getStatusColor,
  getRecommendationColor,
  getRsiColor,
  calculateBuyZoneScore,
  getActionAmountLabel,
  getBuyScoreColor,
} from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { clsx } from "clsx";
import { ChevronUp, ChevronDown } from "lucide-react";

interface WatchlistTableProps {
  onSelectStock?: (symbol: string) => void;
}

export default function WatchlistTable({ onSelectStock }: WatchlistTableProps) {
  const { portfolio, watchlist, totalPortfolioValue } = useApp();
  const [sortKey, setSortKey] = useState<string>("symbol");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  const sorted = [...watchlist].sort((a, b) => {
    const getScore = (symbol: string) => {
      const stock = watchlist.find((item) => item.symbol === symbol);
      if (!stock) return 0;
      const holding =
        portfolio.holdings.find((item) => item.symbol === symbol) ?? null;
      return calculateBuyZoneScore({
        status: stock.status,
        rsi14: stock.rsi14,
        holding,
        totalPortfolioValue,
        category: stock.category,
        peRatio: stock.peRatio,
        priceToSalesRatio: stock.priceToSalesRatio,
        netIncomeTtm: stock.netIncomeTtm,
      }).buyScore;
    };

    if (sortKey === "symbol") return a.symbol.localeCompare(b.symbol) * sortDir;
    if (sortKey === "price")
      return (a.currentPrice - b.currentPrice) * sortDir;
    if (sortKey === "change")
      return (a.changePercent - b.changePercent) * sortDir;
    if (sortKey === "rsi")
      return ((a.rsi14 ?? -1) - (b.rsi14 ?? -1)) * sortDir;
    if (sortKey === "pe")
      return ((a.peRatio ?? -1) - (b.peRatio ?? -1)) * sortDir;
    if (sortKey === "ps")
      return ((a.priceToSalesRatio ?? -1) - (b.priceToSalesRatio ?? -1)) * sortDir;
    if (sortKey === "marketCap")
      return ((a.marketCap ?? -1) - (b.marketCap ?? -1)) * sortDir;
    if (sortKey === "score")
      return (getScore(a.symbol) - getScore(b.symbol)) * sortDir;
    return 0;
  });

  const SortIcon = ({ col }: { col: string }) =>
    sortKey === col ? (
      sortDir === 1 ? (
        <ChevronUp className="w-3 h-3 inline" />
      ) : (
        <ChevronDown className="w-3 h-3 inline" />
      )
    ) : null;

  return (
    <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-slate-600 text-[11px] uppercase tracking-wider border-b border-[#1e2d45]">
              {[
                { key: "symbol", label: "Symbol" },
                { key: "price", label: "Price" },
                { key: "change", label: "Change" },
                { key: "rsi", label: "RSI" },
                { key: "pe", label: "P/E" },
                { key: "ps", label: "P/S" },
                { key: "marketCap", label: "Mkt Cap" },
                { key: "score", label: "Score" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className="text-left px-4 py-2.5 cursor-pointer hover:text-slate-400 select-none"
                  onClick={() => toggleSort(key)}
                >
                  {label} <SortIcon col={key} />
                </th>
              ))}
              <th className="text-left px-3 py-2.5">Support</th>
              <th className="text-left px-3 py-2.5">Resistance</th>
              <th className="text-left px-3 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Recommend</th>
              <th className="text-left px-4 py-2.5">Action Amount</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((stock) => {
              const holding =
                portfolio.holdings.find((item) => item.symbol === stock.symbol) ??
                null;
              const { buyScore, buyScoreLabel } = calculateBuyZoneScore({
                status: stock.status,
                rsi14: stock.rsi14,
                holding,
                totalPortfolioValue,
                category: stock.category,
                peRatio: stock.peRatio,
                priceToSalesRatio: stock.priceToSalesRatio,
                netIncomeTtm: stock.netIncomeTtm,
              });
              const actionAmount = getActionAmountLabel({
                buyScore,
                category: stock.category,
                recommendation: stock.recommendation,
              });

              return (
              <tr
                key={stock.symbol}
                className="table-row-hover border-t border-[#162035] cursor-pointer"
                onClick={() => onSelectStock?.(stock.symbol)}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-200">{stock.symbol}</p>
                  <p className="text-[10px] text-slate-600">
                    {stock.companyName.slice(0, 20)}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-200 font-medium">
                  ${stock.currentPrice.toFixed(2)}
                </td>
                <td
                  className={clsx(
                    "px-4 py-3 font-medium",
                    stock.changePercent >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  )}
                >
                  {formatPercent(stock.changePercent)}
                </td>
                <td className={clsx("px-4 py-3 font-medium", getRsiColor(stock.rsi14))}>
                  {formatOptionalNumber(stock.rsi14, 1)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatPeRatio(
                    stock.peRatio ?? stock.forwardPeRatio,
                    stock.netIncomeTtm,
                    stock.category
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatMultiple(stock.priceToSalesRatio)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatCompactCurrency(stock.marketCap)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                      getBuyScoreColor(buyScore)
                    )}
                  >
                    {buyScore} · {buyScoreLabel}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 text-emerald-400/70 text-[11px]">
                    {stock.levels.support.map((s, i) => (
                      <span key={i} className="text-emerald-500/70">
                        ${s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 text-red-400/70 text-[11px]">
                    {stock.levels.resistance.map((r, i) => (
                      <span key={i} className="text-red-500/70">
                        ${r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Badge
                    className={clsx(
                      "text-[10px]",
                      getStatusColor(stock.status)
                    )}
                  >
                    {stock.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "text-[11px] font-medium",
                      getRecommendationColor(stock.recommendation)
                    )}
                  >
                    {stock.recommendation}
                  </span>
                </td>
                <td className="px-4 py-3 text-[11px] font-medium text-slate-300">
                  {actionAmount}
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
