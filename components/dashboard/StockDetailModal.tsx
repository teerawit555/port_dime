"use client";
import { useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import { useApp } from "@/lib/context";
import StockIntradayChart from "@/components/dashboard/StockIntradayChart";
import {
  DEFAULT_USD_THB_RATE,
  formatCurrency,
  formatPercent,
  formatCompactNumber,
  formatCompactCurrency,
  formatMultiple,
  formatOptionalNumber,
  formatPeRatio,
  calcHoldingMetrics,
  getPnLColor,
  getRsiColor,
  getStockStatus,
  getStatusColor,
  calculateBuyZoneScore,
  getActionAmountLabel,
  getBuyScoreColor,
} from "@/lib/utils";
import { clsx } from "clsx";

interface StockDetailModalProps {
  symbol: string;
  onClose: () => void;
}

function formatMetricPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? formatPercent(value)
    : "N/A";
}

function FundamentalMetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/40 p-3">
      <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-[13px] font-semibold text-slate-200">{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function StockDetailModal({
  symbol,
  onClose,
}: StockDetailModalProps) {
  const { portfolio, watchlist, totalPortfolioValue, executeTrade } = useApp();
  const [note, setNote] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [reason, setReason] = useState("DCA ปกติ");
  const [tradeMessage, setTradeMessage] = useState("");
  const [sellAllMode, setSellAllMode] = useState(false);

  const stock = watchlist.find((s) => s.symbol === symbol);
  const holding = portfolio.holdings.find((h) => h.symbol === symbol);

  if (!stock) return null;

  const { pnl, pnlPercent } = holding
    ? calcHoldingMetrics(holding)
    : { pnl: 0, pnlPercent: 0 };

  const status = getStockStatus(stock.currentPrice, stock.levels);
  const statusStyle = getStatusColor(status);
  const { buyScore, buyScoreLabel } = calculateBuyZoneScore({
    status,
    rsi14: stock.rsi14,
    holding: holding ?? null,
    totalPortfolioValue,
    category: stock.category,
    peRatio: stock.peRatio,
    priceToSalesRatio: stock.priceToSalesRatio,
    netIncomeTtm: stock.netIncomeTtm,
  });
  const actionAmount = getActionAmountLabel({
    buyScore,
    category: stock.category,
    recommendation: stock.recommendation,
  });
  const heldShares = holding?.shares ?? 0;
  const parsedTargetPrice = parseFloat(targetPrice);
  const sellAllProceedsThb =
    sellAllMode &&
    tradeAction === "sell" &&
    heldShares > 0 &&
    Number.isFinite(parsedTargetPrice) &&
    parsedTargetPrice > 0
      ? heldShares * parsedTargetPrice * DEFAULT_USD_THB_RATE
      : 0;

  function getSellAllAmount(priceValue: string) {
    const price = parseFloat(priceValue);
    if (!holding || holding.shares <= 0 || !Number.isFinite(price) || price <= 0) {
      return "";
    }
    return (holding.shares * price * DEFAULT_USD_THB_RATE).toFixed(2);
  }

  function openTradeForm(action: "buy" | "sell", shouldSellAll = false) {
    const priceValue = stock!.currentPrice.toFixed(2);
    setTradeAction(action);
    setSellAllMode(action === "sell" && shouldSellAll);
    setReason(
      action === "buy"
        ? "ซื้อเพิ่ม"
        : shouldSellAll
          ? "ขายทั้งหมด"
          : "ขายทำรายการ"
    );
    setTargetPrice(priceValue);
    setAmount(action === "sell" && shouldSellAll ? getSellAllAmount(priceValue) : "");
    setTradeMessage("");
    setShowAddForm(true);
  }

  function handleTradeActionChange(action: "buy" | "sell") {
    setTradeAction(action);
    setSellAllMode(false);
    setAmount("");
    setReason(action === "buy" ? "ซื้อเพิ่ม" : "ขายทำรายการ");
    setTradeMessage("");
  }

  function handleTargetPriceChange(value: string) {
    setTargetPrice(value);
    if (sellAllMode) {
      setAmount(getSellAllAmount(value));
    }
  }

  function closeTradeForm() {
    setShowAddForm(false);
    setSellAllMode(false);
  }

  function handleAddEntry() {
    const priceUsd = parseFloat(targetPrice);
    const amountThb = sellAllMode ? sellAllProceedsThb : parseFloat(amount);
    if (
      !Number.isFinite(priceUsd) ||
      priceUsd <= 0 ||
      !Number.isFinite(amountThb) ||
      amountThb <= 0
    ) {
      setTradeMessage("กรุณากรอกราคาและจำนวนเงินให้ถูกต้อง");
      return;
    }

    const result = executeTrade({
      action: tradeAction,
      sellAll: tradeAction === "sell" && sellAllMode,
      symbol,
      companyName: stock!.companyName,
      category: stock!.category,
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
    setSellAllMode(false);
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
        <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-6 gap-2">
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
              {formatPeRatio(
                stock.peRatio ?? stock.forwardPeRatio,
                stock.netIncomeTtm,
                stock.category
              )}
            </p>
          </div>
          <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/40 p-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
              P/S
            </p>
            <p className="text-[14px] font-semibold text-slate-200">
              {formatMultiple(stock.priceToSalesRatio)}
            </p>
          </div>
          <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/40 p-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
              Market Cap
            </p>
            <p className="text-[14px] font-semibold text-slate-200">
              {formatCompactCurrency(stock.marketCap)}
            </p>
          </div>
          <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/40 p-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
              Buy Score
            </p>
            <p
              className={clsx(
                "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                getBuyScoreColor(buyScore)
              )}
            >
              {buyScore} · {buyScoreLabel}
            </p>
          </div>
          <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/40 p-3">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">
              Action
            </p>
            <p className="text-[13px] font-semibold text-slate-200">
              {actionAmount}
            </p>
          </div>
        </div>

        <StockIntradayChart stock={stock} avgCost={holding?.avgCost} />

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

        {/* Fundamentals */}
        <div className="px-5 py-3 border-t border-[#1e2d45]">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">
              Fundamentals
            </p>
            <p className="text-[10px] text-slate-600">
              {stock.fundamentalsAsOf
                ? `งบล่าสุด ${stock.fundamentalsAsOf}`
                : "รอข้อมูล fundamentals"}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <FundamentalMetricCard
              label="Revenue TTM"
              value={formatCompactCurrency(stock.totalRevenueTtm)}
              sub={`YoY ${formatMetricPercent(stock.revenueGrowthYoYPercent)}`}
            />
            <FundamentalMetricCard
              label="Net Income TTM"
              value={formatCompactCurrency(stock.netIncomeTtm)}
              sub={`Margin ${formatMetricPercent(stock.netMarginPercent)}`}
            />
            <FundamentalMetricCard
              label="Free Cash Flow"
              value={formatCompactCurrency(stock.freeCashFlowTtm)}
              sub={`Yield ${formatMetricPercent(stock.freeCashFlowYieldPercent)}`}
            />
            <FundamentalMetricCard
              label="Gross Margin"
              value={formatMetricPercent(stock.grossMarginPercent)}
              sub={`FCF margin ${formatMetricPercent(stock.freeCashFlowMarginPercent)}`}
            />
            <FundamentalMetricCard
              label="EPS TTM"
              value={
                typeof stock.epsTtm === "number"
                  ? `$${stock.epsTtm.toFixed(2)}`
                  : "N/A"
              }
              sub={`Earnings YoY ${formatMetricPercent(stock.earningsGrowthYoYPercent)}`}
            />
            <FundamentalMetricCard
              label="P/B"
              value={formatMultiple(stock.priceToBookRatio)}
              sub={`Debt/Equity ${formatMetricPercent(stock.debtToEquityPercent)}`}
            />
            <FundamentalMetricCard
              label="Operating Cash Flow"
              value={formatCompactCurrency(stock.operatingCashFlowTtm)}
              sub={`Debt ${formatCompactCurrency(stock.totalDebt)}`}
            />
            <FundamentalMetricCard
              label="Book Equity"
              value={formatCompactCurrency(stock.stockholdersEquity)}
              sub={stock.fundamentalsSource ?? "N/A"}
            />
          </div>
        </div>

        {/* Technical context */}
        <div className="px-5 py-3 border-t border-[#1e2d45]">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2.5">
            Technical Context
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <FundamentalMetricCard
              label="SMA 20"
              value={
                typeof stock.sma20 === "number"
                  ? `$${stock.sma20.toFixed(2)}`
                  : "N/A"
              }
            />
            <FundamentalMetricCard
              label="SMA 50"
              value={
                typeof stock.sma50 === "number"
                  ? `$${stock.sma50.toFixed(2)}`
                  : "N/A"
              }
            />
            <FundamentalMetricCard
              label="SMA 200"
              value={
                typeof stock.sma200 === "number"
                  ? `$${stock.sma200.toFixed(2)}`
                  : "N/A"
              }
            />
            <FundamentalMetricCard
              label="52W Range"
              value={
                typeof stock.fiftyTwoWeekLow === "number" &&
                typeof stock.fiftyTwoWeekHigh === "number"
                  ? `$${stock.fiftyTwoWeekLow.toFixed(2)} - $${stock.fiftyTwoWeekHigh.toFixed(2)}`
                  : "N/A"
              }
              sub={`จากจุดสูงสุด ${formatMetricPercent(stock.distanceFrom52WeekHighPercent)}`}
            />
            <FundamentalMetricCard
              label="Volume"
              value={formatCompactNumber(stock.volume)}
            />
            <FundamentalMetricCard
              label="Day Range"
              value={
                stock.dayLow && stock.dayHigh
                  ? `$${stock.dayLow.toFixed(2)} - $${stock.dayHigh.toFixed(2)}`
                  : "N/A"
              }
            />
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
                    onClick={() => handleTradeActionChange(item.key as "buy" | "sell")}
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
                  {sellAllMode
                    ? "เงินรับโดยประมาณ (THB)"
                    : tradeAction === "buy"
                      ? "เงินลงทุน (THB)"
                      : "มูลค่าขาย (THB)"}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    if (!sellAllMode) setAmount(e.target.value);
                  }}
                  readOnly={sellAllMode}
                  placeholder={sellAllMode ? "Auto" : "500"}
                  className={clsx(
                    "w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50",
                    sellAllMode && "text-emerald-300"
                  )}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-1">
                  ราคาจริง ($)
                </label>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => handleTargetPriceChange(e.target.value)}
                  placeholder={stock.currentPrice.toFixed(2)}
                  className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
            {sellAllMode && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2 text-[11px] text-slate-400">
                Sell all{" "}
                <span className="text-slate-200">{heldShares.toFixed(6)}</span>{" "}
                shares · proceeds{" "}
                <span className="text-emerald-300">
                  ฿{sellAllProceedsThb.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
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
                onClick={closeTradeForm}
                className="px-4 border border-[#1e2d45] text-slate-500 rounded-lg py-2 text-[12px] transition-colors hover:text-slate-300"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-[#1e2d45] flex flex-wrap gap-2">
            <button
              onClick={() => openTradeForm("buy")}
              className="flex min-w-24 flex-1 items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Buy
            </button>
            <button
              onClick={() => openTradeForm("sell")}
              className="flex min-w-24 flex-1 items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
              Sell
            </button>
            {holding && holding.shares > 0 && (
              <button
                onClick={() => openTradeForm("sell", true)}
                className="flex min-w-28 flex-1 items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
                Sell All
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
