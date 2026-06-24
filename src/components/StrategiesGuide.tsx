import React, { useState } from "react";
import { TokenSymbol, PriceHistoryItem } from "../types";
import { BookOpen, TrendingUp, AlertTriangle, Play, HelpCircle, CheckCircle, Flame, ShieldAlert, Layers } from "lucide-react";

interface StrategiesGuideProps {
  activeToken: TokenSymbol;
  tokenName: string;
  currentPrice: number;
  history: PriceHistoryItem[];
  volatilityMultiplier: number;
}

export default function StrategiesGuide({
  activeToken,
  tokenName,
  currentPrice,
  history,
  volatilityMultiplier,
}: StrategiesGuideProps) {
  const [activeStrategy, setActiveStrategy] = useState<"scalping" | "day" | "swing" | "trend">("day");

  const latestData = history[history.length - 1] as PriceHistoryItem | undefined;
  const currentRsi = latestData?.rsi ?? 50;
  const currentSma50 = latestData?.sma50;
  const currentSma200 = latestData?.sma200;

  // Determine current market conditions dynamically
  const rsiStatus = currentRsi >= 70 ? "OVERBOUGHT (Sell Zone)" : currentRsi <= 30 ? "OVERSOLD (Buy Zone)" : "NEUTRAL (Range)";
  const rsiColor = currentRsi >= 70 ? "text-rose-500 font-bold" : currentRsi <= 30 ? "text-emerald-500 font-bold" : "text-slate-500";

  const sma50Status = currentSma50 ? (currentPrice > currentSma50 ? "ABOVE" : "BELOW") : "N/A";
  const sma200Status = currentSma200 ? (currentPrice > currentSma200 ? "ABOVE" : "BELOW") : "N/A";

  const trendStatus = currentSma50 && currentSma200 
    ? (currentSma50 > currentSma200 ? "BULLISH GOLDEN STATE" : "BEARISH REGIME")
    : "STABILIZING RANGE";

  return (
    <div id="strategies-guide-card" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="text-indigo-600" size={18} />
          <div>
            <h3 className="text-sm font-bold text-slate-800">MGC & MES Trading Academy</h3>
            <p className="text-[10px] text-slate-500">How to apply popular strategies using current market data</p>
          </div>
        </div>
        <span className="bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          Live Market Informed
        </span>
      </div>

      {/* Selector Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
        {[
          { id: "scalping", name: "Scalping", desc: "Ultra Short-Term" },
          { id: "day", name: "Day Trading", desc: "Intraday Range" },
          { id: "swing", name: "Swing Trading", desc: "Multi-Day Swings" },
          { id: "trend", name: "Trend Following", desc: "Long-Term Trends" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStrategy(tab.id as any)}
            className={`flex-1 min-w-[100px] text-center py-2 px-1 rounded-lg transition-all text-xs font-semibold ${
              activeStrategy === tab.id
                ? "bg-white text-indigo-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="font-bold">{tab.name}</div>
            <div className="text-[9px] opacity-75 font-normal">{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Active Strategy Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        
        {/* Explanation Column */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {activeStrategy === "scalping" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-pink-50 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                  Execution Horizon: Seconds to Minutes
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-800">What is Scalping?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scalping is an aggressive trading strategy focused on harvesting tiny gains from frequent trades throughout the session. Scalpers hold positions for mere minutes (or seconds), targeting the immediate bid-ask spread and local order flow momentum.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-indigo-600 font-mono uppercase">Typical Use Case</span>
                  <p className="text-xs text-slate-700 mt-1">
                    Wait for periods of high activity where <strong>{activeToken}</strong> has intense bidding. Execute large position trades on minor pullbacks, exiting immediately upon a $0.005 gain.
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-rose-500 font-mono uppercase flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Primary Risks
                  </span>
                  <p className="text-xs text-slate-700 mt-1">
                    Friction cost (trading commission), high slippage on larger order sizes, and rapid trends that can run through stop losses instantly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeStrategy === "day" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                  Execution Horizon: Hours (Intraday)
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-800">What is Day Trading?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Day trading involves opening and closing positions within a single trading day. Day traders capitalize on intraday volatility, aiming to close all positions before the day ends to eliminate overnight systemic risk or price gaps.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-indigo-600 font-mono uppercase">Typical Use Case</span>
                  <p className="text-xs text-slate-700 mt-1">
                    Watch for morning range breakouts on <strong>{activeToken}</strong>. Enter when price establishes support above the initial 15-minute high, and exit before the close of the daily candle.
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-rose-500 font-mono uppercase flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Primary Risks
                  </span>
                  <p className="text-xs text-slate-700 mt-1">
                    Whipsaws where a breakout turns out to be fake, mental stress due to constant monitoring, and heavy losses during macro-economic updates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeStrategy === "swing" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                  Execution Horizon: Days to Weeks
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-800">What is Swing Trading?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Swing trading attempts to capture multi-day swings or oscillations in price. Swing traders utilize technical indicators like RSI and Bollinger Bands to buy at local swing lows and sell at swing highs, ignoring minor intraday noise.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-indigo-600 font-mono uppercase">Typical Use Case</span>
                  <p className="text-xs text-slate-700 mt-1">
                    Identify when <strong>{activeToken}</strong> reaches oversold regions. Accumulate near the Lower Bollinger Band and take profits when price reaches the Upper Band over 3–5 days.
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-rose-500 font-mono uppercase flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Primary Risks
                  </span>
                  <p className="text-xs text-slate-700 mt-1">
                    Exposure to overnight market news/gaps, tying up capital in slow-moving assets, and broad market-wide correlation sell-offs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeStrategy === "trend" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                  Execution Horizon: Weeks to Months
                </span>
              </div>
              <h4 className="text-base font-bold text-slate-800">What is Trend Following?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Trend following is a momentum-based strategy that rides macro trends. Rather than forecasting bottoms or tops, trend followers buy when an uptrend is officially confirmed (e.g. via SMA crossovers) and stay in the trade until the trend bends.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-indigo-600 font-mono uppercase">Typical Use Case</span>
                  <p className="text-xs text-slate-700 mt-1">
                    Buy and hold <strong>{activeToken}</strong> when the fast SMA (e.g., SMA 9 or SMA 50) crosses above the slow SMA (e.g., SMA 21 or SMA 200). Exit only when the reverse crossover occurs.
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-rose-500 font-mono uppercase flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Primary Risks
                  </span>
                  <p className="text-xs text-slate-700 mt-1">
                    Severe drawdowns during sideways consolidation periods, delayed exits that give back substantial profits, and lagging trade entries.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Context Column */}
        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 flex flex-col gap-4 font-mono text-xs">
          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="text-orange-500 animate-pulse" size={14} />
            Live Strategy Signals
          </span>

          <div className="space-y-3">
            <div className="flex flex-col gap-1 border-b border-indigo-100/50 pb-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Selected Target Asset</span>
              <span className="text-sm font-bold text-slate-900">{tokenName} ({activeToken})</span>
            </div>

            <div className="flex flex-col gap-1 border-b border-indigo-100/50 pb-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Current Spot Price</span>
              <span className="text-sm font-bold text-indigo-950">${currentPrice.toFixed(4)}</span>
            </div>

            {/* Dynamic Volatility Context */}
            <div className="flex flex-col gap-1 border-b border-indigo-100/50 pb-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Volatility Status</span>
              <span className={`text-xs font-bold ${volatilityMultiplier > 2.5 ? "text-rose-600" : "text-emerald-600"}`}>
                {volatilityMultiplier > 2.5 ? `HIGH (${volatilityMultiplier.toFixed(1)}x)` : `STABLE (${volatilityMultiplier.toFixed(1)}x)`}
              </span>
              <span className="text-[9px] text-slate-500 leading-normal">
                {volatilityMultiplier > 2.5 
                  ? "Favors Scalping and Day Trading due to wider daily swings."
                  : "Favors Swing Trading or Range Grid Trading."}
              </span>
            </div>

            {/* Dynamic RSI Context */}
            <div className="flex flex-col gap-1 border-b border-indigo-100/50 pb-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">RSI (14) Indicator</span>
              <span className={`text-xs font-bold ${rsiColor}`}>{currentRsi.toFixed(1)} - {rsiStatus}</span>
              <span className="text-[9px] text-slate-500 leading-normal">
                {currentRsi >= 70 && "Mean reversion models indicate taking profit immediately."}
                {currentRsi <= 30 && "Oversold signals: potential accumulating buy trigger for swing models."}
                {currentRsi > 30 && currentRsi < 70 && "Momentum neutral. Watch the Bollinger Bands compression instead."}
              </span>
            </div>

            {/* Dynamic SMA Context */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Moving Averages (SMA)</span>
              <div className="flex flex-col gap-1 font-medium text-[10px] text-slate-700">
                <div className="flex justify-between">
                  <span>Price vs SMA 50:</span>
                  <span className={`font-bold ${sma50Status === "ABOVE" ? "text-emerald-600" : "text-rose-500"}`}>{sma50Status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price vs SMA 200:</span>
                  <span className={`font-bold ${sma200Status === "ABOVE" ? "text-emerald-600" : "text-rose-500"}`}>{sma200Status}</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500 leading-normal mt-1">
                {sma50Status === "ABOVE" && sma200Status === "ABOVE" 
                  ? "Strong upward regime. High probability Trend Following buy signal." 
                  : "Bearish or consolidative regime. Avoid trend trades; stick to scalping range."}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
