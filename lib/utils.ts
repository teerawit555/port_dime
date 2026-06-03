import {
  StockStatus,
  StockRecommendation,
  SupportResistance,
  PortfolioHolding,
  DCARecommendation,
  RiskLevel,
  StockCategory,
  BuyZoneLabel,
} from "@/types";

// ─── Stock Status Logic ──────────────────────────────────────────────────────

export function getStockStatus(
  currentPrice: number,
  levels: SupportResistance
): StockStatus {
  const [s1] = levels.support;
  const [r1] = levels.resistance;
  const nearThreshold = 0.02; // 2%

  const distanceFromS1 = (currentPrice - s1) / s1;
  const distanceFromR1 = (r1 - currentPrice) / r1;

  if (currentPrice < s1) return "หลุดแนวรับ";
  if (distanceFromS1 <= nearThreshold) return "ใกล้แนวรับ";
  if (currentPrice > r1) return "Breakout";
  if (distanceFromR1 <= nearThreshold) return "ใกล้แนวต้าน";
  if (distanceFromS1 <= 0.05) return "เด้งจากแนวรับ";
  return "รอดู";
}

export function getRecommendation(
  status: StockStatus,
  holding: PortfolioHolding | null,
  totalPortfolioValue: number,
  category: StockCategory
): StockRecommendation {
  const currentAllocation =
    holding && totalPortfolioValue > 0
      ? (holding.shares * holding.currentPrice) / totalPortfolioValue
      : 0;

  if (status === "หลุดแนวรับ") return "ไม่ควรซื้อตอนนี้";
  if (status === "Breakout") return "ระวังไล่ราคา";
  if (status === "ใกล้แนวต้าน") return "ระวังไล่ราคา";

  if (category === "ETF" && currentAllocation > 0.35) return "ถือ";
  if (category === "Growth" && currentAllocation > 0.08) return "ถือ";

  if (status === "ใกล้แนวรับ" || status === "เด้งจากแนวรับ")
    return "ซื้อไม้เล็ก";
  if (status === "รอดู") return currentAllocation > 0 ? "ถือ" : "รอซื้อ";

  return "รอซื้อ";
}

export function getRiskLevel(
  category: StockCategory,
  status: StockStatus
): RiskLevel {
  if (status === "หลุดแนวรับ" || status === "Breakout") return "สูง";
  if (category === "Growth") return "สูง";
  if (category === "ETF") return "ต่ำ";
  if (category === "Blue Chip") return status === "ใกล้แนวรับ" ? "ต่ำ" : "กลาง";
  return "กลาง";
}

function getCurrentAllocation(
  holding: PortfolioHolding | null,
  totalPortfolioValue: number
) {
  return holding && totalPortfolioValue > 0
    ? (holding.shares * holding.currentPrice) / totalPortfolioValue
    : 0;
}

export function getBuyZoneLabel(score: number): BuyZoneLabel {
  if (score >= 80) return "น่าเก็บ";
  if (score >= 60) return "ไม้เล็ก";
  if (score >= 40) return "รอดู";
  return "อย่าไล่";
}

export function calculateBuyZoneScore({
  status,
  rsi14,
  holding,
  totalPortfolioValue,
  category,
  peRatio,
  priceToSalesRatio,
  netIncomeTtm,
}: {
  status: StockStatus;
  rsi14?: number | null;
  holding: PortfolioHolding | null;
  totalPortfolioValue: number;
  category: StockCategory;
  peRatio?: number | null;
  priceToSalesRatio?: number | null;
  netIncomeTtm?: number | null;
}) {
  const currentAllocation = getCurrentAllocation(holding, totalPortfolioValue);
  let score = 0;

  if (status === "ใกล้แนวรับ" || status === "เด้งจากแนวรับ") score += 30;
  else if (status === "รอดู") score += 15;
  else if (status === "หลุดแนวรับ") score += 5;

  if (typeof rsi14 === "number" && Number.isFinite(rsi14)) {
    if (rsi14 >= 35 && rsi14 <= 55) score += 25;
    else if (rsi14 > 55 && rsi14 <= 70) score += 15;
    else if (rsi14 < 35) score += 18;
  } else {
    score += 10;
  }

  const allocationCap =
    category === "ETF" ? 0.35 : category === "Growth" ? 0.08 : 0.15;
  if (currentAllocation === 0) score += 20;
  else if (currentAllocation <= allocationCap) score += 15;
  else score += 5;

  if (category === "ETF") {
    score += 15;
  } else if (typeof peRatio === "number" && Number.isFinite(peRatio)) {
    if (peRatio <= 25) score += 15;
    else if (peRatio <= 40) score += 10;
    else if (peRatio <= 60) score += 5;
  } else if (
    typeof netIncomeTtm === "number" &&
    netIncomeTtm <= 0 &&
    typeof priceToSalesRatio === "number" &&
    Number.isFinite(priceToSalesRatio)
  ) {
    if (priceToSalesRatio <= 5) score += 8;
    else if (priceToSalesRatio <= 10) score += 4;
  } else {
    score += 5;
  }

  if (status !== "ใกล้แนวต้าน" && status !== "Breakout") score += 10;

  const buyScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    buyScore,
    buyScoreLabel: getBuyZoneLabel(buyScore),
  };
}

