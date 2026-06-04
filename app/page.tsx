"use client";
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatCard from "@/components/ui/StatCard";
import AllocationChart from "@/components/dashboard/AllocationChart";
import HoldingsTable from "@/components/dashboard/HoldingsTable";
import DailyInvestmentInput from "@/components/dashboard/DailyInvestmentInput";
import StockDetailModal from "@/components/dashboard/StockDetailModal";
import IntradayChart from "@/components/dashboard/IntradayChart";
import MarketSyncStatus from "@/components/market/MarketSyncStatus";
import { useApp } from "@/lib/context";
import {
  calcPortfolioMetrics,
  DEFAULT_USD_THB_RATE,
  formatCurrency,
  formatPercent,
  getPnLColor,
} from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  BarChart2,
} from "lucide-react";

export default function DashboardPage() {
  const { portfolio } = useApp();
  const { totalValue, totalCost, totalPnL, totalPnLPercent } =
    calcPortfolioMetrics(portfolio.holdings);
  const totalValueThb = totalValue * DEFAULT_USD_THB_RATE;
  const totalCostThb = totalCost * DEFAULT_USD_THB_RATE;
  const totalPnLThb = totalPnL * DEFAULT_USD_THB_RATE;
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="px-4 lg:px-6 py-5 space-y-5 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-semibold text-slate-100">
              TT Portfolio Overview
            </h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              อัพเดทล่าสุด: {new Date().toLocaleDateString("th-TH")}
            </p>
          </div>
          <MarketSyncStatus />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="มูลค่าพอร์ต"
            value={formatCurrency(totalValueThb, "THB")}
            sub={`≈ ${formatCurrency(totalValue)} · 1 USD = ฿${DEFAULT_USD_THB_RATE}`}
            icon={BarChart2}
            iconColor="text-blue-400"
            accent="blue"
          />
          <StatCard
            label="กำไร / ขาดทุน"
            value={formatPercent(totalPnLPercent)}
            sub={`${totalPnL >= 0 ? "+" : ""}${formatCurrency(totalPnLThb, "THB")} · ${formatCurrency(totalPnL)}`}
            subColor={getPnLColor(totalPnL)}
            icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
            iconColor={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}
            accent={totalPnL >= 0 ? "green" : "red"}
          />
          <StatCard
            label="ต้นทุนรวม"
            value={formatCurrency(totalCostThb, "THB")}
            sub={`≈ ${formatCurrency(totalCost)}`}
            icon={DollarSign}
            iconColor="text-slate-400"
          />
          <StatCard
            label="เงินสดเหลือ"
            value={`฿${portfolio.cashBalance.toLocaleString()}`}
            sub="Available Cash (THB)"
            icon={Wallet}
            iconColor="text-amber-400"
            accent="amber"
          />
        </div>

        <IntradayChart />

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: chart + input */}
          <div className="space-y-4">
            <AllocationChart
              holdings={portfolio.holdings}
              totalValue={totalValue}
            />
            <DailyInvestmentInput />
          </div>

          {/* Right: holdings table */}
          <div className="lg:col-span-2">
            <HoldingsTable
              holdings={portfolio.holdings}
              totalValue={totalValue}
              exchangeRate={DEFAULT_USD_THB_RATE}
              onSelectStock={setSelectedSymbol}
            />
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-slate-700 text-center">
          ⚠️ ข้อมูลนี้ใช้เพื่อการติดตามส่วนตัวเท่านั้น ไม่ใช่คำแนะนำการลงทุน
          ผู้ลงทุนควรศึกษาข้อมูลเพิ่มเติมและตัดสินใจด้วยตนเอง
        </p>
      </div>

      {selectedSymbol && (
        <StockDetailModal
          symbol={selectedSymbol}
          onClose={() => setSelectedSymbol(null)}
        />
      )}
    </AppShell>
  );
}
