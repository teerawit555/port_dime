"use client";
import { useState } from "react";
import { useApp } from "@/lib/context";
import { InvestmentLogAction, InvestmentStatus } from "@/types";
import { clsx } from "clsx";
import { Trash2, Check, X, Clock, type LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const STATUS_CONFIG: Record<
  InvestmentStatus,
  { label: string; color: string; icon: LucideIcon }
> = {
  planned: {
    label: "Planned",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    icon: Clock,
  },
  executed: {
    label: "Executed",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    icon: Check,
  },
  skipped: {
    label: "Skipped",
    color: "text-slate-500 bg-slate-500/10 border-slate-500/30",
    icon: X,
  },
};

const ACTION_CONFIG: Record<
  InvestmentLogAction,
  { label: string; color: string }
> = {
  buy: {
    label: "BUY",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  },
  sell: {
    label: "SELL",
    color: "text-red-400 bg-red-400/10 border-red-400/30",
  },
  dividend: {
    label: "DIV",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  },
  adjustment: {
    label: "ADJ",
    color: "text-violet-400 bg-violet-400/10 border-violet-400/30",
  },
  tax: {
    label: "TAX",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  },
  fee: {
    label: "FEE",
    color: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  },
};

const ACTION_ORDER: InvestmentLogAction[] = [
  "buy",
  "sell",
  "dividend",
  "adjustment",
  "tax",
  "fee",
];

export default function InvestmentLogTable() {
  const { investmentLog, updateLogEntry, deleteLogEntry, executeLogEntry } = useApp();
  const [actionMessage, setActionMessage] = useState("");
  const [filterSymbol, setFilterSymbol] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterAction, setFilterAction] = useState<string>("ALL");

  const symbols = [
    "ALL",
    ...Array.from(new Set(investmentLog.map((e) => e.symbol))),
  ];
  const statuses = ["ALL", "planned", "executed", "skipped"];
  const presentActions = new Set(
    investmentLog.map((entry) => entry.action ?? "buy")
  );
  const actions = [
    "ALL",
    ...ACTION_ORDER.filter((action) => presentActions.has(action)),
  ];

  const filtered = investmentLog.filter((e) => {
    if (filterSymbol !== "ALL" && e.symbol !== filterSymbol) return false;
    if (filterStatus !== "ALL" && e.status !== filterStatus) return false;
    if (filterAction !== "ALL" && (e.action ?? "buy") !== filterAction)
      return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {symbols.map((s) => (
            <button
              key={s}
              onClick={() => setFilterSymbol(s)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
                filterSymbol === s
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                  : "border-[#1e2d45] text-slate-500 hover:text-slate-300"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
                filterStatus === s
                  ? "bg-slate-500/20 border-slate-500/40 text-slate-300"
                  : "border-[#1e2d45] text-slate-600 hover:text-slate-400"
              )}
            >
              {s === "ALL" ? "All status" : STATUS_CONFIG[s as InvestmentStatus].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {actions.map((s) => (
            <button
              key={s}
              onClick={() => setFilterAction(s)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors",
                filterAction === s
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "border-[#1e2d45] text-slate-600 hover:text-slate-400"
              )}
            >
              {s === "ALL"
                ? "All type"
                : ACTION_CONFIG[s as InvestmentLogAction].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-600 text-[13px]">
            ยังไม่มีรายการ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-slate-600 text-[11px] uppercase tracking-wider border-b border-[#1e2d45]">
                  <th className="text-left px-4 py-2.5">Date</th>
                  <th className="text-left px-3 py-2.5">Symbol</th>
                  <th className="text-left px-3 py-2.5">Type</th>
                  <th className="text-right px-3 py-2.5">Shares</th>
                  <th className="text-right px-3 py-2.5">งบ (THB)</th>
                  <th className="text-right px-3 py-2.5">ราคาเป้า</th>
                  <th className="text-right px-3 py-2.5">ราคาจริง</th>
                  <th className="text-left px-3 py-2.5">เหตุผล</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-right px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const cfg = STATUS_CONFIG[entry.status];
                  const action = entry.action ?? "buy";
                  const actionCfg = ACTION_CONFIG[action];
                  const canExecute =
                    entry.status === "planned" &&
                    (action === "buy" || action === "sell");
                  const StatusIcon = cfg.icon;
                  return (
                    <tr
                      key={entry.id}
                      className="table-row-hover border-t border-[#162035]"
                    >
                      <td className="px-4 py-3 text-slate-400">{entry.date}</td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-slate-200">
                          {entry.symbol}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={clsx(
                            "inline-flex px-2 py-0.5 rounded-md text-[10px] border font-medium",
                            actionCfg.color
                          )}
                        >
                          {actionCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-400">
                        {entry.shares ? entry.shares.toFixed(6) : "-"}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-300">
                        {formatCurrency(entry.amount, "THB")}
                        {entry.realizedPnL !== undefined && (
                          <div
                            className={clsx(
                              "text-[10px] mt-0.5",
                              entry.realizedPnL >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            )}
                          >
                            realized {entry.realizedPnL >= 0 ? "+" : ""}
                            {formatCurrency(entry.realizedPnL, "THB")}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-400">
                        {entry.targetPrice > 0
                          ? `$${entry.targetPrice.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-400">
                        {entry.actualPrice && entry.actualPrice > 0
                          ? `$${entry.actualPrice.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-slate-500 max-w-[120px] truncate">
                        {entry.reason}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border font-medium",
                            cfg.color
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canExecute && (
                            <>
                              <button
                                onClick={() => {
                                  const result = executeLogEntry(entry.id);
                                  setActionMessage(
                                    result.ok
                                      ? `${entry.symbol} อัปเดตเข้าพอร์ตแล้ว`
                                      : result.message ?? "บันทึกรายการไม่สำเร็จ"
                                  );
                                  window.setTimeout(
                                    () => setActionMessage(""),
                                    1800
                                  );
                                }}
                                className="w-6 h-6 rounded border border-emerald-700/40 bg-emerald-900/20 flex items-center justify-center text-emerald-500 hover:bg-emerald-900/40 transition-colors"
                                title="Execute and update portfolio"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  updateLogEntry(entry.id, {
                                    status: "skipped",
                                  })
                                }
                                className="w-6 h-6 rounded border border-slate-700/40 bg-slate-900/20 flex items-center justify-center text-slate-500 hover:bg-slate-900/40 transition-colors"
                                title="Mark skipped"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteLogEntry(entry.id)}
                            className="w-6 h-6 rounded border border-red-900/40 bg-red-900/10 flex items-center justify-center text-red-600 hover:bg-red-900/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {actionMessage && (
        <p className="text-[11px] text-emerald-400">{actionMessage}</p>
      )}
    </div>
  );
}

