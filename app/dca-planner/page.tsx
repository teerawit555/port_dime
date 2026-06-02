"use client";
import AppShell from "@/components/layout/AppShell";
import DCAPlanner from "@/components/dca/DCAPlanner";
import DailyInvestmentInput from "@/components/dashboard/DailyInvestmentInput";

export default function DCAPage() {
  return (
    <AppShell>
      <div className="px-4 lg:px-6 py-5 space-y-5 max-w-4xl mx-auto">
        <div>
          <h1 className="text-[18px] font-semibold text-slate-100">
            DCA Planner
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            วางแผนจัดสรรงบลงทุนรายวันตามแนวรับแนวต้านและสัดส่วนพอร์ต
          </p>
        </div>
        <DCAPlanner />
        <DailyInvestmentInput />
      </div>
    </AppShell>
  );
}