export function getActionAmountLabel({
  buyScore,
  category,
  recommendation,
}: {
  buyScore: number;
  category: StockCategory;
  recommendation: StockRecommendation;
}) {
  if (
    buyScore < 40 ||
    recommendation === "ระวังไล่ราคา" ||
    recommendation === "ไม่ควรซื้อตอนนี้"
  ) {
    return "0-300 บาท";
  }

  if (buyScore >= 80) {
    if (category === "Growth") return "300-500 บาท";
    if (category === "ETF") return "500-800 บาท";
    return "500-700 บาท";
  }

  if (buyScore >= 60) {
    if (category === "Growth") return "200-300 บาท";
    return "300-500 บาท";
  }

  return "0-300 บาท";
}

// ─── DCA Planner ─────────────────────────────────────────────────────────────

function getDCAProfile(symbol: string, category: StockCategory) {
  const profiles: Record<
    string,
    { strategicRole: string; weight: number; allocationCap: number }
  > = {
    ANET: {
      strategicRole: "Main Growth Core",
      weight: 0.3,
      allocationCap: 0.15,
    },
    NVDA: {
      strategicRole: "Core AI",
      weight: 0.225,
      allocationCap: 0.2,
    },
    PLTR: {
      strategicRole: "Satellite AI",
      weight: 0.125,
      allocationCap: 0.08,
    },
    RKLB: {
      strategicRole: "High Risk Upside",
      weight: 0.1,
      allocationCap: 0.06,
    },
    VOO: {
      strategicRole: "ETF / กันชน",
      weight: 0.1,
      allocationCap: 0.35,
    },
    QQQM: {
      strategicRole: "ETF / กันชน",
      weight: 0.1,
      allocationCap: 0.35,
    },
    GOOGL: {
      strategicRole: "Existing Core",
      weight: 0.05,
      allocationCap: 0.25,
    },
    AAPL: {
      strategicRole: "Quality Core",
      weight: 0.1,
      allocationCap: 0.15,
    },
  };

  if (profiles[symbol]) return profiles[symbol];
  if (category === "ETF") {
    return {
      strategicRole: "ETF / กันชน",
      weight: 0.1,
      allocationCap: 0.35,
    };
  }
  if (category === "Growth") {
    return {
      strategicRole: "High Risk Upside",
      weight: 0.08,
      allocationCap: 0.06,
    };
  }
  if (category === "Blue Chip") {
    return {
      strategicRole: "Quality Core",
      weight: 0.1,
      allocationCap: 0.15,
    };
  }
  return {
    strategicRole: "Core Growth",
    weight: 0.1,
    allocationCap: 0.15,
  };
}

function roundDcaBudget(value: number) {
  if (value <= 0) return 0;
  return Math.round(value / 50) * 50;
}

