export interface PriceHistoryItem {
  time: string; // ISO string or short time string
  timestamp: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  // Computed indicators for visualization
  sma9?: number;
  sma21?: number;
  sma50?: number;
  sma200?: number;
  rsi?: number;
  bbUpper?: number;
  bbLower?: number;
  bbBasis?: number;
}

export enum TokenSymbol {
  MGC = "MGC",
  MES = "MES",
}

export interface TokenConfig {
  symbol: TokenSymbol;
  name: string;
  description: string;
  initialPrice: number;
  volatility: number; // base volatility multiplier
  trendBias: number; // upward trend factor
  liquidity: number; // standard order volume multiplier
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface Position {
  symbol: TokenSymbol;
  amount: number;
  averageBuyPrice: number;
}

export interface TradeRecord {
  id: string;
  timestamp: number;
  symbol: TokenSymbol;
  type: "BUY" | "SELL";
  price: number;
  amount: number;
  totalValue: number;
  strategyUsed?: string;
}

export interface Portfolio {
  balanceUSD: number;
  positions: { [key in TokenSymbol]: Position };
  history: TradeRecord[];
}

export enum StrategyType {
  SMA_CROSSOVER = "SMA_CROSSOVER",
  RSI_OSCILLATOR = "RSI_OSCILLATOR",
  BOLLINGER_BANDS = "BOLLINGER_BANDS",
  GRID_TRADING = "GRID_TRADING",
}

export interface StrategyConfig {
  type: StrategyType;
  name: string;
  description: string;
  parameters: {
    [key: string]: {
      name: string;
      value: number;
      min: number;
      max: number;
      step: number;
      description: string;
    };
  };
}

export interface BacktestLog {
  timestamp: number;
  type: "BUY" | "SELL";
  price: number;
  amount: number;
  cashRemaining: number;
  tokensHeld: number;
  portfolioValue: number;
  reason: string;
}

export interface BacktestResult {
  initialCapital: number;
  finalValue: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  totalTrades: number;
  logs: BacktestLog[];
}
