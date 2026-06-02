"use client";
import AppShell from "@/components/layout/AppShell";
import InvestmentLogTable from "@/components/log/InvestmentLogTable";
import DailyInvestmentInput from "@/components/dashboard/DailyInvestmentInput";
import { useApp } from "@/lib/context";
import { formatCurrency } from "@/lib/utils";

export default function InvestmentLogPage() {
  const { investmentLog } = useApp();

  const planned = investmentLog.filter((e) => e.status === "planned").length;
  const executed = investmentLog.filter((e) => e.status === "executed").length;
  const buyTotal = investmentLog
    .filter((e) => e.status === "executed" && (e.action ?? "buy") === "buy")
    .reduce((s, e) => s + e.amount, 0);
  const sellTotal = investmentLog
    .filter((e) => e.status === "executed" && e.action === "sell")
    .reduce((s, e) => s + e.amount, 0);
  const realizedPnL = investmentLog.reduce(
    (s, e) => s + (e.realizedPnL ?? 0),
    0
  );

  return (
    <AppShell>
      <div className="px-4 lg:px-6 py-5 space-y-5 max-w-5xl mx-auto">
        <div>
          <h1 className="text-[18px] font-semibold text-slate-100">
            Investment Log
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            ประวัติการลงทุนทั้งหมด
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "ทั้งหมด", value: investmentLog.length, color: "text-slate-200" },
            { label: "Planned", value: planned, color: "text-amber-400" },
            { label: "Buy", value: formatCurrency(buyTotal, "THB"), color: "text-emerald-400" },
            { label: "Sell", value: formatCurrency(sellTotal, "THB"), color: "text-red-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-3"
            >
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                {s.label}
              </p>
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">
              Executed Transactions
            </p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              รวมรายการที่บันทึกซื้อ/ขายแล้ว {executed} รายการ
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">
              Realized P&amp;L
            </p>
            <p className={`text-lg font-semibold ${realizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {realizedPnL >= 0 ? "+" : ""}
              {formatCurrency(realizedPnL, "THB")}
            </p>
          </div>
        </div>

        <DailyInvestmentInput />
        <InvestmentLogTable />
      </div>
    </AppShell>
  );
}
