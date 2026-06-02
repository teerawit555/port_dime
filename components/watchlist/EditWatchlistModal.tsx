"use client";
import { useState } from "react";
import { useApp } from "@/lib/context";
import { StockWatchlistItem } from "@/types";
import { X } from "lucide-react";

interface EditWatchlistModalProps {
  stock: StockWatchlistItem;
  onClose: () => void;
}

export default function EditWatchlistModal({
  stock,
  onClose,
}: EditWatchlistModalProps) {
  const { watchlist, updateWatchlist } = useApp();
  const [price, setPrice] = useState(stock.currentPrice.toString());
  const [prevClose, setPrevClose] = useState(stock.previousClose.toString());
  const [s1, setS1] = useState(stock.levels.support[0].toString());
  const [s2, setS2] = useState(stock.levels.support[1].toString());
  const [s3, setS3] = useState(stock.levels.support[2].toString());
  const [r1, setR1] = useState(stock.levels.resistance[0].toString());
  const [r2, setR2] = useState(stock.levels.resistance[1].toString());
  const [r3, setR3] = useState(stock.levels.resistance[2].toString());
  const [notes, setNotes] = useState(stock.notes ?? "");

  function handleSave() {
    const updatedPrice = parseFloat(price);
    const updatedPrev = parseFloat(prevClose);
    const changePct =
      updatedPrev > 0
        ? ((updatedPrice - updatedPrev) / updatedPrev) * 100
        : 0;
    const updated = watchlist.map((s) =>
      s.symbol === stock.symbol
        ? {
            ...s,
            currentPrice: updatedPrice,
            previousClose: updatedPrev,
            changePercent: changePct,
            levels: {
              support: [
                parseFloat(s1),
                parseFloat(s2),
                parseFloat(s3),
              ] as [number, number, number],
              resistance: [
                parseFloat(r1),
                parseFloat(r2),
                parseFloat(r3),
              ] as [number, number, number],
            },
            notes,
          }
        : s
    );
    updateWatchlist(updated);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0d1220] border border-[#1e2d45] rounded-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-slate-200">
            แก้ไข {stock.symbol}
          </h2>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-600 block mb-1">
              ราคาปัจจุบัน ($)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-600 block mb-1">
              ปิดก่อนหน้า ($)
            </label>
            <input
              type="number"
              value={prevClose}
              onChange={(e) => setPrevClose(e.target.value)}
              className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
            Support
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              [s1, setS1, "S1"],
              [s2, setS2, "S2"],
              [s3, setS3, "S3"],
            ].map(([val, setter, label]) => (
              <div key={label as string}>
                <label className="text-[10px] text-emerald-600 block mb-1">
                  {label as string}
                </label>
                <input
                  type="number"
                  value={val as string}
                  onChange={(e) => (setter as any)(e.target.value)}
                  className="w-full bg-[#141d2e] border border-emerald-900/40 rounded-lg px-2 py-2 text-[12px] text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
            Resistance
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              [r1, setR1, "R1"],
              [r2, setR2, "R2"],
              [r3, setR3, "R3"],
            ].map(([val, setter, label]) => (
              <div key={label as string}>
                <label className="text-[10px] text-red-600 block mb-1">
                  {label as string}
                </label>
                <input
                  type="number"
                  value={val as string}
                  onChange={(e) => (setter as any)(e.target.value)}
                  className="w-full bg-[#141d2e] border border-red-900/40 rounded-lg px-2 py-2 text-[12px] text-slate-200 outline-none focus:border-red-500/50"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-600 block mb-1">Note</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg px-3 py-2 text-[12px] text-slate-200 outline-none focus:border-blue-500/50 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 rounded-lg py-2.5 text-[12px] font-medium transition-colors"
        >
          บันทึก
        </button>
      </div>
    </div>
  );
}
