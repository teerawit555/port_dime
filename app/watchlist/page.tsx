"use client";

import { useState } from "react";
import { Activity, Eye, Pencil, TrendingDown, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import AppShell from "@/components/layout/AppShell";
import StockDetailModal from "@/components/dashboard/StockDetailModal";
import MarketSyncStatus from "@/components/market/MarketSyncStatus";
import Badge from "@/components/ui/Badge";
import EditWatchlistModal from "@/components/watchlist/EditWatchlistModal";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import { useApp } from "@/lib/context";
import { getStatusColor } from "@/lib/utils";

export default function WatchlistPage() {
  const { watchlist } = useApp();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [editSymbol, setEditSymbol] = useState<string | null>(null);

  const editStock = watchlist.find((stock) => stock.symbol === editSymbol);
  const gainers = watchlist.filter((stock) => stock.changePercent >= 0).length;
  const decliners = watchlist.length - gainers;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-5 lg:px-7 lg:py-7">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-blue-400/70">
              <Eye className="h-3.5 w-3.5" />
              Market Opportunities
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-100">
              Watchlist
            </h1>
            <p className="mt-1 text-[12px] text-slate-500">
              ติดตามหุ้นที่สนใจ พร้อมข้อมูลมูลค่าและจังหวะเข้าซื้อ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-3 rounded-xl border border-[#1e2d45] bg-[#0d1220] px-3 py-2 text-[10px]">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                {gainers} บวก
              </span>
              <span className="h-3 w-px bg-[#1e2d45]" />
              <span className="flex items-center gap-1.5 text-red-400">
                <TrendingDown className="h-3 w-3" />
                {decliners} ลบ
              </span>
            </div>
            <MarketSyncStatus />
          </div>
        </section>

        <section className="rounded-2xl border border-[#1e2d45] bg-[#0b101c]/80 p-3 shadow-[0_14px_50px_rgba(0,0,0,0.12)]">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-blue-400" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Market Pulse
              </h2>
            </div>
            <span className="text-[10px] text-slate-600">
              {watchlist.length} symbols
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {watchlist.map((stock) => (
              <div
                key={stock.symbol}
                role="button"
                tabIndex={0}
                className="group min-w-[168px] cursor-pointer rounded-xl border border-[#1a2840] bg-[#0d1220] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-blue-500/30 hover:bg-[#101827]"
                onClick={() => setSelectedSymbol(stock.symbol)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedSymbol(stock.symbol);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-numeric text-[12px] font-semibold text-slate-200">
                      {stock.symbol}
                    </p>
                    <p className="mt-0.5 max-w-[105px] truncate text-[9px] text-slate-600">
                      {stock.companyName}
                    </p>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Edit ${stock.symbol}`}
                    className="rounded-md p-1 text-slate-700 transition-colors hover:bg-white/[0.03] hover:text-slate-400"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditSymbol(stock.symbol);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        setEditSymbol(stock.symbol);
                      }
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between gap-2">
                  <div>
                    <p className="font-numeric text-[13px] font-semibold text-slate-100">
                      ${stock.currentPrice.toFixed(2)}
                    </p>
                    <p
                      className={clsx(
                        "mt-0.5 font-numeric text-[10px]",
                        stock.changePercent >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      )}
                    >
                      {stock.changePercent >= 0 ? "+" : ""}
                      {stock.changePercent.toFixed(2)}%
                    </p>
                  </div>
                  <Badge
                    className={clsx(
                      "max-w-[78px] overflow-hidden text-ellipsis text-[9px]",
                      getStatusColor(stock.status)
                    )}
                  >
                    {stock.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>

        <WatchlistTable onSelectStock={setSelectedSymbol} />
      </div>

      {selectedSymbol && (
        <StockDetailModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
        />
      )}

      {editSymbol && editStock && (
        <EditWatchlistModal
          stock={editStock}
          onClose={() => setEditSymbol(null)}
        />
      )}
    </AppShell>
  );
}
