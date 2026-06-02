"use client";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-grid">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
