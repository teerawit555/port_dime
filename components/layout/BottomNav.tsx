"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Eye,
  Calculator,
  BookOpen,
  Settings,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/dca-planner", label: "DCA", icon: Calculator },
  { href: "/investment-log", label: "Log", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080c14] border-t border-[#1e2d45] flex items-center">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
              isActive ? "text-blue-400" : "text-slate-500"
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
