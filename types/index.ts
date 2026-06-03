export type StockStatus =
  | "ใกล้แนวรับ"
  | "หลุดแนวรับ"
  | "ใกล้แนวต้าน"
  | "Breakout"
  | "รอดู"
  | "เด้งจากแนวรับ";

export type StockRecommendation =
  | "รอซื้อ"
  | "ซื้อไม้เล็ก"
  | "ถือ"
  | "ระวังไล่ราคา"
  | "ไม่ควรซื้อตอนนี้";

export type RiskLevel = "ต่ำ" | "กลาง" | "สูง";
export type BuyZoneLabel = "น่าเก็บ" | "ไม้เล็ก" | "รอดู" | "อย่าไล่";

export type InvestmentStatus = "planned" | "executed" | "skipped";
export type TradeAction = "buy" | "sell";

export type StockCategory = "ETF" | "Tech" | "Growth" | "Blue Chip";

export interface SupportResistance {
  support: [number, number, number];
  resistance: [number, number, number];
}

export interface FundamentalMetrics {
  marketCap?: number;
  peRatio?: number | null;
  forwardPeRatio?: number | null;
  priceToSalesRatio?: number | null;
  priceToBookRatio?: number | null;
  epsTtm?: number | null;
  totalRevenueTtm?: number | null;
  netIncomeTtm?: number | null;
  operatingCashFlowTtm?: number | null;
  freeCashFlowTtm?: number | null;
  totalDebt?: number | null;
  stockholdersEquity?: number | null;
  grossMarginPercent?: number | null;
  netMarginPercent?: number | null;
  freeCashFlowMarginPercent?: number | null;
  freeCashFlowYieldPercent?: number | null;
  debtToEquityPercent?: number | null;
  revenueGrowthYoYPercent?: number | null;
  earningsGrowthYoYPercent?: number | null;
  fundamentalsAsOf?: string;
  fundamentalsSource?: string;
}

export interface TechnicalMetrics {
  sma20?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  distanceFrom52WeekHighPercent?: number | null;
}

export interface StockWatchlistItem extends FundamentalMetrics, TechnicalMetrics {
  symbol: string;
  companyName: string;
  currentPrice: number;
  previousClose: number;
  changePercent: number;
  changeAmount?: number;
  currency?: string;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  rsi14?: number | null;
  marketTime?: string;
  quoteUpdatedAt?: string;
  dataSource?: string;
  priceHistory?: PricePoint[];
  levels: SupportResistance;
  status: StockStatus;
  recommendation: StockRecommendation;
  category: StockCategory;
  notes?: string;
}

export interface PortfolioHolding extends FundamentalMetrics, TechnicalMetrics {
  symbol: string;
  companyName: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  previousClose?: number;
  changePercent?: number;
  rsi14?: number | null;
  quoteUpdatedAt?: string;
  dataSource?: string;
  allocationPercent: number;
  category: StockCategory;
}

export interface Portfolio {
  holdings: PortfolioHolding[];
  cashBalance: number;
  totalInvested: number;
}

export interface InvestmentLogEntry {
  id: string;
  date: string;
  symbol: string;
  amount: number;
  targetPrice: number;
  actualPrice?: number;
  action?: TradeAction;
  shares?: number;
  exchangeRate?: number;
  realizedPnL?: number;
  reason: string;
  status: InvestmentStatus;
  notes?: string;
}

export interface ExecuteTradeInput {
  action: TradeAction;
  date?: string;
  symbol: string;
  companyName: string;
  category: StockCategory;
  amountThb: number;
  priceUsd: number;
  exchangeRate: number;
  reason: string;
  notes?: string;
}

export interface DailyBudgetInput {
  date: string;
  budget: number;
  currency: "THB" | "USD";
}

export interface DCARecommendation {
  symbol: string;
  status: StockStatus;
  recommendedBudget: number;
  actionAmountLabel: string;
  buyScore: number;
  buyScoreLabel: BuyZoneLabel;
  targetPrice: number;
  reason: string;
  risk: RiskLevel;
}

export interface PricePoint {
  date: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface MarketSnapshot extends FundamentalMetrics, TechnicalMetrics {
  symbol: string;
  companyName: string;
  currentPrice: number;
  previousClose: number;
  changeAmount: number;
  changePercent: number;
  currency: string;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  rsi14?: number | null;
  levels?: SupportResistance;
  marketTime?: string;
  quoteUpdatedAt: string;
  source: string;
  priceHistory: PricePoint[];
}

export interface MarketApiResponse {
  data: MarketSnapshot[];
  errors: Array<{ symbol: string; message: string }>;
  updatedAt: string;
  source: string;
}

export interface MarketSyncStatus {
  isLoading: boolean;
  error?: string;
  updatedAt?: string;
  source?: string;
  refreshIntervalMs?: number;
}