export function calculateDCAAllocations(
  budget: number,
  holdings: PortfolioHolding[],
  watchlist: Array<{
    symbol: string;
    currentPrice: number;
    levels: SupportResistance;
    status: StockStatus;
    category: StockCategory;
    rsi14?: number | null;
    peRatio?: number | null;
    priceToSalesRatio?: number | null;
    netIncomeTtm?: number | null;
  }>,
  totalPortfolioValue: number
): DCARecommendation[] {
  const recommendations: DCARecommendation[] = [];
  const activeHoldings = holdings.filter((holding) => holding.shares > 0);
  const activeHoldingSymbols = new Set(
    activeHoldings.map((holding) => holding.symbol)
  );
  const heldStocks = watchlist.filter((stock) =>
    activeHoldingSymbols.has(stock.symbol)
  );

  const drafts = heldStocks.map((stock) => {
    const holding =
      activeHoldings.find((item) => item.symbol === stock.symbol) ?? null;
    const status = getStockStatus(stock.currentPrice, stock.levels);
    const recommendation = getRecommendation(
      status,
      holding,
      totalPortfolioValue,
      stock.category
    );
    const risk = getRiskLevel(stock.category, status);
    const profile = getDCAProfile(stock.symbol, stock.category);
    const allocationPercent =
      holding && totalPortfolioValue > 0
        ? ((holding.shares * holding.currentPrice) / totalPortfolioValue) * 100
        : 0;
    const isOverAllocated =
      allocationPercent > profile.allocationCap * 100 + 0.01;
    const isReady =
      !isOverAllocated &&
      (status === "ใกล้แนวรับ" || status === "เด้งจากแนวรับ");
    const { buyScore, buyScoreLabel } = calculateBuyZoneScore({
      status,
      rsi14: stock.rsi14,
      holding,
      totalPortfolioValue,
      category: stock.category,
      peRatio: stock.peRatio,
      priceToSalesRatio: stock.priceToSalesRatio,
      netIncomeTtm: stock.netIncomeTtm,
    });
    const actionAmountLabel = getActionAmountLabel({
      buyScore,
      category: stock.category,
      recommendation,
    });
    const buyZones = [...stock.levels.support];
    const zoneText = buyZones.map((price) => `$${price}`).join(" / ");

    let reason = "ราคายังไม่ถึงโซนซื้อ เก็บงบไว้เป็นเงินสด";
    if (isOverAllocated) {
      reason = `สัดส่วนพอร์ต ${allocationPercent.toFixed(
        1
      )}% สูงกว่าเป้าหมาย ${Math.round(profile.allocationCap * 100)}% พักการเติม`;
    } else if (status === "ใกล้แนวต้าน" || status === "Breakout") {
      reason = "ราคาใกล้แนวต้าน ไม่ไล่ราคา";
    } else if (status === "หลุดแนวรับ") {
      reason = "หลุดแนวรับแรก รอให้ราคาสร้างฐานก่อน";
    } else if (isReady) {
      reason =
        status === "เด้งจากแนวรับ"
          ? "ราคาเด้งจากโซนรับ ซื้อได้ตามงบที่วางไว้"
          : "ราคาเข้าใกล้โซนรับ ซื้อได้ตามงบที่วางไว้";
    }

    const condition =
      stock.category === "ETF"
        ? `ซื้อเฉพาะตอนตลาดย่อใกล้ ${zoneText}`
        : stock.symbol === "RKLB" || stock.category === "Growth"
          ? `ซื้อไม้เล็กเมื่อใกล้ ${zoneText}`
          : `ซื้อเมื่อใกล้ ${zoneText}`;

    return {
      symbol: stock.symbol,
      status,
      strategicRole: profile.strategicRole,
      condition,
      weight: isOverAllocated ? 0 : profile.weight,
      actionAmountLabel,
      buyScore,
      buyScoreLabel,
      targetPrice: stock.levels.support[0],
      buyZones,
      allocationPercent,
      targetAllocationPercent: profile.allocationCap * 100,
      isReady,
      reason,
      risk,
    };
  });

  const maxInvestableWeight = 0.85;
  const totalWeight = drafts.reduce((sum, draft) => sum + draft.weight, 0);
  const scale =
    totalWeight > maxInvestableWeight ? maxInvestableWeight / totalWeight : 1;

  for (const draft of drafts) {
    const plannedBudget = roundDcaBudget(budget * draft.weight * scale);
    recommendations.push({
      ...draft,
      plannedBudget,
      recommendedBudget: draft.isReady ? plannedBudget : 0,
    });
  }

  return recommendations.sort(
    (a, b) =>
      b.recommendedBudget - a.recommendedBudget ||
      b.plannedBudget - a.plannedBudget ||
      b.buyScore - a.buyScore
  );
}

