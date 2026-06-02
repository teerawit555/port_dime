"use client";
import { useEffect, useState } from "react";
import { Plus, PlusCircle } from "lucide-react";
import { useApp } from "@/lib/context";
import { generateId } from "@/lib/utils";

export default function DailyInvestmentInput() {
  const { addLogEntry, watchlist } = useApp();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [symbol, setSymbol] = useState("GOOGL");
  const [amount, setAmount] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [reason, setReason] = useState("DCA ปกติ");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!watchlist.some((stock) => stock.symbol === symbol)) {
      setSymbol(watchlist[0]?.symbol ?? "GOOGL");
    }
  }, [symbol, watchlist]);

  function handleSubmit() {
    if (!amount || !targetPrice) return;
    addLogEntry({
      id: generateId(),
      date,
      symbol,
      amount: parseFloat(amount),
      targetPrice: parseFloat(targetPrice),
      action: "buy",
      reason,
      status: "planned",
      notes,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
      setAmount("");
      setTargetPrice("");
      setNotes("");
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

  return (
    <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
          Daily Investment Input
        </h3>
        <button
          onClick={() => setOpen(false)}
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
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-600 block mb-1">หุ้น</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          >
            {watchlist.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol}
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
            onChange={(e) => setAmount(e.target.value)}
            placeholder="เช่น 1000"
            className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-600 block mb-1">
            ราคาเป้าหมาย ($)
          </label>
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="เช่น 170"
            className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-slate-600 block mb-1">เหตุผล</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
        >
          {["DCA ปกติ", "ใกล้แนวรับ", "breakout", "ย่อแรง", "อื่นๆ"].map(
            (r) => (
              <option key={r} value={r}>
                {r}
              </option>
            )
          )}
        </select>
      </div>

      <div>
        <label className="text-[10px] text-slate-600 block mb-1">Note</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="บันทึกเพิ่มเติม..."
          rows={2}
          className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!amount || !targetPrice || saved}
        className="w-full bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-40 border border-blue-500/40 text-blue-400 rounded-lg py-2.5 text-[12px] font-medium transition-colors"
      >
        {saved ? "✓ บันทึกแล้ว" : "บันทึกรายการ"}
      </button>
    </div>
  );
}
