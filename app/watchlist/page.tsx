"use client";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import StockDetailModal from "@/components/dashboard/StockDetailModal";
import EditWatchlistModal from "@/components/watchlist/EditWatchlistModal";
import MarketSyncStatus from "@/components/market/MarketSyncStatus";
import { useApp } from "@/lib/context";
import { Eye, Pencil } from "lucide-react";
import { getStatusColor } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { clsx } from "clsx";

export default function WatchlistPage() {
  const { watchlist } = useApp();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [editSymbol, setEditSymbol] = useState<string | null>(null);

  const editStock = watchlist.find((w) => w.symbol === editSymbol);

  return (
    <AppShell>
      <div className="px-4 lg:px-6 py-5 space-y-5 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-semibold text-slate-100">
              Watchlist
            </h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {watchlist.length} หุ้น · คลิกแถวเพื่อดูรายละเอียด
            </p>
          </div>
          <MarketSyncStatus />
        </div>

        {/* Quick status cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {watchlist.map((stock) => (
            <div
              key={stock.symbol}
              className="rounded-lg border border-[#1e2d45] bg-[#0d1220] p-3 cursor-pointer hover:border-blue-500/30 transition-colors"
              onClick={() => setSelectedSymbol(stock.symbol)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[13px] font-semibold text-slate-200">
                  {stock.symbol}
                </p>
                <button
                  className="text-slate-600 hover:text-slate-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditSymbol(stock.symbol);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              <p
                className={clsx(
                  "text-[13px] font-medium",
                  stock.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                ${stock.currentPrice.toFixed(2)}
              </p>
              <p
                className={clsx(
                  "text-[10px] mt-0.5",
                  stock.changePercent >= 0 ? "text-emerald-500/70" : "text-red-500/70"
                )}
              >
                {stock.changePercent >= 0 ? "+" : ""}
                {stock.changePercent.toFixed(2)}%
              </p>
              <div className="mt-2">
                <Badge
                  className={clsx("text-[9px]", getStatusColor(stock.status))}
                >
                  {stock.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Full table */}
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
