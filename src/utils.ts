import { PriceHistoryItem, BacktestResult, BacktestLog, StrategyType } from "./types";

// Generate synthetic historical price history to bootstrap the chart
export function generateInitialHistory(
  initialPrice: number,
  volatility: number,
  trendBias: number,
  length: number = 100,
  timeframe: "24h" | "7d" | "30d" = "24h"
): PriceHistoryItem[] {
  const history: PriceHistoryItem[] = [];
  let currentPrice = initialPrice;
  const now = Date.now();
  
  // Choose timeframe steps
  let timeStep = 15 * 60 * 1000; // 15-minute steps for 24h
  if (timeframe === "7d") {
    timeStep = 2 * 60 * 60 * 1000; // 2-hour steps for 7d
  } else if (timeframe === "30d") {
    timeStep = 12 * 60 * 60 * 1000; // 12-hour steps for 30d
  }

  for (let i = length - 1; i >= 0; i--) {
    const timestamp = now - i * timeStep;
    const timeStr = new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      ...(timeframe !== "24h" ? { month: "short", day: "numeric" } : {})
    });

    // Random walk with trend bias and volatility
    const changePct = (Math.random() - 0.485 + trendBias) * volatility;
    const open = currentPrice;
    currentPrice = Math.max(0.01, currentPrice * (1 + changePct));
    const close = currentPrice;

    // Generate random candle wick extremes
    const high = Math.max(open, close) * (1 + Math.random() * 0.005 * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005 * volatility);
    const volume = Math.floor((Math.random() * 5000 + 2000) * (1 + changePct * 10));

    history.push({
      time: timeStr,
      timestamp,
      price: Number(close.toFixed(4)),
      open: Number(open.toFixed(4)),
      close: Number(close.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      volume,
    });
  }

  // Compute indicators for the whole series
  return computeIndicators(history);
}

// Compute Technical Indicators: SMA 9, SMA 21, RSI 14, Bollinger Bands (20, 2)
export function computeIndicators(data: PriceHistoryItem[]): PriceHistoryItem[] {
  const result = [...data];

  // 1. SMA 9, SMA 21, SMA 50 & SMA 200
  for (let i = 0; i < result.length; i++) {
    // SMA 9
    if (i >= 8) {
      const sum = result.slice(i - 8, i + 1).reduce((acc, d) => acc + d.price, 0);
      result[i].sma9 = Number((sum / 9).toFixed(4));
    }
    // SMA 21
    if (i >= 20) {
      const sum = result.slice(i - 20, i + 1).reduce((acc, d) => acc + d.price, 0);
      result[i].sma21 = Number((sum / 21).toFixed(4));
    }
    // SMA 50
    if (i >= 49) {
      const sum = result.slice(i - 49, i + 1).reduce((acc, d) => acc + d.price, 0);
      result[i].sma50 = Number((sum / 50).toFixed(4));
    }
    // SMA 200
    if (i >= 199) {
      const sum = result.slice(i - 199, i + 1).reduce((acc, d) => acc + d.price, 0);
      result[i].sma200 = Number((sum / 200).toFixed(4));
    }
  }

  // 2. RSI 14 (Wilder's Smoothing)
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < result.length; i++) {
    const change = result[i].price - result[i - 1].price;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= 14) {
      avgGain += gain;
      avgLoss += loss;
      if (i === 14) {
        avgGain /= 14;
        avgLoss /= 14;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result[i].rsi = avgLoss === 0 ? 100 : Number((100 - 100 / (1 + rs)).toFixed(2));
      }
    } else {
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result[i].rsi = avgLoss === 0 ? 100 : Number((100 - 100 / (1 + rs)).toFixed(2));
    }
  }

  // 3. Bollinger Bands (20, 2)
  for (let i = 19; i < result.length; i++) {
    const slice = result.slice(i - 19, i + 1);
    const prices = slice.map((d) => d.price);
    const basis = prices.reduce((acc, p) => acc + p, 0) / 20;

    const variance = prices.reduce((acc, p) => acc + Math.pow(p - basis, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);

    result[i].bbBasis = Number(basis.toFixed(4));
    result[i].bbUpper = Number((basis + 2 * stdDev).toFixed(4));
    result[i].bbLower = Number((basis - 2 * stdDev).toFixed(4));
  }

  return result;
}

