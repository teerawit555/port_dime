"use client";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { ALLOCATION_COLORS } from "@/data/mockData";
import { PortfolioHolding } from "@/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { clsx } from "clsx";

interface AllocationChartProps {
  holdings: PortfolioHolding[];
  totalValue: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#0d1220] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px]">
      <p className="font-semibold text-slate-200">{d.symbol}</p>
      <p className="text-slate-400">{formatCurrency(d.value)}</p>
      <p className="text-slate-400">{d.pct.toFixed(1)}%</p>
    </div>
  );
};

export default function AllocationChart({
  holdings,
  totalValue,
}: AllocationChartProps) {
  const data = holdings
    .filter((h) => h.shares > 0)
    .map((h) => ({
      symbol: h.symbol,
      value: h.shares * h.currentPrice,
      pct: totalValue > 0 ? (h.shares * h.currentPrice / totalValue) * 100 : 0,
    }));

  return (
    <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4">
      <h3 className="text-[12px] uppercase tracking-wider text-slate-500 mb-4">
        Portfolio Allocation
      </h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-[140px] h-[140px] flex-shrink-0">
          <PieChart width={140} height={140}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.symbol}
                  fill={ALLOCATION_COLORS[entry.symbol] ?? "#475569"}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </div>
        <div className="flex-1 w-full space-y-1.5">
          {data.map((d) => (
            <div key={d.symbol} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{
                  background: ALLOCATION_COLORS[d.symbol] ?? "#475569",
                }}
              />
              <span className="text-[12px] text-slate-400 w-12">{d.symbol}</span>
              <div className="flex-1 bg-[#141d2e] rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${d.pct}%`,
                    background: ALLOCATION_COLORS[d.symbol] ?? "#475569",
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-500 w-10 text-right">
                {d.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
