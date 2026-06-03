"use client";

import { useMemo, useState } from "react";
import {
  Calculator,
  CircleDollarSign,
  Info,
  ShieldCheck,
  Target,
  WalletCards,
} from "lucide-react";
import { clsx } from "clsx";
import Badge from "@/components/ui/Badge";
import { useApp } from "@/lib/context";
import {
  calculateDCAAllocations,
  getRiskColor,
  getStatusColor,
} from "@/lib/utils";

function roundPrice(value: number) {
  return Number(value.toFixed(2));
}

export default function DCAPlanner() {
  const { portfolio, watchlist, totalPortfolioValue } = useApp();
  const [budget, setBudget] = useState("4000");
  const budgetNum = Math.max(0, parseFloat(budget) || 0);

  const activeHoldings = useMemo(
    () => portfolio.holdings.filter((holding) => holding.shares > 0),
    [portfolio.holdings]
  );

  const plannerStocks = useMemo(
    () =>
      activeHoldings.map((holding) => {
        const stock = watchlist.find((item) => item.symbol === holding.symbol);
        if (stock) return stock;

        const price = holding.currentPrice;
        return {
          symbol: holding.symbol,
          currentPrice: price,
          levels: {
            support: [
              roundPrice(price * 0.98),
              roundPrice(price * 0.95),
              roundPrice(price * 0.9),
            ] as [number, number, number],
            resistance: [
              roundPrice(price * 1.03),
              roundPrice(price * 1.06),
              roundPrice(price * 1.1),
            ] as [number, number, number],
          },
          status: "รอดู" as const,
          category: holding.category,
          rsi14: holding.rsi14,
          peRatio: holding.peRatio,
          priceToSalesRatio: holding.priceToSalesRatio,
          netIncomeTtm: holding.netIncomeTtm,
        };
      }),
    [activeHoldings, watchlist]
  );

  const recommendations = useMemo(
    () =>
      calculateDCAAllocations(
        budgetNum,
        activeHoldings,
        plannerStocks,
        totalPortfolioValue
      ),
    [activeHoldings, budgetNum, plannerStocks, totalPortfolioValue]
  );

  const totalPlanned = recommendations.reduce(
    (sum, recommendation) => sum + recommendation.plannedBudget,
    0
  );
  const buyNow = recommendations.reduce(
    (sum, recommendation) => sum + recommendation.recommendedBudget,
    0
  );
  const minimumCashReserve = Math.max(0, budgetNum - totalPlanned);
  const cashAfterThisRound = Math.max(0, budgetNum - buyNow);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-[#1e2d45] bg-[#0d1220] shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-400" />
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                งบ DCA ต่อรอบ
              </h2>
            </div>
            <div className="relative max-w-xl">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-slate-500">
                ฿
              </span>
              <input
                type="number"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="font-numeric w-full rounded-xl border border-[#263752] bg-[#121a2a] py-3.5 pl-9 pr-4 text-[18px] font-semibold text-slate-100 outline-none transition-colors focus:border-blue-500/60"
                placeholder="4000"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              วางแผนเฉพาะหุ้นที่ถืออยู่ใน Dashboard และไม่จำเป็นต้องใช้เงินหมดทุกรอบ
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[2000, 4000, 5000, 10000].map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setBudget(value.toString())}
                className={clsx(
                  "font-numeric rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors",
                  budget === value.toString()
                    ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                    : "border-[#1e2d45] text-slate-500 hover:border-blue-500/30 hover:text-slate-300"
                )}
              >
                ฿{value.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid border-t border-[#1e2d45] sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "งบทั้งหมด",
              value: budgetNum,
              icon: WalletCards,
              color: "text-slate-200",
            },
            {
              label: "งบวางแผนสูงสุด",
              value: totalPlanned,
              icon: Target,
              color: "text-blue-400",
            },
            {
              label: "ซื้อรอบนี้",
              value: buyNow,
              icon: CircleDollarSign,
              color: "text-emerald-400",
            },
            {
              label: "เงินสดหลังรอบนี้",
              value: cashAfterThisRound,
              icon: ShieldCheck,
              color: "text-amber-400",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="border-[#1e2d45] px-5 py-4 sm:border-r last:border-r-0"
            >
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <p className={clsx("font-numeric mt-2 text-[17px] font-semibold", color)}>
                ฿{value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#1e2d45] bg-[#0d1220] shadow-[0_18px_60px_rgba(0,0,0,0.14)]">
        <div className="flex flex-col gap-2 border-b border-[#1e2d45] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-slate-100">
              แผนเติมหุ้นที่ถืออยู่
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {activeHoldings.length} หุ้นในพอร์ต · เงินสดขั้นต่ำที่กันไว้ ฿
              {minimumCashReserve.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <Info className="h-3.5 w-3.5" />
            หุ้นที่ยังไม่ถึงโซนซื้อจะคงงบไว้เป็นเงินสด
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-[12px]">
            <thead>
              <tr className="border-b border-[#1e2d45] bg-[#0a0f1b] text-[10px] uppercase tracking-[0.14em] text-slate-500">
                <th className="px-5 py-3 text-left font-medium">หุ้น / บทบาท</th>
                <th className="px-4 py-3 text-left font-medium">สัดส่วนพอร์ต</th>
                <th className="px-4 py-3 text-left font-medium">เงื่อนไขซื้อ</th>
                <th className="px-4 py-3 text-left font-medium">สถานะ</th>
                <th className="px-4 py-3 text-right font-medium">งบต่อรอบ</th>
                <th className="px-5 py-3 text-right font-medium">ซื้อรอบนี้</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((recommendation) => {
                const stock = plannerStocks.find(
                  (item) => item.symbol === recommendation.symbol
                );
                const allocationProgress = Math.min(
                  100,
                  (recommendation.allocationPercent /
                    recommendation.targetAllocationPercent) *
                    100
                );

                return (
                  <tr
                    key={recommendation.symbol}
                    className="table-row-hover border-t border-[#162035]"
                  >
                    <td className="min-w-[180px] px-5 py-4">
                      <p className="font-numeric font-semibold text-slate-100">
                        {recommendation.symbol}
                      </p>
                      <p className="mt-1 text-[10px] font-medium text-blue-400/80">
                        {recommendation.strategicRole}
                      </p>
                      <p className="font-numeric mt-1 text-[10px] text-slate-600">
                        ${stock?.currentPrice.toFixed(2) ?? "N/A"}
                      </p>
                    </td>
                    <td className="min-w-[150px] px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-numeric text-slate-300">
                          {recommendation.allocationPercent.toFixed(1)}%
                        </span>
                        <span className="font-numeric text-[10px] text-slate-600">
                          เป้า {recommendation.targetAllocationPercent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#182235]">
                        <div
                          className={clsx(
                            "h-full rounded-full",
                            recommendation.allocationPercent >
                              recommendation.targetAllocationPercent
                              ? "bg-amber-400"
                              : "bg-blue-400"
                          )}
                          style={{ width: `${allocationProgress}%` }}
                        />
                      </div>
                    </td>
                    <td className="min-w-[300px] px-4 py-4">
                      <p className="text-[11px] text-slate-300">
                        {recommendation.condition}
                      </p>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">
                        {recommendation.reason}
                      </p>
                    </td>
                    <td className="min-w-[130px] px-4 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge
                          className={clsx(
                            "text-[10px]",
                            getStatusColor(recommendation.status)
                          )}
                        >
                          {recommendation.status}
                        </Badge>
                        <span
                          className={clsx(
                            "whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-medium",
                            recommendation.isReady
                              ? "bg-emerald-400/10 text-emerald-400"
                              : "bg-slate-400/10 text-slate-500"
                          )}
                        >
                          {recommendation.isReady ? "เข้าโซนซื้อ" : "ยังไม่ซื้อ"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-numeric font-semibold text-slate-300">
                        ฿{recommendation.plannedBudget.toLocaleString()}
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">
                        Maximum
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {recommendation.recommendedBudget > 0 ? (
                        <>
                          <p className="font-numeric text-[13px] font-semibold text-emerald-400">
                            ฿{recommendation.recommendedBudget.toLocaleString()}
                          </p>
                          <p
                            className={clsx(
                              "mt-1 text-[10px] font-medium",
                              getRiskColor(recommendation.risk)
                            )}
                          >
                            ความเสี่ยง{recommendation.risk}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[11px] font-medium text-slate-500">
                            เก็บเป็นเงินสด
                          </p>
                          <p className="mt-1 text-[10px] text-slate-700">
                            รอจังหวะ
                          </p>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {recommendations.length === 0 && (
          <div className="px-5 py-10 text-center text-[12px] text-slate-500">
            ยังไม่มีหุ้นที่ถืออยู่ใน Dashboard
          </div>
        )}
      </section>

      <p className="px-4 text-center text-[10px] leading-relaxed text-slate-600">
        แผนนี้ใช้แนวรับ สัดส่วนพอร์ต และบทบาทของหุ้นเพื่อช่วยจัดระเบียบการ DCA
        ไม่ใช่คำแนะนำการลงทุน
      </p>
    </div>
  );
}
