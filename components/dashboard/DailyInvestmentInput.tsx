"use client";
import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { useApp } from "@/lib/context";
import { DEFAULT_USD_THB_RATE } from "@/lib/utils";

export default function DailyInvestmentInput() {
  const { executeTrade, watchlist } = useApp();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [symbol, setSymbol] = useState("GOOGL");
  const [amount, setAmount] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [reason, setReason] = useState("DCA ปกติ");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const activeSymbol = watchlist.some((stock) => stock.symbol === symbol)
    ? symbol
    : watchlist[0]?.symbol ?? "GOOGL";

  function resetForm() {
    setAmount("");
    setTargetPrice("");
    setNotes("");
    setError("");
  }

  function handleSubmit() {
    const selectedStock = watchlist.find(
      (stock) => stock.symbol === activeSymbol
    );
    const amountThb = parseFloat(amount);
    const priceUsd = parseFloat(targetPrice);

    if (
      !selectedStock ||
      !Number.isFinite(amountThb) ||
      !Number.isFinite(priceUsd)
    ) {
      setError("กรุณากรอกหุ้น จำนวนเงิน และราคาให้ถูกต้อง");
      return;
    }

    const result = executeTrade({
      action: "buy",
      date,
      symbol: activeSymbol,
      companyName: selectedStock.companyName,
      category: selectedStock.category,
      amountThb,
      priceUsd,
      exchangeRate: DEFAULT_USD_THB_RATE,
      reason,
      notes,
    });

    if (!result.ok) {
      setError(result.message ?? "บันทึกรายการไม่สำเร็จ");
      return;
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
      resetForm();
    }, 1200);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-xl px-4 py-3 text-[12px] font-medium w-full transition-colors"
      >
        <PlusCircle className="w-4 h-4" />
        บันทึกรายการซื้อวันนี้
      </button>
    );
  }

  const estimatedShares =
    amount && targetPrice
      ? parseFloat(amount) / DEFAULT_USD_THB_RATE / parseFloat(targetPrice)
      : 0;

  return (
    <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
          Daily Buy Input
        </h3>
        <button
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
          className="text-slate-600 hover:text-slate-400 text-[11px]"
        >
          ปิด
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-slate-600 block mb-1">วันที่</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-600 block mb-1">หุ้น</label>
          <select
            value={activeSymbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          >
            {watchlist.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-600 block mb-1">
            งบ (THB)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="1000"
            className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-600 block mb-1">
            ราคาซื้อจริง (USD)
          </label>
          <input
            type="number"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            placeholder="170"
            className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-600 block mb-1">เหตุผล</label>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
        >
          {["DCA ปกติ", "ใกล้แนวรับ", "Breakout", "ย่อแรง", "อื่นๆ"].map(
            (option) => (
              <option key={option} value={option}>
                {option}
              </option>
            )
          )}
        </select>
      </div>

      <div>
        <label className="text-[10px] text-slate-600 block mb-1">Note</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="บันทึกเพิ่มเติม..."
          rows={2}
          className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50 resize-none"
        />
      </div>

      {amount && targetPrice && (
        <div className="rounded-lg bg-[#141d2e]/60 border border-[#1e2d45] px-3 py-2 text-[11px] text-slate-500">
          ประมาณ{" "}
          <span className="text-slate-300">
            {Number.isFinite(estimatedShares) ? estimatedShares.toFixed(6) : "0"}
          </span>{" "}
          shares · 1 USD = ฿{DEFAULT_USD_THB_RATE}
        </div>
      )}

      {error && <p className="text-[11px] text-amber-400">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!amount || !targetPrice || saved}
        className="w-full bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-40 border border-blue-500/40 text-blue-400 rounded-lg py-2.5 text-[12px] font-medium transition-colors"
      >
        {saved ? "บันทึกและอัปเดตพอร์ตแล้ว" : "บันทึกซื้อและอัปเดตพอร์ต"}
      </button>
    </div>
  );
}
