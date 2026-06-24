import React, { useState, useEffect, useRef } from "react";
import {
  TokenSymbol,
  TokenConfig,
  PriceHistoryItem,
  Portfolio,
  TradeRecord,
  StrategyType,
  StrategyConfig,
  BacktestResult,
  OrderBook,
} from "./types";
import {
  generateInitialHistory,
  simulatePriceTick,
  runBacktest,
  generateOrderBook,
  computeIndicators,
} from "./utils";
import TokenChart from "./components/TokenChart";
import OrderBookComponent from "./components/OrderBookComponent";
import TradingPanel from "./components/TradingPanel";
import StrategiesGuide from "./components/StrategiesGuide";
import {
  getOrCreateUserId,
  savePortfolioToDb,
  loadPortfolioFromDb,
  saveLimitOrdersToDb,
  loadLimitOrdersFromDb,
} from "./firebase";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Settings,
  DollarSign,
  Wallet,
  BookOpen,
  Cpu,
  History,
  BarChart3,
  Loader2,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

// Token presets
const TOKEN_PRESETS: { [key in TokenSymbol]: TokenConfig } = {
  [TokenSymbol.MGC]: {
    symbol: TokenSymbol.MGC,
    name: "MetaGold Coin",
    description: "Decentralized gold peg and algorithmic store of value with high liquidity.",
    initialPrice: 2.4582,
    volatility: 1.8,
    trendBias: 0.012,
    liquidity: 1.2,
  },
  [TokenSymbol.MES]: {
    symbol: TokenSymbol.MES,
    name: "MetaEnergy Share",
    description: "Eco-decentralized utility token for virtual power grids and carbon offset swaps.",
    initialPrice: 0.8921,
    volatility: 2.8,
    trendBias: -0.005,
    liquidity: 0.9,
  },
};

// Strategy Config presets
const STRATEGY_PRESETS: StrategyConfig[] = [
  {
    type: StrategyType.SMA_CROSSOVER,
    name: "SMA Golden Cross",
    description: "Buy when the fast 9-period SMA crosses above the slow 21-period SMA. Sell when it crosses below.",
    parameters: {
      allocationPct: { name: "Allocation %", value: 100, min: 10, max: 100, step: 10, description: "Capital per trade" },
    },
  },
  {
    type: StrategyType.RSI_OSCILLATOR,
    name: "RSI Mean Reversion",
    description: "Buy when the RSI indicator recovers above 30 (oversold boundary). Sell when RSI falls back below 70 (overbought boundary).",
    parameters: {
      oversold: { name: "Oversold Boundary", value: 30, min: 15, max: 45, step: 5, description: "Buy threshold" },
      overbought: { name: "Overbought Boundary", value: 70, min: 55, max: 85, step: 5, description: "Sell threshold" },
      allocationPct: { name: "Allocation %", value: 100, min: 10, max: 100, step: 10, description: "Capital per trade" },
    },
  },
  {
    type: StrategyType.BOLLINGER_BANDS,
    name: "Bollinger Bands Mean Reversion",
    description: "Buy when price crosses below the lower band. Sell when price pierces above the upper band.",
    parameters: {
      allocationPct: { name: "Allocation %", value: 100, min: 10, max: 100, step: 10, description: "Capital per trade" },
    },
  },
  {
    type: StrategyType.GRID_TRADING,
    name: "Range Grid Trading",
    description: "Grid buy when price pulls back -1.5% below recent 20-candle basis. Grid sell when it rallies +1.5% above the basis.",
    parameters: {
      gridInterval: { name: "Grid Interval %", value: 1.5, min: 0.5, max: 5.0, step: 0.1, description: "Grid offset margin" },
      allocationPct: { name: "Allocation %", value: 50, min: 10, max: 100, step: 10, description: "Capital per grid slice" },
    },
  },
];

