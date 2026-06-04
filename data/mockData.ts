import {
  StockWatchlistItem,
  Portfolio,
  InvestmentLogEntry,
  PricePoint,
  StockRecommendation,
  StockStatus,
} from "@/types";
import { buildDimeSeedData } from "./dimeSeedData";

const DEFAULT_WATCHLIST_STATUS = "watch" as StockStatus;
const DEFAULT_WATCHLIST_RECOMMENDATION = "wait" as StockRecommendation;

export const mockWatchlist: StockWatchlistItem[] = [
  {
    symbol: "GOOGL",
    companyName: "Alphabet Inc. Class A",
    currentPrice: 376.37,
    previousClose: 380.34,
    changePercent: -1.04,
    levels: {
      support: [365.1, 350.3, 339.3],
      resistance: [380.3, 383, 385.7],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "Tech",
    notes: "",
  },
  {
    symbol: "VOO",
    companyName: "Vanguard S&P 500 ETF",
    currentPrice: 697.3,
    previousClose: 695.49,
    changePercent: 0.26,
    levels: {
      support: [695, 690, 683],
      resistance: [718, 753, 802],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "ETF",
    notes: "",
  },
  {
    symbol: "NVDA",
    companyName: "NVIDIA Corporation",
    currentPrice: 224.36,
    previousClose: 211.14,
    changePercent: 6.26,
    levels: {
      support: [223.5, 220.8, 219.4],
      resistance: [225.3, 231.1, 235.7],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "Tech",
    notes: "",
  },
  {
    symbol: "AAPL",
    companyName: "Apple Inc.",
    currentPrice: 306.31,
    previousClose: 312.06,
    changePercent: -1.84,
    levels: {
      support: [305, 302.3, 300.2],
      resistance: [308.3, 310.9, 315.5],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "Blue Chip",
    notes: "",
  },
  {
    symbol: "RKLB",
    companyName: "Rocket Lab USA, Inc.",
    currentPrice: 122.39,
    previousClose: 143.48,
    changePercent: -14.7,
    levels: {
      support: [118.7, 117.6, 113.8],
      resistance: [124.2, 125.4, 127.3],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "Growth",
    notes: "",
  },
  {
    symbol: "ANET",
    companyName: "Arista Networks, Inc.",
    currentPrice: 154.31,
    previousClose: 155.7,
    changePercent: -0.89,
    levels: {
      support: [150.2, 145.4, 140.4],
      resistance: [158.9, 164.9, 172.5],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "Tech",
    notes: "Watching cloud networking / AI data center demand",
  },
  {
    symbol: "PLTR",
    companyName: "Palantir Technologies Inc.",
    currentPrice: 160.65,
    previousClose: 156.54,
    changePercent: 2.63,
    levels: {
      support: [156.5, 152.6, 149.4],
      resistance: [160.8, 165.5, 173.5],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "Tech",
    notes: "Watching AI/data platform momentum",
  },
  {
    symbol: "ASTS",
    companyName: "AST SpaceMobile, Inc.",
    currentPrice: 105.65,
    previousClose: 113.41,
    changePercent: -6.84,
    levels: {
      support: [102.5, 98.25, 96.23],
      resistance: [105.9, 108.8, 113.4],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "Growth",
    notes: "Watching satellite connectivity growth",
  },
  {
    symbol: "NOW",
    companyName: "ServiceNow, Inc.",
    currentPrice: 135.86,
    previousClose: 124.37,
    changePercent: 9.24,
    levels: {
      support: [131.8, 126.3, 124.4],
      resistance: [139.9, 146.7, 156.2],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "Tech",
    notes: "Watching enterprise software trend",
  },
  {
    symbol: "IREN",
    companyName: "IREN Limited",
    currentPrice: 65.33,
    previousClose: 63.54,
    changePercent: 2.82,
    levels: {
      support: [64.05, 63.54, 61.2],
      resistance: [67.29, 67.84, 70.56],
    },
    status: DEFAULT_WATCHLIST_STATUS,
    recommendation: DEFAULT_WATCHLIST_RECOMMENDATION,
    category: "Growth",
    notes: "Watching AI infrastructure / bitcoin mining exposure",
  },
];

const dimeSeedData = buildDimeSeedData(mockWatchlist);

export const mockPortfolio: Portfolio = dimeSeedData.portfolio;
export const mockInvestmentLog: InvestmentLogEntry[] =
  dimeSeedData.investmentLog;
function generateMockPrices(
  basePrice: number,
  days: number = 60,
  volatility: number = 0.02
): PricePoint[] {
  const points: PricePoint[] = [];
  let price = basePrice * 0.92;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.48) * volatility * price;
    price = Math.max(price + change, basePrice * 0.7);
    points.push({
      date: date.toISOString().split("T")[0],
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 5000000 + 1000000),
    });
  }
  return points;
}

export const mockPriceHistory: Record<string, PricePoint[]> = {
  GOOGL: generateMockPrices(376.37, 60, 0.018),
  VOO: generateMockPrices(697.3, 60, 0.012),
  NVDA: generateMockPrices(224.36, 60, 0.025),
  AAPL: generateMockPrices(306.31, 60, 0.015),
  RKLB: generateMockPrices(122.39, 60, 0.035),
  ANET: generateMockPrices(154.31, 60, 0.025),
  PLTR: generateMockPrices(160.65, 60, 0.03),
  ASTS: generateMockPrices(105.65, 60, 0.045),
  NOW: generateMockPrices(135.86, 60, 0.025),
  IREN: generateMockPrices(65.33, 60, 0.05),
};

export const ALLOCATION_COLORS: Record<string, string> = {
  GOOGL: "#60a5fa",
  VOO: "#34d399",
  NVDA: "#a78bfa",
  AAPL: "#f9a8d4",
  RKLB: "#fb923c",
  ANET: "#2dd4bf",
  PLTR: "#38bdf8",
  ASTS: "#22c55e",
  NOW: "#818cf8",
  IREN: "#f97316",
};


