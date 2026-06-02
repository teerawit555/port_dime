"use client";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { LockKeyhole, TrendingUp } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      setLoading(false);
      return;
    }

    window.location.href = nextPath;
  }

  return (
    <main className="min-h-screen bg-grid flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#1e2d45] bg-[#0d1220] p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-[16px] font-semibold text-slate-100">
              StockDesk
            </h1>
            <p className="text-[11px] text-slate-500">Private portfolio</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-600 block mb-1 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <LockKeyhole className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
                className="w-full bg-[#141d2e] border border-[#1e2d45] rounded-lg pl-9 pr-3 py-3 text-[13px] text-slate-200 outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {error && <p className="text-[11px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={!password || loading}
            className="w-full bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 border border-blue-500/40 text-blue-400 rounded-lg py-2.5 text-[12px] font-medium transition-colors"
          >
            {loading ? "กำลังเข้า..." : "เข้าสู่ Dashboard"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
