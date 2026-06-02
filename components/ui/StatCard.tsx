import { clsx } from "clsx";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon?: LucideIcon;
  iconColor?: string;
  accent?: "green" | "red" | "blue" | "amber" | "neutral";
}

const accentBorder: Record<string, string> = {
  green: "border-emerald-500/30",
  red: "border-red-500/30",
  blue: "border-blue-500/30",
  amber: "border-amber-500/30",
  neutral: "border-[#1e2d45]",
};

export default function StatCard({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  iconColor = "text-slate-400",
  accent = "neutral",
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-[#0d1220] p-4 flex flex-col gap-2 animate-fade-up",
        accentBorder[accent]
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {Icon && <Icon className={clsx("w-4 h-4", iconColor)} />}
      </div>
      <p className="text-xl font-semibold text-slate-100 leading-none">
        {value}
      </p>
      {sub && (
        <p className={clsx("text-[12px]", subColor ?? "text-slate-500")}>
          {sub}
        </p>
      )}
    </div>
  );
}
