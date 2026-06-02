"use client";
import { ChangeEvent, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useApp } from "@/lib/context";
import { mockPortfolio, mockWatchlist, mockInvestmentLog } from "@/data/mockData";
import { RotateCcw, Save, AlertTriangle, Download, Upload, LogOut } from "lucide-react";
import { STORAGE_KEYS } from "@/lib/utils";

type BackupPayload = {
  version: 1;
  exportedAt: string;
  portfolio: unknown;
  watchlist: unknown;
  investmentLog: unknown;
};

export default function SettingsPage() {
  const { portfolio, updatePortfolio, updateWatchlist } = useApp();
  const [cashBalance, setCashBalance] = useState(
    portfolio.cashBalance.toString()
  );
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSaveCash() {
    updatePortfolio({ ...portfolio, cashBalance: parseFloat(cashBalance) || 0 });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function handleReset() {
    updatePortfolio(mockPortfolio);
    updateWatchlist(mockWatchlist);
    localStorage.setItem(STORAGE_KEYS.LOG, JSON.stringify(mockInvestmentLog));
    setResetConfirm(false);
  }

  function handleExportBackup() {
    const backup: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      portfolio: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.PORTFOLIO) ??
          JSON.stringify(mockPortfolio)
      ),
      watchlist: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.WATCHLIST) ??
          JSON.stringify(mockWatchlist)
      ),
      investmentLog: JSON.parse(
        localStorage.getItem(STORAGE_KEYS.LOG) ??
          JSON.stringify(mockInvestmentLog)
      ),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stockdesk-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Exported backup JSON");
  }

  async function handleImportBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text()) as BackupPayload;
      if (!payload.portfolio || !payload.watchlist || !payload.investmentLog) {
        throw new Error("Invalid backup file");
      }

      localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(payload.portfolio));
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(payload.watchlist));
      localStorage.setItem(STORAGE_KEYS.LOG, JSON.stringify(payload.investmentLog));
      setBackupMessage("Imported backup. Reloading...");
      window.setTimeout(() => window.location.reload(), 600);
    } catch {
      setBackupMessage("Import failed: backup file is invalid");
    } finally {
      event.target.value = "";
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <AppShell>
      <div className="px-4 lg:px-6 py-5 space-y-5 max-w-2xl mx-auto">
        <div>
          <h1 className="text-[18px] font-semibold text-slate-100">Settings</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            ตั้งค่าพอร์ตและข้อมูลส่วนตัว
          </p>
        </div>

        {/* Cash balance */}
        <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4 space-y-3">
          <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
            เงินสดคงเหลือ (THB)
          </h3>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">฿</span>
              <input
                type="number"
                value={cashBalance}
                onChange={(e) => setCashBalance(e.target.value)}
                className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg pl-7 pr-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-blue-500/50"
              />
            </div>
            <button
              onClick={handleSaveCash}
              className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 rounded-lg px-4 py-2 text-[12px] font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>

        {/* Holdings editor */}
        <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4 space-y-3">
          <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
            แก้ไขข้อมูล Holdings
          </h3>
          <div className="space-y-2">
            {portfolio.holdings.map((h, idx) => (
              <div key={h.symbol} className="flex items-center gap-3">
                <span className="text-[12px] font-semibold text-slate-300 w-12">
                  {h.symbol}
                </span>
                <div className="flex gap-2 flex-1">
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-600 block mb-0.5">Shares</label>
                    <input
                      type="number"
                      defaultValue={h.shares}
                      className="w-full bg-[#141d2e] border border-[#1e2d45] rounded px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-blue-500/50"
                      onChange={(e) => {
                        const updated = [...portfolio.holdings];
                        updated[idx] = { ...h, shares: parseFloat(e.target.value) || 0 };
                        updatePortfolio({ ...portfolio, holdings: updated });
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-600 block mb-0.5">Avg Cost $</label>
                    <input
                      type="number"
                      defaultValue={h.avgCost}
                      className="w-full bg-[#141d2e] border border-[#1e2d45] rounded px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-blue-500/50"
                      onChange={(e) => {
                        const updated = [...portfolio.holdings];
                        updated[idx] = { ...h, avgCost: parseFloat(e.target.value) || 0 };
                        updatePortfolio({ ...portfolio, holdings: updated });
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] text-slate-600 block mb-0.5">Price $</label>
                    <input
                      type="number"
                      defaultValue={h.currentPrice}
                      className="w-full bg-[#141d2e] border border-[#1e2d45] rounded px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-blue-500/50"
                      onChange={(e) => {
                        const updated = [...portfolio.holdings];
                        updated[idx] = { ...h, currentPrice: parseFloat(e.target.value) || 0 };
                        updatePortfolio({ ...portfolio, holdings: updated });
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4 space-y-2">
          <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
            เกี่ยวกับแอป
          </h3>
          <div className="space-y-1 text-[12px] text-slate-500">
            <p>Version: 1.0.0 MVP</p>
            <p>Storage: localStorage (browser)</p>
            <p>Data: Live polling + local portfolio transactions</p>
          </div>
          <div className="mt-3 p-3 bg-amber-900/10 border border-amber-800/30 rounded-lg text-[11px] text-amber-600">
            ⚠️ ข้อมูลเก็บไว้ใน browser localStorage ล้างข้อมูลเมื่อ clear cache
          </div>
        </div>

        {/* Backup */}
        <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4 space-y-3">
          <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
            Backup & Restore
          </h3>
          <p className="text-[12px] text-slate-500">
            Export เก็บไว้ก่อนย้ายเครื่องหรือล้าง browser แล้ว import กลับมาได้
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-2 border border-blue-500/40 bg-blue-500/10 text-blue-400 rounded-lg px-4 py-2 text-[12px] hover:bg-blue-500/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 rounded-lg px-4 py-2 text-[12px] hover:bg-emerald-500/20 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportBackup}
            />
          </div>
          {backupMessage && (
            <p className="text-[11px] text-slate-500">{backupMessage}</p>
          )}
        </div>

        {/* Account */}
        <div className="rounded-xl border border-[#1e2d45] bg-[#0d1220] p-4 space-y-3">
          <h3 className="text-[12px] uppercase tracking-wider text-slate-500">
            Access
          </h3>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 border border-[#1e2d45] text-slate-500 rounded-lg px-4 py-2 text-[12px] hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>

        {/* Reset */}
        <div className="rounded-xl border border-red-900/30 bg-red-900/5 p-4 space-y-3">
          <h3 className="text-[12px] uppercase tracking-wider text-red-700">
            Danger Zone
          </h3>
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="flex items-center gap-2 border border-red-800/40 text-red-600 rounded-lg px-4 py-2 text-[12px] hover:bg-red-900/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Mock Data
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                ยืนยันการ reset ข้อมูลทั้งหมด?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="bg-red-900/30 border border-red-700/40 text-red-400 rounded-lg px-4 py-2 text-[12px] hover:bg-red-900/50 transition-colors"
                >
                  ยืนยัน Reset
                </button>
                <button
                  onClick={() => setResetConfirm(false)}
                  className="border border-[#1e2d45] text-slate-500 rounded-lg px-4 py-2 text-[12px] hover:text-slate-300 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
