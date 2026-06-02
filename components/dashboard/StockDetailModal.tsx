"use client";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { X, Plus, Minus } from "lucide-react";
import { mockPriceHistory } from "@/data/mockData";
import { useApp } from "@/lib/context";
import {
  DEFAULT_USD_THB_RATE,
  formatCurrency,
  formatPercent,
  formatCompactNumber,
  formatOptionalNumber,
  calcHoldingMetrics,
  getPnLColor,
  getRsiColor,
  getStockStatus,
  getStatusColor,
} from "@/lib/utils";
import { clsx } from "clsx";

interface StockDetailModalProps {
  symbol: string;
  onClose: () => void;
}

type ChartTooltipPayload = {
  value?: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1220] border border-[#1e2d45] rounded-lg px-2.5 py-2 text-[11px]">
      <p className="text-slate-400">{label}</p>
      <p className="text-slate-200 font-medium">
        ${payload[0]?.value?.toFixed(2)}
      </p>
    </div>
  );
};

export default function StockDetailModal({
  symbol,
  onClose,
}: StockDetailModalProps) {
  const { portfolio, watchlist, executeTrade } = useApp();
  const [note, setNote] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [reason, setReason] = useState("DCA ปกติ");
  const [tradeMessage, setTradeMessage] = useState("");

  const stock = watchlist.find((s) => s.symbol === symbol);
  const holding = portfolio.holdings.find((h) => h.symbol === symbol);
  const priceHistory = stock?.priceHistory ?? mockPriceHistory[symbol] ?? [];

  if (!stock) return null;

  const { pnl, pnlPercent } = holding
    ? calcHoldingMetrics(holding)
    : { pnl: 0, pnlPercent: 0 };

  const status = getStockStatus(stock.currentPrice, stock.levels);
  const statusStyle = getStatusColor(status);

  const chartData = priceHistory.slice(-30).map((p) => ({
    date: p.date.slice(5),
    price: p.price,
  }));

  const minPrice = Math.min(...chartData.map((d) => d.price)) * 0.998;
  const maxPrice = Math.max(...chartData.map((d) => d.price)) * 1.002;

  function handleAddEntry() {
    if (!stock || !amount || !targetPrice) return;
    const amountThb = parseFloat(amount);
    const priceUsd = parseFloat(targetPrice);
    const result = executeTrade({
      action: tradeAction,
      symbol,
      companyName: stock.companyName,
      category: stock.category,
      amountThb,
      priceUsd,
      exchangeRate: DEFAULT_USD_THB_RATE,
      reason,
      notes: note,
    });

    if (!result.ok) {
      setTradeMessage(result.message ?? "บันทึกรายการไม่สำเร็จ");
      return;
    }

    setTradeMessage(
      tradeAction === "buy"
        ? "ซื้อสำเร็จ พอร์ตอัปเดตแล้ว"
        : "ขายสำเร็จ พอร์ตอัปเดตแล้ว"
    );
    window.setTimeout(() => {
      setTradeMessage("");
    }, 1800);
    setShowAddForm(false);
    setAmount("");
    setTargetPrice("");
    setNote("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-[#0d1220] border border-[#1e2d45] rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2d45]">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-slate-100">{symbol}</h2>
              <span
                className={clsx(
                  "text-[10px] border px-2 py-0.5 rounded-md",
                  statusStyle
                )}
              >
                {status}
              </span>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {stock.companyName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#1e2d45] flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Price + PnL */}
        <div className="px-5 pt-4 pb-2 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
              Current Price
            </p>
            <p className="text-xl font-semibold text-slate-100">
              ${stock.currentPrice.toFixed(2)}
            </p>
            <p
              className={clsx(
                "text-[12px]",
                stock.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
              )}
            >
              {formatPercent(stock.changePercent)} today
            </p>
          </div>
          {holding && holding.shares > 0 && (
            <>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                  Avg Cost
                </p>
                <p className="text-lg font-medium text-slate-200">
                  ${holding.avgCost.toFixed(2)}
                </p>
                <p className="text-[12px] text-slate-500">
                  {holding.shares.toFixed(2)} shares
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
                  P&amp;L
                </p>
                <p
                  className={clsx(
                    "text-lg font-medium",
                    getPnLColor(pnl)
                  )}
                >
                  {formatPercent(pnlPercent)}
                </p>
                <p className={clsx("text-[12px]", getPnLColor(pnl))}>
                  {pnl >= 0 ? "+" : ""}
                  {formatCurrency(pnl)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Market metrics */}
        <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/40 p-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
              RSI 14
            </p>
            <p className={clsx("text-[14px] font-semibold", getRsiColor(stock.rsi14))}>
              {formatOptionalNumber(stock.rsi14, 1)}
            </p>
          </div>
          <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/40 p-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
              P/E
            </p>
            <p className="text-[14px] font-semibold text-slate-200">
              {formatOptionalNumber(stock.peRatio ?? stock.forwardPeRatio, 1)}
            </p>
          </div>
          <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/40 p-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
              Volume
            </p>
            <p className="text-[14px] font-semibold text-slate-200">
              {formatCompactNumber(stock.volume)}
            </p>
          </div>
          <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/40 p-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
              Day Range
            </p>
            <p className="text-[12px] font-semibold text-slate-200">
              {stock.dayLow && stock.dayHigh
                ? `$${stock.dayLow.toFixed(2)} - $${stock.dayHigh.toFixed(2)}`
                : "N/A"}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="px-5 py-3">
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={140}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#4a6080" }}
                  tickLine={false}
                  axisLine={false}
                  interval={6}
                />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  tick={{ fontSize: 10, fill: "#4a6080" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* Support lines */}
                {stock.levels.support.slice(0, 2).map((s, i) => (
                  <ReferenceLine
                    key={`s${i}`}
                    y={s}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                ))}
                {/* Resistance lines */}
                {stock.levels.resistance.slice(0, 2).map((r, i) => (
                  <ReferenceLine
                    key={`r${i}`}
                    y={r}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                ))}
                {/* Avg cost */}
                {holding && holding.avgCost > 0 && (
                  <ReferenceLine
                    y={holding.avgCost}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    strokeOpacity={0.7}
                    strokeWidth={1.5}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  fill="url(#chartGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-1 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-500">
              <span className="w-3 border-t border-dashed border-emerald-500" /> Support
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <span className="w-3 border-t border-dashed border-red-500" /> Resistance
            </span>
            {holding && holding.avgCost > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <span className="w-3 border-t border-dashed border-amber-500" /> Avg Cost
              </span>
            )}
          </div>
        </div>

        {/* Support / Resistance */}
        <div className="px-5 py-3 grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider mb-2">
              Support
            </p>
            {stock.levels.support.map((s, i) => (
              <div
                key={i}
                className="flex justify-between text-[12px] py-0.5"
              >
                <span className="text-slate-500">S{i + 1}</span>
                <span className="text-emerald-400">${s}</span>
              </div>
            ))}
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <p className="text-[10px] text-red-600 uppercase tracking-wider mb-2">
              Resistance
            </p>
            {stock.levels.resistance.map((r, i) => (
              <div
                key={i}
                className="flex justify-between text-[12px] py-0.5"
              >
                <span className="text-slate-500">R{i + 1}</span>
                <span className="text-red-400">${r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trade form */}
        {showAddForm ? (
          <div className="px-5 py-3 border-t border-[#1e2d45] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-slate-400 font-medium">
                บันทึกซื้อ / ขาย
              </p>
              <div className="flex rounded-lg border border-[#1e2d45] overflow-hidden">
                {[
                  { key: "buy", label: "Buy" },
                  { key: "sell", label: "Sell" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setTradeAction(item.key as "buy" | "sell");
                      setReason(item.key === "buy" ? "ซื้อเพิ่ม" : "ขายทำรายการ");
                      setTradeMessage("");
                    }}
                    className={clsx(
                      "px-3 py-1.5 text-[11px] font-medium transition-colors",
                      tradeAction === item.key
                        ? item.key === "buy"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">
                  {tradeAction === "buy" ? "เงินลงทุน (THB)" : "มูลค่าขาย (THB)"}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">
                  ราคาจริง ($)
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder={stock.currentPrice.toFixed(2)}
                  className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-600 block mb-1">
                เหตุผล
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
              >
                {[
                  tradeAction === "buy" ? "ซื้อเพิ่ม" : "ขายทำรายการ",
                  "DCA ปกติ",
                  "ใกล้แนวรับ",
                  "ทำกำไร",
                  "ลดความเสี่ยง",
                  "อื่นๆ",
                ].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-600 block mb-1">
                Note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
              />
            </div>
            {amount && targetPrice && (
              <div className="rounded-lg bg-[#141d2e]/60 border border-[#1e2d45] px-3 py-2 text-[11px] text-slate-500">
                ประมาณ{" "}
                <span className="text-slate-300">
                  {(parseFloat(amount || "0") /
                    DEFAULT_USD_THB_RATE /
                    parseFloat(targetPrice || "1")).toFixed(6)}
                </span>{" "}
                shares · 1 USD = ฿{DEFAULT_USD_THB_RATE}
              </div>
            )}
            {tradeMessage && (
              <p
                className={clsx(
                  "text-[11px]",
                  tradeMessage.includes("สำเร็จ")
                    ? "text-emerald-400"
                    : "text-amber-400"
                )}
              >
                {tradeMessage}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAddEntry}
                className={clsx(
                  "flex-1 rounded-lg py-2 text-[12px] font-medium transition-colors border",
                  tradeAction === "buy"
                    ? "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-400"
                    : "bg-red-500/15 hover:bg-red-500/25 border-red-500/35 text-red-400"
                )}
              >
                {tradeAction === "buy" ? "ซื้อและอัปเดตพอร์ต" : "ขายและอัปเดตพอร์ต"}
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 border border-[#1e2d45] text-slate-500 rounded-lg py-2 text-[12px] transition-colors hover:text-slate-300"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-[#1e2d45] flex gap-2">
            <button
              onClick={() => {
                setTradeAction("buy");
                setReason("ซื้อเพิ่ม");
                setTargetPrice(stock.currentPrice.toFixed(2));
                setShowAddForm(true);
              }}
              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Buy
            </button>
            <button
              onClick={() => {
                setTradeAction("sell");
                setReason("ขายทำรายการ");
                setTargetPrice(stock.currentPrice.toFixed(2));
                setShowAddForm(true);
              }}
              className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
              Sell
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
