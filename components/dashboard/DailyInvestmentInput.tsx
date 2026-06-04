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
    : watchlist[0]?.symbol ?? "";

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
        className="flex w-full items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-[12px] font-medium text-blue-400 transition-colors hover:bg-blue-500/15"
      >
        <PlusCircle className="h-4 w-4" />
        บันทึกรายการซื้อวันนี้
      </button>
    );
  }

  const estimatedShares =
    amount && targetPrice
      ? parseFloat(amount) / DEFAULT_USD_THB_RATE / parseFloat(targetPrice)
      : 0;

  return (
    <div className="space-y-3 rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
          Daily Buy Input
        </h3>
        <button
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
          className="text-[11px] text-slate-600 hover:text-slate-400"
        >
          ปิด
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] text-slate-600">
            วันที่
          </label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-lg border border-[#1e2d45] bg-[#141d2e] px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-slate-600">หุ้น</label>
          <select
            value={activeSymbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="w-full rounded-lg border border-[#1e2d45] bg-[#141d2e] px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          >
            {watchlist.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - {stock.companyName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-slate-600">
            งบ (THB)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="1000"
            className="w-full rounded-lg border border-[#1e2d45] bg-[#141d2e] px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-slate-600">
            ราคาซื้อจริง (USD)
          </label>
          <input
            type="number"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            placeholder="170"
            className="w-full rounded-lg border border-[#1e2d45] bg-[#141d2e] px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] text-slate-600">เหตุผล</label>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-lg border border-[#1e2d45] bg-[#141d2e] px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
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
        <label className="mb-1 block text-[10px] text-slate-600">Note</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="บันทึกเพิ่มเติม..."
          rows={2}
          className="w-full resize-none rounded-lg border border-[#1e2d45] bg-[#141d2e] px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
        />
      </div>

      {amount && targetPrice && (
        <div className="rounded-lg border border-[#1e2d45] bg-[#141d2e]/60 px-3 py-2 text-[11px] text-slate-500">
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
        className="w-full rounded-lg border border-blue-500/40 bg-blue-500/20 py-2.5 text-[12px] font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-40"
      >
        {saved
          ? "บันทึกและอัปเดตพอร์ตแล้ว"
          : "บันทึกซื้อและอัปเดตพอร์ต"}
      </button>
    </div>
  );
}
