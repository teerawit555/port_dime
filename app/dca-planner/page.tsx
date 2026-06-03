"use client";
import { Target } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import DCAPlanner from "@/components/dca/DCAPlanner";
import DailyInvestmentInput from "@/components/dashboard/DailyInvestmentInput";

export default function DCAPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-5 lg:px-7 lg:py-7">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-blue-400/70">
            <Target className="h-3.5 w-3.5" />
            Portfolio Focus
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-100">
            DCA Planner
          </h1>
          <p className="mt-1 text-[12px] text-slate-500">
            วางแผนเติมเฉพาะหุ้นที่ถืออยู่ โดยรอซื้อเมื่อราคาเข้าโซนที่เหมาะสม
          </p>
        </div>
        <DCAPlanner />
        <DailyInvestmentInput />
      </div>
    </AppShell>
  );
}