// ─── Portfolio Calculations ───────────────────────────────────────────────────

export function calcPortfolioMetrics(holdings: PortfolioHolding[]) {
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.shares * h.currentPrice,
    0
  );
  const totalCost = holdings.reduce(
    (sum, h) => sum + h.shares * h.avgCost,
    0
  );
  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return { totalValue, totalCost, totalPnL, totalPnLPercent };
}

export function calcHoldingMetrics(h: PortfolioHolding) {
  const currentValue = h.shares * h.currentPrice;
  const costBasis = h.shares * h.avgCost;
  const pnl = currentValue - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { currentValue, costBasis, pnl, pnlPercent };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatCurrency(
  value: number,
  currency: "USD" | "THB" = "USD"
): string {
  if (currency === "THB") {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

export const DEFAULT_USD_THB_RATE = 32.49;

export function formatOptionalNumber(
  value: number | null | undefined,
  decimals = 2
): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(decimals)
    : "N/A";
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCompactCurrency(
  value: number | null | undefined,
  currency: "USD" | "THB" = "USD"
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat(currency === "THB" ? "th-TH" : "en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPeRatio(
  value: number | null | undefined,
  netIncomeTtm?: number | null,
  category?: StockCategory
): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value.toFixed(1)}x`;
  }
  if (category === "ETF") return "ETF";
  if (typeof netIncomeTtm === "number" && netIncomeTtm <= 0) return "Loss";
  return "N/A";
}

export function formatMultiple(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(1)}x`
    : "N/A";
}

// ─── localStorage Helpers ─────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  PORTFOLIO: "stock_dashboard_portfolio",
  WATCHLIST: "stock_dashboard_watchlist",
  LOG: "stock_dashboard_log",
} as const;

export function saveToStorage<T>(key: keyof typeof STORAGE_KEYS, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
  } catch (e) {
    console.error("localStorage save failed", e);
  }
}

export function loadFromStorage<T>(
  key: keyof typeof STORAGE_KEYS,
  fallback: T
): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Color helpers ────────────────────────────────────────────────────────────

export function getPnLColor(value: number): string {
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-red-400";
  return "text-slate-400";
}

export function getStatusColor(status: StockStatus): string {
  switch (status) {
    case "ใกล้แนวรับ":
    case "เด้งจากแนวรับ":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "หลุดแนวรับ":
      return "text-red-400 bg-red-400/10 border-red-400/30";
    case "ใกล้แนวต้าน":
    case "Breakout":
      return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    default:
      return "text-slate-400 bg-slate-400/10 border-slate-400/30";
  }
}

export function getRecommendationColor(rec: StockRecommendation): string {
  switch (rec) {
    case "ซื้อไม้เล็ก":
      return "text-emerald-400";
    case "ถือ":
      return "text-blue-400";
    case "รอซื้อ":
      return "text-slate-400";
    case "ระวังไล่ราคา":
    case "ไม่ควรซื้อตอนนี้":
      return "text-amber-400";
    default:
      return "text-slate-400";
  }
}

export function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case "ต่ำ":
      return "text-emerald-400 bg-emerald-400/10";
    case "กลาง":
      return "text-amber-400 bg-amber-400/10";
    case "สูง":
      return "text-red-400 bg-red-400/10";
  }
}

export function getBuyScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
  if (score >= 60) return "text-blue-400 bg-blue-400/10 border-blue-400/30";
  if (score >= 40) return "text-amber-400 bg-amber-400/10 border-amber-400/30";
  return "text-red-400 bg-red-400/10 border-red-400/30";
}

export function getRsiColor(rsi: number | null | undefined): string {
  if (rsi === null || rsi === undefined) return "text-slate-500";
  if (rsi > 70) return "text-red-400";
  if (rsi >= 55) return "text-emerald-400";
  if (rsi >= 40) return "text-amber-400";
  if (rsi < 35) return "text-cyan-400";
  return "text-blue-300";
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