// Tick-by-tick simulation step for real-time updates
export function simulatePriceTick(
  currentHistory: PriceHistoryItem[],
  volatility: number,
  trendBias: number
): PriceHistoryItem[] {
  if (currentHistory.length === 0) return [];

  const lastItem = currentHistory[currentHistory.length - 1];
  const nextTimestamp = lastItem.timestamp + 5 * 1000; // 5-second updates in real-time
  const nextTimeStr = new Date(nextTimestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Random walk with volatility and custom user adjustments
  const rand = Math.random();
  const changePct = (rand - 0.49 + trendBias) * (volatility * 0.15); // scaled down for 5s intervals
  const open = lastItem.price;
  const close = Math.max(0.01, open * (1 + changePct));
  const high = Math.max(open, close) * (1 + Math.random() * 0.001 * volatility);
  const low = Math.min(open, close) * (1 - Math.random() * 0.001 * volatility);
  const volume = Math.floor((Math.random() * 800 + 100) * (1 + Math.abs(changePct) * 50));

  const nextItem: PriceHistoryItem = {
    time: nextTimeStr,
    timestamp: nextTimestamp,
    price: Number(close.toFixed(4)),
    open: Number(open.toFixed(4)),
    close: Number(close.toFixed(4)),
    high: Number(high.toFixed(4)),
    low: Number(low.toFixed(4)),
    volume,
  };

  // Keep a maximum of 150 items for UI performance, but slide window
  const updatedHistory = [...currentHistory, nextItem];
  if (updatedHistory.length > 120) {
    updatedHistory.shift();
  }

  return computeIndicators(updatedHistory);
}

// Backtester Engine
export function runBacktest(
  history: PriceHistoryItem[],
  strategyType: StrategyType,
  params: { [key: string]: number },
  initialCapital: number = 10000
): BacktestResult {
  let cash = initialCapital;
  let tokens = 0;
  const logs: BacktestLog[] = [];
  let totalTrades = 0;
  let winningTrades = 0;

  // Track trade buy-prices to calculate profit/loss on sell
  const buyPrices: number[] = [];

  for (let i = 21; i < history.length; i++) {
    const current = history[i];
    const prev = history[i - 1];
    let signal: "BUY" | "SELL" | null = null;
    let reason = "";

    const currentPrice = current.price;

    if (strategyType === StrategyType.SMA_CROSSOVER) {
      // Fast crosses above slow -> BUY
      // Fast crosses below slow -> SELL
      const fastPrev = prev.sma9;
      const slowPrev = prev.sma21;
      const fastCurr = current.sma9;
      const slowCurr = current.sma21;

      if (fastPrev && slowPrev && fastCurr && slowCurr) {
        if (fastPrev <= slowPrev && fastCurr > slowCurr) {
          signal = "BUY";
          reason = `SMA 9 crossed ABOVE SMA 21 (Golden Cross)`;
        } else if (fastPrev >= slowPrev && fastCurr < slowCurr) {
          signal = "SELL";
          reason = `SMA 9 crossed BELOW SMA 21 (Death Cross)`;
        }
      }
    } else if (strategyType === StrategyType.RSI_OSCILLATOR) {
      // Overbought / Oversold
      const rsiVal = current.rsi;
      const prevRsiVal = prev.rsi;
      const overbought = params.overbought || 70;
      const oversold = params.oversold || 30;

      if (rsiVal && prevRsiVal) {
        // oversold cross back above
        if (prevRsiVal < oversold && rsiVal >= oversold) {
          signal = "BUY";
          reason = `RSI recovered from oversold level (< ${oversold})`;
        }
        // overbought cross back below
        else if (prevRsiVal > overbought && rsiVal <= overbought) {
          signal = "SELL";
          reason = `RSI reverted from overbought level (> ${overbought})`;
        }
      }
    } else if (strategyType === StrategyType.BOLLINGER_BANDS) {
      // Mean reversion: price crosses outer bands
      const upper = current.bbUpper;
      const lower = current.bbLower;

      if (upper && lower) {
        if (currentPrice < lower) {
          signal = "BUY";
          reason = `Price dropped below Lower Bollinger Band ($${lower})`;
        } else if (currentPrice > upper) {
          signal = "SELL";
          reason = `Price rallied above Upper Bollinger Band ($${upper})`;
        }
      }
    } else if (strategyType === StrategyType.GRID_TRADING) {
      // Simple grid buy/sell based on reference grids
      // Check price changes against grid interval pct
      const gridInterval = params.gridInterval || 1.5; // in percentage
      const basis = history[i - 20]?.price || history[0].price;
      const priceDiffPct = ((currentPrice - basis) / basis) * 100;

      // When price swings out to negative grids, buy. When positive, sell.
      if (priceDiffPct < -gridInterval && tokens === 0) {
        signal = "BUY";
        reason = `Grid limit hit at ${priceDiffPct.toFixed(2)}% below basis`;
      } else if (priceDiffPct > gridInterval && tokens > 0) {
        signal = "SELL";
        reason = `Grid limit hit at ${priceDiffPct.toFixed(2)}% above basis`;
      }
    }

    // Execute signals
    if (signal === "BUY" && cash > 0) {
      // Allocate 50% or 100% based on parameter / simple strategy logic
      const allocPct = params.allocationPct ? params.allocationPct / 100 : 1.0;
      const spend = cash * allocPct;
      if (spend > 10) {
        const amountBought = spend / currentPrice;
        cash -= spend;
        tokens += amountBought;
        buyPrices.push(currentPrice);
        totalTrades++;

        logs.push({
          timestamp: current.timestamp,
          type: "BUY",
          price: currentPrice,
          amount: amountBought,
          cashRemaining: Number(cash.toFixed(2)),
          tokensHeld: Number(tokens.toFixed(4)),
          portfolioValue: Number((cash + tokens * currentPrice).toFixed(2)),
          reason,
        });
      }
    } else if (signal === "SELL" && tokens > 0) {
      const amountToSell = tokens; // Liquidate full position
      const revenue = amountToSell * currentPrice;
      cash += revenue;
      tokens = 0;
      totalTrades++;

      // Evaluate Win/Loss
      if (buyPrices.length > 0) {
        const avgBuyPrice = buyPrices.reduce((sum, p) => sum + p, 0) / buyPrices.length;
        if (currentPrice > avgBuyPrice) {
          winningTrades++;
        }
        buyPrices.length = 0; // reset
      }

      logs.push({
        timestamp: current.timestamp,
        type: "SELL",
        price: currentPrice,
        amount: amountToSell,
        cashRemaining: Number(cash.toFixed(2)),
        tokensHeld: Number(tokens.toFixed(4)),
        portfolioValue: Number((cash + tokens * currentPrice).toFixed(2)),
        reason,
      });
    }
  }

  const finalValue = cash + tokens * (history[history.length - 1]?.price || 0);
  const totalReturnPct = ((finalValue - initialCapital) / initialCapital) * 100;

  // Simple Max Drawdown calculation
  let peak = initialCapital;
  let maxDrawdown = 0;
  let runningVal = initialCapital;

  // Recalculate portfolio value series
  const portfolioHistory = history.map((h) => {
    // Find active log at or before this timestamp to get holdings
    const activeLog = [...logs]
      .reverse()
      .find((l) => l.timestamp <= h.timestamp);
    const holdings = activeLog ? activeLog.tokensHeld : 0;
    const money = activeLog ? activeLog.cashRemaining : initialCapital;
    const value = money + holdings * h.price;
    if (value > peak) peak = value;
    const drawdown = ((peak - value) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    return value;
  });

  const winRatePct = totalTrades > 0 ? (winningTrades / Math.ceil(totalTrades / 2)) * 100 : 0;

  return {
    initialCapital,
    finalValue: Number(finalValue.toFixed(2)),
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdown.toFixed(2)),
    winRatePct: Number(Math.min(100, winRatePct).toFixed(2)),
    totalTrades,
    logs,
  };
}

// Order Book Generator
export function generateOrderBook(currentPrice: number, spreadPct: number = 0.05): { bids: any[]; asks: any[] } {
  const bids: any[] = [];
  const asks: any[] = [];
  const spreadValue = currentPrice * (spreadPct / 100);

  let bidTotal = 0;
  let askTotal = 0;

  for (let i = 1; i <= 8; i++) {
    // Bids (Buy side, lower than currentPrice)
    const bidPrice = currentPrice - spreadValue * i - Math.random() * 0.002 * currentPrice;
    const bidAmount = Math.random() * 500 + 50 * (9 - i);
    bidTotal += bidAmount;
    bids.push({
      price: Number(bidPrice.toFixed(4)),
      amount: Number(bidAmount.toFixed(2)),
      total: Number(bidTotal.toFixed(2)),
    });

    // Asks (Sell side, higher than currentPrice)
    const askPrice = currentPrice + spreadValue * i + Math.random() * 0.002 * currentPrice;
    const askAmount = Math.random() * 500 + 50 * (9 - i);
    askTotal += askAmount;
    asks.push({
      price: Number(askPrice.toFixed(4)),
      amount: Number(askAmount.toFixed(2)),
      total: Number(askTotal.toFixed(2)),
    });
  }

  return { bids, asks };
}
