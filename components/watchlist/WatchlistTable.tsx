"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";
import Badge from "@/components/ui/Badge";
import { useApp } from "@/lib/context";
import {
  calculateBuyZoneScore,
  formatCompactCurrency,
  formatMultiple,
  formatOptionalNumber,
  formatPeRatio,
  formatPercent,
  getActionAmountLabel,
  getRecommendationColor,
  getRsiColor,
  getStatusColor,
} from "@/lib/utils";

interface WatchlistTableProps {
  onSelectStock?: (symbol: string) => void;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function getScoreBarColor(score: number) {
  if (score >= 80) return "bg-emerald-400";
  if (score >= 60) return "bg-blue-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-red-400";
}

export default function WatchlistTable({ onSelectStock }: WatchlistTableProps) {
  const { portfolio, watchlist, totalPortfolioValue } = useApp();
  const [sortKey, setSortKey] = useState<string>("symbol");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((direction) => (direction === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function getScore(symbol: string) {
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
  }

  const sorted = [...watchlist].sort((a, b) => {
    if (sortKey === "symbol") return a.symbol.localeCompare(b.symbol) * sortDir;
    if (sortKey === "price")
      return (a.currentPrice - b.currentPrice) * sortDir;
    if (sortKey === "change")
      return (a.changePercent - b.changePercent) * sortDir;
    if (sortKey === "rsi")
      return ((a.rsi14 ?? -1) - (b.rsi14 ?? -1)) * sortDir;
    if (sortKey === "pe")
      return ((a.peRatio ?? -1) - (b.peRatio ?? -1)) * sortDir;
    if (sortKey === "marketCap")
      return ((a.marketCap ?? -1) - (b.marketCap ?? -1)) * sortDir;
    if (sortKey === "score")
      return (getScore(a.symbol) - getScore(b.symbol)) * sortDir;
    return 0;
  });

  const SortIcon = ({ column }: { column: string }) =>
    sortKey === column ? (
      sortDir === 1 ? (
        <ChevronUp className="ml-0.5 inline h-3 w-3" />
      ) : (
        <ChevronDown className="ml-0.5 inline h-3 w-3" />
      )
    ) : null;

  const sortableColumns = [
    { key: "symbol", label: "Symbol" },
    { key: "price", label: "Price" },
    { key: "change", label: "Change" },
    { key: "rsi", label: "RSI" },
    { key: "pe", label: "Valuation" },
    { key: "marketCap", label: "Mkt Cap" },
    { key: "score", label: "Buy Score" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1e2d45] bg-[#0d1220] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-1 border-b border-[#1e2d45] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-100">
            Watchlist overview
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            เปรียบเทียบราคา มูลค่า และจังหวะซื้อในมุมมองเดียว
          </p>
        </div>
        <p className="text-[10px] text-slate-600">
          คลิกที่แถวเพื่อดูรายละเอียดเชิงลึก
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-[12px]">
          <thead>
            <tr className="border-b border-[#1e2d45] bg-[#0a0f1b] text-[10px] uppercase tracking-[0.14em] text-slate-500">
              {sortableColumns.map(({ key, label }) => (
                <th
                  key={key}
                  className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left font-medium transition-colors hover:text-slate-300"
                  onClick={() => toggleSort(key)}
                >
                  {label}
                  <SortIcon column={key} />
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                Price Levels
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                Signal
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium">
                Action
              </th>
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
                  className="table-row-hover group cursor-pointer border-t border-[#162035]"
                  onClick={() => onSelectStock?.(stock.symbol)}
                >
                  <td className="min-w-[150px] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/10 bg-blue-400/[0.06] font-numeric text-[11px] font-semibold text-blue-300">
                        {stock.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-numeric font-semibold text-slate-100">
                            {stock.symbol}
                          </p>
                          <ArrowUpRight className="h-3 w-3 text-slate-700 transition-colors group-hover:text-blue-400" />
                        </div>
                        <p
                          className="max-w-[115px] truncate text-[10px] text-slate-500"
                          title={stock.companyName}
                        >
                          {stock.companyName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-numeric font-medium text-slate-100">
                    ${stock.currentPrice.toFixed(2)}
                  </td>
                  <td
                    className={clsx(
                      "whitespace-nowrap px-4 py-4 font-numeric font-medium",
                      stock.changePercent >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    )}
                  >
                    {formatPercent(stock.changePercent)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "w-8 font-numeric font-medium",
                          getRsiColor(stock.rsi14)
                        )}
                      >
                        {formatOptionalNumber(stock.rsi14, 1)}
                      </span>
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-[#182235]">
                        <div
                          className={clsx(
                            "h-full rounded-full",
                            (stock.rsi14 ?? 0) > 70
                              ? "bg-red-400"
                              : (stock.rsi14 ?? 0) >= 55
                                ? "bg-emerald-400"
                                : "bg-amber-400"
                          )}
                          style={{ width: `${Math.min(stock.rsi14 ?? 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="min-w-[130px] px-4 py-4">
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                          P/E
                        </p>
                        <p className="mt-0.5 font-numeric text-slate-300">
                          {formatPeRatio(
                            stock.peRatio ?? stock.forwardPeRatio,
                            stock.netIncomeTtm,
                            stock.category
                          )}
                        </p>
                      </div>
                      <div className="h-7 w-px bg-[#1e2d45]" />
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-600">
                          P/S
                        </p>
                        <p className="mt-0.5 font-numeric text-slate-300">
                          {formatMultiple(stock.priceToSalesRatio)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-numeric text-slate-300">
                    {formatCompactCurrency(stock.marketCap)}
                  </td>
                  <td className="min-w-[125px] px-4 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={clsx(
                          "font-numeric text-[13px] font-semibold",
                          getScoreColor(buyScore)
                        )}
                      >
                        {buyScore}
                      </span>
                      <span className="whitespace-nowrap text-[10px] font-medium text-slate-400">
                        {buyScoreLabel}
                      </span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#182235]">
                      <div
                        className={clsx(
                          "h-full rounded-full",
                          getScoreBarColor(buyScore)
                        )}
                        style={{ width: `${buyScore}%` }}
                      />
                    </div>
                  </td>
                  <td className="min-w-[230px] px-4 py-4">
                    <div className="space-y-1.5 font-numeric text-[10px]">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="w-7 text-[9px] uppercase tracking-wider text-emerald-500/70">
                          SUP
                        </span>
                        <span className="text-emerald-400/80">
                          {stock.levels.support
                            .map((level) => `$${level}`)
                            .join("  ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="w-7 text-[9px] uppercase tracking-wider text-red-500/70">
                          RES
                        </span>
                        <span className="text-red-400/80">
                          {stock.levels.resistance
                            .map((level) => `$${level}`)
                            .join("  ")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="min-w-[155px] px-4 py-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <Badge
                        className={clsx(
                          "text-[10px]",
                          getStatusColor(stock.status)
                        )}
                      >
                        {stock.status}
                      </Badge>
                      <span
                        className={clsx(
                          "whitespace-nowrap text-[11px] font-medium",
                          getRecommendationColor(stock.recommendation)
                        )}
                      >
                        {stock.recommendation}
                      </span>
                    </div>
                  </td>
                  <td className="min-w-[120px] px-4 py-4">
                    <p className="whitespace-nowrap font-numeric text-[11px] font-medium text-slate-300">
                      {actionAmount}
                    </p>
                    <p className="mt-1 whitespace-nowrap text-[9px] uppercase tracking-wider text-slate-600">
                      Suggested range
                    </p>
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
