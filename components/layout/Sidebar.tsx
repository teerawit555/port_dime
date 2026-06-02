"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Eye,
  Calculator,
  BookOpen,
  Settings,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/dca-planner", label: "DCA Planner", icon: Calculator },
  { href: "/investment-log", label: "Investment Log", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen border-r border-[#1e2d45] bg-[#080c14]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#1e2d45]">
        <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-200 leading-none">
            StockDesk
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Portfolio Tracker</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium",
                isActive ? "active text-blue-400" : "text-slate-500"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Disclaimer */}
      <div className="px-4 py-4 border-t border-[#1e2d45]">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          ⚠️ ไม่ใช่คำแนะนำการลงทุน
          <br />
          ข้อมูลใช้เพื่อการศึกษาเท่านั้น
        </p>
      </div>
    </aside>
  );
}
