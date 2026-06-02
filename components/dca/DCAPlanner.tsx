"use client";
import { useState, useMemo } from "react";
import { useApp } from "@/lib/context";
import {
  calculateDCAAllocations,
  getRiskColor,
  getStatusColor,
  getBuyScoreColor,
} from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { clsx } from "clsx";
import { Calculator, Info } from "lucide-react";

export default function DCAPlanner() {
  const { portfolio, watchlist, totalPortfolioValue } = useApp();
  const [budget, setBudget] = useState("2000");

  const budgetNum = parseFloat(budget) || 0;

  const recommendations = useMemo(() => {
    return calculateDCAAllocations(
      budgetNum,
      portfolio.holdings,
      watchlist.map((w) => ({
        symbol: w.symbol,
        currentPrice: w.currentPrice,
        levels: w.levels,
        status: w.status,
        category: w.category,
        rsi14: w.rsi14,
      })),
      totalPortfolioValue
    );
  }, [budgetNum, portfolio.holdings, watchlist, totalPortfolioValue]);

  const totalAllocated = recommendations.reduce(
    (s, r) => s + r.recommendedBudget,
    0
  );
  const unallocated = budgetNum - totalAllocated;

  return (
    <div className="space-y-4">
      {/* Budget input */}
      <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-slate-500" />
          <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
            งบลงทุนวันนี้
          </h3>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[13px]">
                ฿
              </span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg pl-7 pr-3 py-3 text-[14px] font-semibold text-slate-100 outline-none focus:border-blue-500/50"
                placeholder="2000"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {[500, 1000, 2000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setBudget(v.toString())}
                className={clsx(
                  "px-3 py-2 rounded-lg text-[11px] font-medium border transition-colors",
                  budget === v.toString()
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "border-[#1e2d45] text-slate-500 hover:text-slate-300"
                )}
              >
                {v >= 1000 ? `${v / 1000}K` : v}
              </button>
            ))}
          </div>
        </div>

        {/* Budget summary */}
        <div className="flex gap-4 mt-3 text-[11px]">
          <div>
            <span className="text-slate-600">งบทั้งหมด</span>
            <span className="text-slate-300 ml-2 font-medium">
              ฿{budgetNum.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-600">จัดสรรแล้ว</span>
            <span className="text-emerald-400 ml-2 font-medium">
              ฿{totalAllocated.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-600">คงเหลือ</span>
            <span
              className={clsx(
                "ml-2 font-medium",
                unallocated >= 0 ? "text-slate-400" : "text-red-400"
              )}
            >
              ฿{unallocated.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations table */}
      <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e2d45] flex items-center justify-between">
          <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
            คำแนะนำการจัดสรรงบ
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-600">
            <Info className="w-3 h-3" />
            ไม่ใช่คำแนะนำการลงทุน
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-slate-600 text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-2.5">Symbol</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-left px-3 py-2.5">Buy Score</th>
                <th className="text-right px-3 py-2.5">Action Amount</th>
                <th className="text-right px-3 py-2.5">งบแนะนำ</th>
                <th className="text-right px-3 py-2.5">ราคาเป้า</th>
                <th className="text-left px-3 py-2.5">เหตุผล</th>
                <th className="text-left px-4 py-2.5">ความเสี่ยง</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec) => {
                const stock = watchlist.find((w) => w.symbol === rec.symbol);
                return (
                  <tr
                    key={rec.symbol}
                    className="table-row-hover border-t border-[#162035]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-200">
                        {rec.symbol}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        ${stock?.currentPrice.toFixed(2) ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        className={clsx(
                          "text-[10px]",
                          getStatusColor(rec.status)
                        )}
                      >
                        {rec.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={clsx(
                          "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                          getBuyScoreColor(rec.buyScore)
                        )}
                      >
                        {rec.buyScore} · {rec.buyScoreLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-300 font-medium">
                      {rec.actionAmountLabel}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {rec.recommendedBudget > 0 ? (
                        <div>
                          <p className="text-slate-200 font-semibold">
                            ฿{rec.recommendedBudget.toLocaleString()}
                          </p>
                          <div className="w-full bg-[#141d2e] rounded-full h-1 mt-1">
                            <div
                              className="h-full rounded-full bg-blue-500/60"
                              style={{
                                width: `${
                                  budgetNum > 0
                                    ? (rec.recommendedBudget / budgetNum) * 100
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-400">
                      ${rec.targetPrice.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-slate-500 max-w-[160px]">
                      {rec.reason}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "text-[11px] px-2 py-0.5 rounded-md font-medium",
                          getRiskColor(rec.risk)
                        )}
                      >
                        {rec.risk}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-600 text-center leading-relaxed px-4">
        ⚠️ คำแนะนำข้างต้นเป็นเพียงการวิเคราะห์เชิงระบบจากแนวรับแนวต้านและสัดส่วนพอร์ต
        ไม่ใช่คำแนะนำการลงทุน ผู้ลงทุนควรตัดสินใจด้วยตนเอง
      </p>
    </div>
  );
}
