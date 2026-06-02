"use client";
import { clsx } from "clsx";
import { AlertTriangle, RefreshCw, Radio } from "lucide-react";
import { useApp } from "@/lib/context";

function formatUpdatedAt(value?: string) {
  if (!value) return "รอ sync";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MarketSyncStatus() {
  const { marketStatus, refreshMarketData } = useApp();
  const hasError = Boolean(marketStatus.error);
  const refreshSeconds = marketStatus.refreshIntervalMs
    ? Math.round(marketStatus.refreshIntervalMs / 1000)
    : null;

  return (
    <div className="flex items-center gap-2 text-[10px] text-slate-500">
      <div
        className={clsx(
          "hidden sm:flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5",
          hasError
            ? "border-amber-500/30 text-amber-400 bg-amber-500/5"
            : "border-[#1e2d45] bg-[#0d1220]"
        )}
        title={marketStatus.error}
      >
        {hasError ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          <Radio className="w-3 h-3 text-emerald-400" />
        )}
        <span className="whitespace-nowrap">
          {marketStatus.source ?? "Market data"} ·{" "}
          {formatUpdatedAt(marketStatus.updatedAt)}
          {refreshSeconds ? ` · auto ${refreshSeconds}s` : ""}
        </span>
      </div>
      <button
        type="button"
        onClick={refreshMarketData}
        disabled={marketStatus.isLoading}
        className="w-8 h-8 rounded-lg border border-[#1e2d45] bg-[#0d1220] flex items-center justify-center text-slate-500 hover:text-slate-200 hover:border-blue-500/40 disabled:opacity-60 transition-colors"
        aria-label="Refresh market data"
        title="Refresh market data"
      >
        <RefreshCw
          className={clsx("w-3.5 h-3.5", marketStatus.isLoading && "animate-spin")}
        />
      </button>
    </div>
  );
}