export default function App() {
  // Active token
  const [activeToken, setActiveToken] = useState<TokenSymbol>(TokenSymbol.MGC);

  // Timeframe and feed source selections
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");
  const [feedSource, setFeedSource] = useState<"BINANCE" | "SIMULATOR">("BINANCE");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Market Price histories
  const [histories, setHistories] = useState<{ [key in TokenSymbol]: PriceHistoryItem[] }>({
    [TokenSymbol.MGC]: generateInitialHistory(TOKEN_PRESETS.MGC.initialPrice, TOKEN_PRESETS.MGC.volatility, TOKEN_PRESETS.MGC.trendBias, 100, "24h"),
    [TokenSymbol.MES]: generateInitialHistory(TOKEN_PRESETS.MES.initialPrice, TOKEN_PRESETS.MES.volatility, TOKEN_PRESETS.MES.trendBias, 100, "24h"),
  });

  // Real-time stats (prices, 24h volumes, market caps)
  const [marketStats, setMarketStats] = useState<{
    [key in TokenSymbol]: {
      price: number;
      volumeUSD: number;
      marketCapUSD: number;
      priceChange24hPct: number;
      isLive: boolean;
    }
  }>({
    [TokenSymbol.MGC]: {
      price: TOKEN_PRESETS.MGC.initialPrice,
      volumeUSD: 1450000,
      marketCapUSD: TOKEN_PRESETS.MGC.initialPrice * 12500000,
      priceChange24hPct: 1.85,
      isLive: false,
    },
    [TokenSymbol.MES]: {
      price: TOKEN_PRESETS.MES.initialPrice,
      volumeUSD: 720000,
      marketCapUSD: TOKEN_PRESETS.MES.initialPrice * 48000000,
      priceChange24hPct: -0.42,
      isLive: false,
    },
  });

  // Dynamic user control adjustments
  const [volatility, setVolatility] = useState<number>(TOKEN_PRESETS[TokenSymbol.MGC].volatility);
  const [trendBias, setTrendBias] = useState<number>(TOKEN_PRESETS[TokenSymbol.MGC].trendBias);

  // Synchronize dynamic control sliders when changing active token
  useEffect(() => {
    setVolatility(TOKEN_PRESETS[activeToken].volatility);
    setTrendBias(TOKEN_PRESETS[activeToken].trendBias);
  }, [activeToken]);

  // Order books
  const [orderBooks, setOrderBooks] = useState<{ [key in TokenSymbol]: OrderBook }>({
    [TokenSymbol.MGC]: generateOrderBook(TOKEN_PRESETS.MGC.initialPrice),
    [TokenSymbol.MES]: generateOrderBook(TOKEN_PRESETS.MES.initialPrice),
  });

  // Interactive Chart active indicators
  const [activeIndicators, setActiveIndicators] = useState({
    sma9: true,
    sma21: true,
    sma50: true,
    sma200: true,
    bb: true,
    rsi: true,
  });

  // Paper Trading Account / Portfolio State
  const [portfolio, setPortfolio] = useState<Portfolio>({
    balanceUSD: 10000,
    positions: {
      [TokenSymbol.MGC]: { symbol: TokenSymbol.MGC, amount: 0, averageBuyPrice: 0 },
      [TokenSymbol.MES]: { symbol: TokenSymbol.MES, amount: 0, averageBuyPrice: 0 },
    },
    history: [],
  });

  // Pending Limit Orders list
  interface LimitOrder {
    id: string;
    symbol: TokenSymbol;
    type: "BUY" | "SELL";
    targetPrice: number;
    amount: number;
    stopLossPct?: number;
    takeProfitPct?: number;
  }
  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>([]);

  // Initialize and persist Firebase state
  const userId = getOrCreateUserId();

  useEffect(() => {
    const initFirebase = async () => {
      try {
        const dbPortfolio = await loadPortfolioFromDb(userId);
        if (dbPortfolio) {
          setPortfolio(dbPortfolio);
        }
        const dbLimitOrders = await loadLimitOrdersFromDb(userId);
        if (dbLimitOrders) {
          setLimitOrders(dbLimitOrders);
        }
      } catch (err) {
        console.error("Failed to load initial state from Firebase:", err);
      }
    };
    initFirebase();
  }, [userId]);

  // Synchronize local portfolio changes to Firestore
  useEffect(() => {
    if (portfolio) {
      savePortfolioToDb(userId, portfolio).catch((err) => 
        console.error("Failed to save portfolio to Firebase:", err)
      );
    }
  }, [portfolio, userId]);

  // Synchronize local limit orders changes to Firestore
  useEffect(() => {
    if (limitOrders) {
      saveLimitOrdersToDb(userId, limitOrders).catch((err) => 
        console.error("Failed to save limit orders to Firebase:", err)
      );
    }
  }, [limitOrders, userId]);

  // Backtesting module states
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(StrategyType.SMA_CROSSOVER);
  const [strategyParams, setStrategyParams] = useState<{ [key: string]: number }>({
    allocationPct: 100,
  });
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  // AI strategy coach inputs and result
  const [customQuery, setCustomQuery] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Initialize selected strategy params when selected strategy changes
  useEffect(() => {
    const config = STRATEGY_PRESETS.find((s) => s.type === selectedStrategy);
    if (config) {
      const initialParams: { [key: string]: number } = {};
      Object.keys(config.parameters).forEach((key) => {
        initialParams[key] = config.parameters[key].value;
      });
      setStrategyParams(initialParams);
    }
  }, [selectedStrategy]);

  // Timer Ref for live data updates
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tickerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch real-time market data from Binance (every 15s)
  const fetchRealTimeTickers = async () => {
    try {
      const resMGC = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT");
      const dataMGC = await resMGC.json();

      const resMES = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=POWRUSDT");
      const dataMES = await resMES.json();

      const priceMGC = parseFloat(dataMGC.lastPrice) * 0.00125;
      const volumeMGC = parseFloat(dataMGC.quoteVolume);
      const pctMGC = parseFloat(dataMGC.priceChangePercent);

      const priceMES = parseFloat(dataMES.lastPrice) * 2.5;
      const volumeMES = parseFloat(dataMES.quoteVolume);
      const pctMES = parseFloat(dataMES.priceChangePercent);

      setMarketStats({
        [TokenSymbol.MGC]: {
          price: priceMGC,
          volumeUSD: volumeMGC,
          marketCapUSD: priceMGC * 12500000,
          priceChange24hPct: pctMGC,
          isLive: true,
        },
        [TokenSymbol.MES]: {
          price: priceMES,
          volumeUSD: volumeMES,
          marketCapUSD: priceMES * 48000000,
          priceChange24hPct: pctMES,
          isLive: true,
        },
      });

      // Synchronize active chart history with the latest ticking spot price
      setHistories((prev) => {
        const nextMGC = [...prev[TokenSymbol.MGC]];
        const nextMES = [...prev[TokenSymbol.MES]];

        if (nextMGC.length > 0) {
          const last = nextMGC[nextMGC.length - 1];
          last.price = priceMGC;
          last.close = priceMGC;
          last.high = Math.max(last.high, priceMGC);
          last.low = Math.min(last.low, priceMGC);
        }
        if (nextMES.length > 0) {
          const last = nextMES[nextMES.length - 1];
          last.price = priceMES;
          last.close = priceMES;
          last.high = Math.max(last.high, priceMES);
          last.low = Math.min(last.low, priceMES);
        }

        handleTriggerChecks(priceMGC, priceMES);

        return {
          [TokenSymbol.MGC]: computeIndicators(nextMGC),
          [TokenSymbol.MES]: computeIndicators(nextMES),
        };
      });

      setOrderBooks({
        [TokenSymbol.MGC]: generateOrderBook(priceMGC),
        [TokenSymbol.MES]: generateOrderBook(priceMES),
      });

    } catch (err) {
      console.warn("Binance API tick fetch failed, using simulated ticks as backing:", err);
    }
  };

  // Fetch full historical candles for active token and timeframe
  const loadHistory = async (tfToLoad: "24h" | "7d" | "30d") => {
    setIsHistoryLoading(true);
    try {
      const binanceSymbol = activeToken === TokenSymbol.MGC ? "PAXGUSDT" : "POWRUSDT";
      const scale = activeToken === TokenSymbol.MGC ? 0.00125 : 2.5;

      let interval = "15m";
      let limit = 220; // 220 points ensures we have enough points for computing SMA 200!
      if (tfToLoad === "7d") {
        interval = "1h";
      } else if (tfToLoad === "30d") {
        interval = "4h";
      }

      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`);
      if (!res.ok) throw new Error("API call error");
      const klines = await res.json();

      const parsedHistory: PriceHistoryItem[] = klines.map((k: any) => {
        const timestamp = k[0];
        const open = parseFloat(k[1]) * scale;
        const high = parseFloat(k[2]) * scale;
        const low = parseFloat(k[3]) * scale;
        const close = parseFloat(k[4]) * scale;
        const quoteVolume = parseFloat(k[7]); // quote volume in USD

        return {
          time: new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            ...(tfToLoad !== "24h" ? { month: "short", day: "numeric" } : {})
          }),
          timestamp,
          price: Number(close.toFixed(4)),
          open: Number(open.toFixed(4)),
          close: Number(close.toFixed(4)),
          high: Number(high.toFixed(4)),
          low: Number(low.toFixed(4)),
          volume: Math.floor(quoteVolume / 100000),
        };
      });

      const updatedHistory = computeIndicators(parsedHistory);
      setHistories((prev) => ({
        ...prev,
        [activeToken]: updatedHistory,
      }));

      // Update spot price details immediately from the historical close
      const lastClose = updatedHistory[updatedHistory.length - 1].price;
      setMarketStats((prev) => {
        const currentStats = prev[activeToken];
        return {
          ...prev,
          [activeToken]: {
            ...currentStats,
            price: lastClose,
            marketCapUSD: lastClose * (activeToken === TokenSymbol.MGC ? 12500000 : 48000000),
          }
        };
      });

    } catch (error) {
      console.warn("Binance klines fetch failed, generating local fallback history:", error);
      setHistories((prev) => {
        const currentPrice = marketStats[activeToken].price;
        const fallbackHistory = generateInitialHistory(
          currentPrice,
          volatility,
          trendBias,
          100,
          tfToLoad
        );
        return {
          ...prev,
          [activeToken]: fallbackHistory,
        };
      });
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Handle changes in activeToken or timeframe to load history
  useEffect(() => {
    if (feedSource === "BINANCE") {
      loadHistory(timeframe);
    }
  }, [activeToken, timeframe, feedSource]);

  // Set up real-time tick timers
  useEffect(() => {
    // 1. If feedSource is BINANCE, poll every 15s
    if (feedSource === "BINANCE") {
      fetchRealTimeTickers(); // immediate load
      tickerIntervalRef.current = setInterval(() => {
        fetchRealTimeTickers();
      }, 15000);
    }

    // 2. If feedSource is SIMULATOR, run tick steps every 3s
    if (feedSource === "SIMULATOR") {
      timerRef.current = setInterval(() => {
        setHistories((prev) => {
          const nextMGC = simulatePriceTick(prev.MGC, volatility, trendBias);
          const nextMES = simulatePriceTick(prev.MES, volatility, trendBias);

          const mgcPrice = nextMGC[nextMGC.length - 1].price;
          const mesPrice = nextMES[nextMES.length - 1].price;

          // Sync marketStats
          setMarketStats((current) => ({
            [TokenSymbol.MGC]: {
              price: mgcPrice,
              volumeUSD: current.MGC.volumeUSD + Math.floor(Math.random() * 5000),
              marketCapUSD: mgcPrice * 12500000,
              priceChange24hPct: ((mgcPrice - nextMGC[0].price) / nextMGC[0].price) * 100,
              isLive: false,
            },
            [TokenSymbol.MES]: {
              price: mesPrice,
              volumeUSD: current.MES.volumeUSD + Math.floor(Math.random() * 3000),
              marketCapUSD: mesPrice * 48000000,
              priceChange24hPct: ((mesPrice - nextMES[0].price) / nextMES[0].price) * 100,
              isLive: false,
            },
          }));

          // Trigger checks
          handleTriggerChecks(mgcPrice, mesPrice);

          // Update order books
          setOrderBooks({
            [TokenSymbol.MGC]: generateOrderBook(mgcPrice),
            [TokenSymbol.MES]: generateOrderBook(mesPrice),
          });

          return {
            [TokenSymbol.MGC]: nextMGC,
            [TokenSymbol.MES]: nextMES,
          };
        });
      }, 3000);
    }

    return () => {
      if (tickerIntervalRef.current) clearInterval(tickerIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [feedSource, volatility, trendBias, limitOrders, portfolio]);

  // Check limit orders and active guardrails (SL/TP)
  const handleTriggerChecks = (mgcPrice: number, mesPrice: number) => {
    // 1. Check Limit Orders
    const triggeredOrders: LimitOrder[] = [];
    const remainingOrders = limitOrders.filter((order) => {
      const lastPrice = order.symbol === TokenSymbol.MGC ? mgcPrice : mesPrice;
      const isTriggered =
        order.type === "BUY" ? lastPrice <= order.targetPrice : lastPrice >= order.targetPrice;

      if (isTriggered) {
        triggeredOrders.push(order);
        return false;
      }
      return true;
    });

    if (triggeredOrders.length > 0) {
      setLimitOrders(remainingOrders);
      triggeredOrders.forEach((order) => {
        executeDirectTrade(order.symbol, order.type, order.targetPrice, order.amount);
      });
    }

    // 2. Check Guardrails for existing positions
    Object.values(TokenSymbol).forEach((sym) => {
      const pos = portfolio.positions[sym];
      if (pos.amount > 0) {
        const lastPrice = sym === TokenSymbol.MGC ? mgcPrice : mesPrice;
        // Find if we have recent trade with stop loss / take profit
        const activeTrades = portfolio.history.filter((t) => t.symbol === sym && t.type === "BUY");
        if (activeTrades.length > 0) {
          const lastBuy = activeTrades[activeTrades.length - 1];
          // Simple mock representation: if price swings past boundaries, trigger market exit
          // Let's assume a standard 5% stop loss and 15% take profit is enabled
          const entryPrice = pos.averageBuyPrice;
          const lossPrice = entryPrice * 0.95; // 5% drop
          const targetProfitPrice = entryPrice * 1.15; // 15% rally

          if (lastPrice <= lossPrice) {
            // Trigger Stop Loss
            executeDirectTrade(sym, "SELL", lastPrice, pos.amount, "Stop-Loss triggered");
          } else if (lastPrice >= targetProfitPrice) {
            // Trigger Take Profit
            executeDirectTrade(sym, "SELL", lastPrice, pos.amount, "Take-Profit triggered");
          }
        }
      }
    });
  };

  // Execute direct paper trade
  const executeDirectTrade = (
    sym: TokenSymbol,
    type: "BUY" | "SELL",
    price: number,
    amount: number,
    note?: string
  ) => {
    setPortfolio((prev) => {
      const balance = prev.balanceUSD;
      const pos = prev.positions[sym] || { amount: 0, averageBuyPrice: 0 };
      const totalValue = amount * price;

      let nextBalance = balance;
      let nextAmount = pos.amount;
      let nextAvgBuyPrice = pos.averageBuyPrice;

      if (type === "BUY") {
        if (balance >= totalValue) {
          nextBalance -= totalValue;
          const newAmount = pos.amount + amount;
          nextAvgBuyPrice = (pos.amount * pos.averageBuyPrice + totalValue) / newAmount;
          nextAmount = newAmount;
        } else {
          return prev; // Insufficient cash
        }
      } else {
        if (pos.amount >= amount) {
          nextBalance += totalValue;
          nextAmount = pos.amount - amount;
          if (nextAmount === 0) {
            nextAvgBuyPrice = 0;
          }
        } else {
          return prev; // Insufficient tokens
        }
      }

      const record: TradeRecord = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        symbol: sym,
        type,
        price,
        amount,
        totalValue,
        strategyUsed: note || "Manual order",
      };

      return {
        balanceUSD: Number(nextBalance.toFixed(2)),
        positions: {
          ...prev.positions,
          [sym]: {
            symbol: sym,
            amount: Number(nextAmount.toFixed(4)),
            averageBuyPrice: Number(nextAvgBuyPrice.toFixed(4)),
          },
        },
        history: [record, ...prev.history].slice(0, 50), // keep last 50
      };
    });
  };

  // Trade submission callback from TradingPanel
  const handleTradingPanelSubmit = (
    type: "BUY" | "SELL",
    price: number,
    amount: number,
    slPct?: number,
    tpPct?: number
  ) => {
    // If we're setting a limit order in limit tab, add to pending list.
    // TradingPanel identifies limits internally and updates trigger price input, we just check here.
    const lastPrice = histories[activeToken][histories[activeToken].length - 1].price;
    const isLimit = Math.abs(price - lastPrice) / lastPrice > 0.001; // more than 0.1% off current price is a Limit Order

    if (isLimit) {
      const newLimit: LimitOrder = {
        id: `limit_${Date.now()}`,
        symbol: activeToken,
        type,
        targetPrice: price,
        amount,
        stopLossPct: slPct,
        takeProfitPct: tpPct,
      };
      setLimitOrders((prev) => [newLimit, ...prev]);
    } else {
      executeDirectTrade(activeToken, type, price, amount, "Manual Market Order");
    }
  };

  // Run backtester
  const handleRunBacktest = () => {
    setIsBacktesting(true);
    // Simulate latency
    setTimeout(() => {
      const history = histories[activeToken];
      const result = runBacktest(history, selectedStrategy, strategyParams);
      setBacktestResult(result);
      setIsBacktesting(false);
    }, 600);
  };

  // Fetch AI Strategy coaching from server
  const handleAskAiCoach = async (queryText?: string) => {
    const query = queryText || customQuery || "Analyze this token trend and recommend risk parameters.";
    if (!query.trim()) return;

    setIsAiLoading(true);
    setAiAnalysis("");

    try {
      const activeHist = histories[activeToken] || [];
      const latestPrice = activeHist.length > 0 ? activeHist[activeHist.length - 1] : {
        price: marketStats[activeToken].price,
        sma9: undefined,
        sma21: undefined,
        rsi: undefined,
        bbUpper: undefined,
        bbLower: undefined,
      };

      // Package up current indicator values for the prompt
      const indicators = {
        price: latestPrice.price,
        sma9: latestPrice.sma9,
        sma21: latestPrice.sma21,
        rsi: latestPrice.rsi,
        bbUpper: latestPrice.bbUpper,
        bbLower: latestPrice.bbLower,
        volatility,
        trendBias,
      };

      const response = await fetch("/api/analyze-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenName: TOKEN_PRESETS[activeToken].name + ` (${activeToken})`,
          strategyName: STRATEGY_PRESETS.find((s) => s.type === selectedStrategy)?.name,
          priceHistory: activeHist.slice(-20), // send last 20 ticks for context
          indicators,
          query,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis(`⚠️ Server error: ${data.error || "Could not generate analysis."}`);
      }
    } catch (error) {
      setAiAnalysis("⚠️ Failed to reach the server. Please check that the server-side app starts correctly.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Pre-seed some default queries
  const SUGGESTED_QUERIES = [
    `How does MGC daily volatility affect Golden Cross signals?`,
    `Identify key resistance and oversold RSI zones for ${activeToken}.`,
    `Suggest safe Stop-Loss / Take-Profit percentages for high volatility trading.`,
  ];

  // Calculate some real-time token metrics
  const activeHistory = histories[activeToken] || [];
  const lastPrice = activeHistory.length > 0 ? activeHistory[activeHistory.length - 1].price : marketStats[activeToken].price;
  const startPrice = activeHistory.length > 0 ? activeHistory[0].price : marketStats[activeToken].price;
  const priceChange = lastPrice - startPrice;
  const priceChangePct = startPrice !== 0 ? (priceChange / startPrice) * 100 : 0;

  return (
    <div className="flex flex-col h-screen min-h-[768px] w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* HEADER: Global Stats & Navigation */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold tracking-wider text-sm">
              TF
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">TOKENFLOW</span>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Strategy Studio
            </span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-500">
            <a href="#dashboard" className="text-indigo-600 border-b-2 border-indigo-600 py-5">
              Dashboard
            </a>
            <a href="#strategies" className="hover:text-slate-800 py-5 transition">
              Backtesting
            </a>
            <a href="#ai-advisor" className="hover:text-slate-800 py-5 transition">
              AI Advisor
            </a>
            <a href="#portfolio" className="hover:text-slate-800 py-5 transition">
              Portfolio
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4 items-center text-xs border-r border-slate-200 pr-6">
            <div className="flex flex-col">
              <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">
                Simulation Speed
              </span>
              <span className="font-mono font-bold text-emerald-600">3s / Tick</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">
                Demo Wallet
              </span>
              <span className="font-mono font-bold text-indigo-600">
                ${portfolio.balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex flex-col border-l border-slate-100 pl-4">
              <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                Firestore Synced
              </span>
              <span className="font-mono text-[9px] text-slate-500 max-w-[100px] truncate" title={userId}>
                UID: {userId}
              </span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-200">
            WM
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR: Watchlists & Custom Controls */}
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-y-auto">
          
          {/* Watchlists */}
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Watchlist
            </h3>
            <div className="space-y-2">
              {Object.values(TOKEN_PRESETS).map((token) => {
                const hist = histories[token.symbol] || [];
                const stats = marketStats[token.symbol];
                const currentVal = stats.price;
                const prevVal = hist.length > 0 ? hist[0].price : stats.price;
                const change = prevVal !== 0 ? ((currentVal - prevVal) / prevVal) * 100 : stats.priceChange24hPct;
                const isActive = activeToken === token.symbol;

                return (
                  <button
                    id={`watchlist-${token.symbol}`}
                    key={token.symbol}
                    onClick={() => setActiveToken(token.symbol)}
                    className={`w-full text-left p-3 border rounded-xl transition-all duration-300 ${
                      isActive
                        ? "bg-indigo-50 border-indigo-200 shadow-sm"
                        : "hover:bg-slate-50 border-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{token.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{token.name}</span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                          change >= 0 ? "text-emerald-600" : "text-rose-500"
                        }`}
                      >
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-lg font-mono font-bold text-slate-900">
                      ${currentVal.toFixed(4)}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono border-t border-slate-100 pt-1">
                      <span>Vol: ${(stats.volumeUSD / 1000).toFixed(0)}k</span>
                      <span>Cap: ${(stats.marketCapUSD / 1000000).toFixed(2)}M</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Market Controller Sliders */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                Market Controls
              </h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Simulate different market conditions in real-time.
              </p>
            </div>

            {/* Volatility */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600">Volatility Multiplier</span>
                <span className="font-bold text-indigo-600">{volatility.toFixed(1)}x</span>
              </div>
              <input
                id="volatility-slider"
                type="range"
                min="0.5"
                max="6.0"
                step="0.1"
                value={volatility}
                onChange={(e) => setVolatility(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
              />
              <span className="text-[9px] text-slate-400">Higher increases price swings</span>
            </div>

            {/* Trend Bias */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600">Trend Bias (Force)</span>
                <span className={`font-bold ${trendBias >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {trendBias > 0 ? "Bullish" : trendBias < 0 ? "Bearish" : "Neutral"} ({trendBias.toFixed(3)})
                </span>
              </div>
              <input
                id="trendbias-slider"
                type="range"
                min="-0.08"
                max="0.08"
                step="0.005"
                value={trendBias}
                onChange={(e) => setTrendBias(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
              />
              <span className="text-[9px] text-slate-400">Forces continuous uptrend/downtrend</span>
            </div>
          </div>

          {/* Chart Overlays / Indicators */}
          <div className="p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Indicators Overlay
            </h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  id="chk-sma9"
                  type="checkbox"
                  checked={activeIndicators.sma9}
                  onChange={(e) => setActiveIndicators((prev) => ({ ...prev, sma9: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">SMA 9 (Simple Moving Avg)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  id="chk-sma21"
                  type="checkbox"
                  checked={activeIndicators.sma21}
                  onChange={(e) => setActiveIndicators((prev) => ({ ...prev, sma21: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">SMA 21 (Simple Moving Avg)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  id="chk-sma50"
                  type="checkbox"
                  checked={activeIndicators.sma50}
                  onChange={(e) => setActiveIndicators((prev) => ({ ...prev, sma50: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-emerald-600">SMA 50 (50-Day Line)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  id="chk-sma200"
                  type="checkbox"
                  checked={activeIndicators.sma200}
                  onChange={(e) => setActiveIndicators((prev) => ({ ...prev, sma200: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-purple-600">SMA 200 (200-Day Line)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  id="chk-bb"
                  type="checkbox"
                  checked={activeIndicators.bb}
                  onChange={(e) => setActiveIndicators((prev) => ({ ...prev, bb: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Bollinger Bands (20, 2)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  id="chk-rsi"
                  type="checkbox"
                  checked={activeIndicators.rsi}
                  onChange={(e) => setActiveIndicators((prev) => ({ ...prev, rsi: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">RSI Oscillator (14 Period)</span>
              </label>
            </div>
          </div>

        </aside>

        {/* MAIN DATA FEED AND ACTION LAB */}
        <main className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
          
          {/* Dashboard anchor */}
          <div id="dashboard" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest font-mono">
                Real-Time Terminal
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {TOKEN_PRESETS[activeToken].name} ({activeToken})
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {TOKEN_PRESETS[activeToken].description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-slate-400 font-semibold uppercase text-[9px]">Last Trade Price</span>
                <span className="text-lg font-bold text-slate-900">${lastPrice.toFixed(4)}</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="flex flex-col">
                <span className="text-slate-400 font-semibold uppercase text-[9px]">Session Change</span>
                <span className={`text-lg font-bold flex items-center gap-0.5 ${priceChangePct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {priceChangePct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {priceChangePct >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* MAIN GRAPH AND ORDER BOOK DUPLEX ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Chart Canvas */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              
              {/* Chart Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-mono">
                {/* Timeframe Controls */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold uppercase text-[10px] mr-2">Timeframe:</span>
                  {(["24h", "7d", "30d"] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        timeframe === tf
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Feed Source Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px] mr-1">Data Feed:</span>
                  <button
                    onClick={() => setFeedSource("BINANCE")}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      feedSource === "BINANCE"
                        ? "bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 border border-transparent hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    BINANCE LIVE (15s)
                  </button>
                  <button
                    onClick={() => setFeedSource("SIMULATOR")}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      feedSource === "SIMULATOR"
                        ? "bg-indigo-50 border border-indigo-300 text-indigo-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 border border-transparent hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    SIMULATOR (3s)
                  </button>
                </div>
              </div>

              {/* Loader indicator if loading Binance */}
              {isHistoryLoading ? (
                <div className="h-[400px] w-full bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-sm font-mono text-slate-500 text-xs">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Syncing historical candles from Binance exchanges...</span>
                </div>
              ) : (
                <TokenChart
                  data={activeHistory}
                  trades={portfolio.history}
                  symbol={activeToken}
                  activeIndicators={activeIndicators}
                />
              )}
            </div>

            {/* Depth Profile Order Book */}
            <div className="lg:col-span-1">
              <OrderBookComponent
                orderBook={orderBooks[activeToken]}
                currentPrice={lastPrice}
              />
            </div>

          </div>

          {/* POPULAR TRADING STRATEGIES & DYNAMIC SIGNALS ROW */}
          <StrategiesGuide
            activeToken={activeToken}
            tokenName={TOKEN_PRESETS[activeToken].name}
            currentPrice={lastPrice}
            history={activeHistory}
            volatilityMultiplier={volatility}
          />

          {/* PAPER TRADING AND SYSTEM SETTINGS ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Limit/Market Direct Trades Panel */}
            <div className="lg:col-span-1">
              <TradingPanel
                symbol={activeToken}
                currentPrice={lastPrice}
                portfolio={portfolio}
                onExecuteTrade={handleTradingPanelSubmit}
              />
            </div>

            {/* Pending Limit Orders & Holdings Portfolio List */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Wallet Holdings */}
              <div id="portfolio" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-800">Demo Account Holdings</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    Balance: ${portfolio.balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-2">Token</th>
                        <th className="pb-2">Balance</th>
                        <th className="pb-2">Avg Buy Price</th>
                        <th className="pb-2">Current Value</th>
                        <th className="pb-2 text-right">Estimated PnL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.values(TOKEN_PRESETS).map((t) => {
                        const pos = portfolio.positions[t.symbol];
                        const price = histories[t.symbol][histories[t.symbol].length - 1].price;
                        const hasPos = pos.amount > 0;
                        const currentVal = pos.amount * price;
                        const costBasis = pos.amount * pos.averageBuyPrice;
                        const pnl = currentVal - costBasis;
                        const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

                        return (
                          <tr key={t.symbol} className={hasPos ? "text-slate-900" : "text-slate-400"}>
                            <td className="py-3 font-bold">{t.symbol}</td>
                            <td className="py-3">{pos.amount.toFixed(4)}</td>
                            <td className="py-3">${pos.averageBuyPrice.toFixed(4)}</td>
                            <td className="py-3">${currentVal.toFixed(2)}</td>
                            <td className={`py-3 text-right font-bold ${pnl >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                              {hasPos ? (
                                <>
                                  {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
                                </>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending orders list */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-800">Active Limit Trigger Orders</h3>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                    {limitOrders.length} Pending
                  </span>
                </div>

                {limitOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                    <span className="text-xs">No active pending limit orders for this session.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-36">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                          <th className="pb-1.5">Asset</th>
                          <th className="pb-1.5">Type</th>
                          <th className="pb-1.5">Trigger Target Price</th>
                          <th className="pb-1.5">Order Size</th>
                          <th className="pb-1.5">Total USD</th>
                          <th className="pb-1.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {limitOrders.map((order) => (
                          <tr key={order.id} className="text-slate-700">
                            <td className="py-2.5 font-bold">{order.symbol}</td>
                            <td className="py-2.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  order.type === "BUY"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-rose-50 text-rose-700 border border-rose-100"
                                }`}
                              >
                                LIMIT {order.type}
                              </span>
                            </td>
                            <td className="py-2.5 font-bold text-slate-900">${order.targetPrice.toFixed(4)}</td>
                            <td className="py-2.5">{order.amount.toFixed(4)}</td>
                            <td className="py-2.5">${(order.amount * order.targetPrice).toFixed(2)}</td>
                            <td className="py-2.5 text-right">
                              <button
                                id={`cancel-order-${order.id}`}
                                onClick={() =>
                                  setLimitOrders((prev) => prev.filter((o) => o.id !== order.id))
                                }
                                className="text-rose-500 hover:text-rose-700 hover:underline text-[10px] font-bold"
                              >
                                Cancel Order
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* DYNAMIC STRATEGY BACKTESTING SANDBOX */}
          <section id="strategies" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest font-mono">
                Algo Simulation
              </span>
              <h2 className="text-lg font-bold text-slate-800 mt-0.5">Strategy Backtester Sandbox</h2>
              <p className="text-xs text-slate-500 mt-1">
                Evaluate algorithmic trade performances historically on current session candles. Compare yield percentages and find winning triggers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Backtest Strategy Selectors & Param Sliders */}
              <div className="flex flex-col gap-4 border-r border-slate-100 pr-0 md:pr-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Choose Strategy Rule</label>
                  <select
                    id="backtest-strategy-select"
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value as StrategyType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-medium"
                  >
                    {STRATEGY_PRESETS.map((s) => (
                      <option key={s.type} value={s.type}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-[11px] text-indigo-900 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/60 leading-relaxed">
                  {STRATEGY_PRESETS.find((s) => s.type === selectedStrategy)?.description}
                </p>

                {/* Backtest Config sliders */}
                <div className="flex flex-col gap-4 mt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Parameters (Tune Parameters)
                  </span>

                  {Object.keys(strategyParams).map((paramKey) => {
                    const preset = STRATEGY_PRESETS.find((s) => s.type === selectedStrategy);
                    const paramDef = preset?.parameters[paramKey];
                    if (!paramDef) return null;

                    return (
                      <div key={paramKey} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-600">{paramDef.name}</span>
                          <span className="font-bold text-slate-800">
                            {strategyParams[paramKey]}
                            {paramKey === "gridInterval" || paramKey === "allocationPct" ? "%" : ""}
                          </span>
                        </div>
                        <input
                          id={`backtest-slider-${paramKey}`}
                          type="range"
                          min={paramDef.min}
                          max={paramDef.max}
                          step={paramDef.step}
                          value={strategyParams[paramKey]}
                          onChange={(e) =>
                            setStrategyParams((prev) => ({
                              ...prev,
                              [paramKey]: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-indigo-600 cursor-pointer h-1 bg-slate-200 rounded-lg"
                        />
                        <span className="text-[9px] text-slate-400 leading-tight">
                          {paramDef.description}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  id="run-backtest-btn"
                  onClick={handleRunBacktest}
                  disabled={isBacktesting}
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
                >
                  {isBacktesting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Backtesting Session...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Simulate Strategy Performance
                    </>
                  )}
                </button>
              </div>

              {/* Backtest Results Cards */}
              <div className="md:col-span-2 flex flex-col gap-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Backtest Execution Analytics
                </span>

                {!backtestResult ? (
                  <div className="flex flex-col items-center justify-center flex-1 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-8 text-center text-slate-400 gap-2">
                    <BarChart3 size={32} className="text-slate-300 animate-pulse" />
                    <span className="text-sm font-medium">No active backtest simulation run yet</span>
                    <p className="text-[11px] text-slate-500 max-w-sm">
                      Select your target algorithm parameters on the left and tap "Simulate Strategy Performance" to evaluate your potential profitability.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    
                    {/* Top line performance cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      
                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase">Yield Return</span>
                        <p className={`text-xl font-mono font-bold ${backtestResult.totalReturnPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {backtestResult.totalReturnPct >= 0 ? "+" : ""}
                          {backtestResult.totalReturnPct.toFixed(2)}%
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1">Final Wallet: ${backtestResult.finalValue.toFixed(2)}</span>
                      </div>

                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase">Win Rate %</span>
                        <p className="text-xl font-mono font-bold text-slate-900">
                          {backtestResult.winRatePct.toFixed(1)}%
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1">Winning Sell trades</span>
                      </div>

                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase">Max Drawdown</span>
                        <p className="text-xl font-mono font-bold text-rose-500">
                          {backtestResult.maxDrawdownPct.toFixed(2)}%
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1">Peak to valley dip</span>
                      </div>

                      <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase">Total Trades</span>
                        <p className="text-xl font-mono font-bold text-indigo-600">
                          {backtestResult.totalTrades} trades
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1">Matched execution triggers</span>
                      </div>

                    </div>

                    {/* Backtest execution Logs */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Simulation Trade Logs</span>
                      <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto max-h-48">
                          <table className="w-full text-left text-[11px] font-mono">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                              <tr className="text-slate-500 uppercase text-[9px] font-bold">
                                <th className="p-2 pl-3">Type</th>
                                <th className="p-2">Asset Price</th>
                                <th className="p-2">Holdings</th>
                                <th className="p-2">Cash Remaining</th>
                                <th className="p-2 pr-3">Signal Cause / Trigger</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {backtestResult.logs.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                                    Strategy conditions were not met during this historical segment. Try increasing volatility or widening bias.
                                  </td>
                                </tr>
                              ) : (
                                backtestResult.logs.map((log, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-2 pl-3">
                                      <span
                                        className={`font-bold px-1 rounded ${
                                          log.type === "BUY"
                                            ? "text-emerald-600 bg-emerald-50"
                                            : "text-rose-500 bg-rose-50"
                                        }`}
                                      >
                                        {log.type}
                                      </span>
                                    </td>
                                    <td className="p-2 font-bold">${log.price.toFixed(4)}</td>
                                    <td className="p-2 text-slate-600">{log.tokensHeld.toFixed(4)}</td>
                                    <td className="p-2 text-slate-600">${log.cashRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="p-2 pr-3 text-slate-400 text-[10px]">{log.reason}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>
          </section>

        </main>

        {/* RIGHT SIDEBAR: AI CO-PILOT ADVOCACY HUB */}
        <aside id="ai-advisor" className="w-80 border-l border-slate-200 bg-white p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
          
          <div className="flex flex-col gap-5">
            
            {/* Header section */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Sparkles size={14} className="text-indigo-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Gemini Strategy Coach</h3>
                <p className="text-[10px] text-slate-400 font-medium">Algorithmic risk co-pilot</p>
              </div>
            </div>

            {/* Quick Prompters */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Advisory Topics
              </span>
              <div className="flex flex-col gap-1.5">
                {SUGGESTED_QUERIES.map((q, idx) => (
                  <button
                    id={`quick-query-${idx}`}
                    key={idx}
                    onClick={() => {
                      setCustomQuery(q);
                      handleAskAiCoach(q);
                    }}
                    className="text-left text-[11px] leading-relaxed p-2.5 border border-slate-200 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-950 rounded-xl transition duration-200 flex gap-1.5 group"
                  >
                    <ArrowRight size={12} className="text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input custom question */}
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Custom Advisory Query
              </label>
              <textarea
                id="ai-query-input"
                placeholder="Ask our quantitative trading model about RSI boundaries, SMA lag, stop losses, or grid intervals..."
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
              <button
                id="ask-coach-btn"
                onClick={() => handleAskAiCoach()}
                disabled={isAiLoading || !customQuery.trim()}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Synthesizing Advice...
                  </>
                ) : (
                  <>
                    <Cpu size={12} />
                    Consult Gemini Strategist
                  </>
                )}
              </button>
            </div>

            {/* Coach Output area */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Coach Output Analysis
              </span>

              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 gap-1.5">
                  <Loader2 size={18} className="text-indigo-600 animate-spin" />
                  <span className="text-[10px] font-medium font-mono">Running algorithmic simulation...</span>
                </div>
              ) : aiAnalysis ? (
                <div
                  id="ai-coach-result"
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] leading-relaxed text-slate-700 overflow-y-auto max-h-[300px] scrollbar-thin prose prose-slate"
                >
                  <div className="whitespace-pre-wrap">{aiAnalysis}</div>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-950 flex gap-2">
                  <Sparkles size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Advice Idle</span>: Consult the coach or tap a quick topic above. Gemini will parse live indicator values to create risk assessments.
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Premium banner exactly matching Design HTML */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-3">
            <div className="bg-indigo-900 rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-y-1/4 translate-x-1/4 opacity-10">
                <Cpu size={120} />
              </div>
              <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase tracking-tighter w-fit">
                Pro Strategy Feature
              </span>
              <h4 className="font-bold text-sm mt-2 mb-1">Grid Auto-Trader Bot</h4>
              <p className="text-[10px] opacity-80 leading-relaxed mb-3">
                Connect your real exchange accounts to fully automate MGC/MES swing strategies using sentiment analysis.
              </p>
              <button
                id="btn-upgrade-pro"
                onClick={() => alert("This demo is a full educational simulation environment. Auto-Trader APIs are locked to simulation Mode!")}
                className="w-full py-1.5 bg-white text-indigo-900 rounded font-bold text-xs hover:bg-indigo-50 transition"
              >
                Simulation Active
              </button>
            </div>
          </div>

        </aside>

      </div>

      {/* FOOTER BAR */}
      <footer className="h-8 bg-slate-800 text-slate-400 text-[10px] flex items-center px-6 gap-6 font-mono shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          LIVE MARKET FEED SIMULATOR CONNECTED
        </div>
        <div className="hidden sm:block">LATENCY: 12ms</div>
        <div className="hidden md:block">INDICATORS: SMA (9/21), RSI (14), BOLLINGER BANDS (20, 2)</div>
        <div className="ml-auto">© 2026 TOKENFLOW ANALYTICS ENGINE</div>
      </footer>

    </div>
  );
}
