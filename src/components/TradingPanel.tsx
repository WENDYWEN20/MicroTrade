import React, { useState, useEffect } from "react";
import { TokenSymbol, Portfolio } from "../types";
import { ShieldAlert, TrendingUp, DollarSign, Wallet } from "lucide-react";

interface TradingPanelProps {
  symbol: TokenSymbol;
  currentPrice: number;
  portfolio: Portfolio;
  onExecuteTrade: (
    type: "BUY" | "SELL",
    price: number,
    amount: number,
    stopLossPct?: number,
    takeProfitPct?: number
  ) => void;
}

export default function TradingPanel({
  symbol,
  currentPrice,
  portfolio,
  onExecuteTrade,
}: TradingPanelProps) {
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toString());
  const [amount, setAmount] = useState<string>("");
  const [useSlTp, setUseSlTp] = useState(false);
  const [stopLossPct, setStopLossPct] = useState<number>(5);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(15);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Synchronize limit price input when currentPrice moves and orderType is MARKET
  useEffect(() => {
    if (orderType === "MARKET") {
      setLimitPrice(currentPrice.toFixed(4));
    }
  }, [currentPrice, orderType]);

  const activePosition = portfolio.positions[symbol] || { amount: 0, averageBuyPrice: 0 };
  const balanceUSD = portfolio.balanceUSD;

  const targetPrice = orderType === "LIMIT" ? parseFloat(limitPrice) || currentPrice : currentPrice;
  const numAmount = parseFloat(amount) || 0;
  const totalCost = numAmount * targetPrice;

  const handlePercentageClick = (pct: number) => {
    if (tradeType === "BUY") {
      const maxSpend = balanceUSD * (pct / 100);
      const buyAmt = maxSpend / targetPrice;
      setAmount(buyAmt.toFixed(4));
    } else {
      const sellAmt = activePosition.amount * (pct / 100);
      setAmount(sellAmt.toFixed(4));
    }
  };

  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (numAmount <= 0) {
      setFeedbackMsg({ text: "Please enter a valid amount.", success: false });
      return;
    }

    if (tradeType === "BUY") {
      if (totalCost > balanceUSD) {
        setFeedbackMsg({ text: "Insufficient USD balance to execute this buy.", success: false });
        return;
      }
    } else {
      if (numAmount > activePosition.amount) {
        setFeedbackMsg({ text: `Insufficient ${symbol} holdings.`, success: false });
        return;
      }
    }

    // Call callback
    onExecuteTrade(
      tradeType,
      targetPrice,
      numAmount,
      useSlTp ? stopLossPct : undefined,
      useSlTp ? takeProfitPct : undefined
    );

    setFeedbackMsg({
      text: `Simulated ${tradeType} order of ${numAmount.toFixed(4)} ${symbol} @ $${targetPrice.toFixed(4)} executed successfully!`,
      success: true,
    });
    setAmount("");
  };

  return (
    <div id="trading-panel-card" className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 pb-3">
        <div className="flex bg-slate-950 p-1 rounded-xl w-full border border-slate-800/60">
          <button
            id="trade-tab-buy"
            type="button"
            onClick={() => {
              setTradeType("BUY");
              setFeedbackMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 uppercase tracking-wider ${
              tradeType === "BUY"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Buy {symbol}
          </button>
          <button
            id="trade-tab-sell"
            type="button"
            onClick={() => {
              setTradeType("SELL");
              setFeedbackMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 uppercase tracking-wider ${
              tradeType === "SELL"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sell {symbol}
          </button>
        </div>
      </div>

      {/* Portfolio Status */}
      <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-xs font-mono">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-slate-500">
            <DollarSign size={13} className="text-cyan-500" />
            <span>USD Balance</span>
          </div>
          <span className="text-white font-bold text-sm">${balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-slate-500">
            <Wallet size={13} className="text-pink-500" />
            <span>Held ({symbol})</span>
          </div>
          <span className="text-white font-bold text-sm">
            {activePosition.amount.toFixed(4)} {symbol}
          </span>
        </div>
      </div>

      {/* Order execution form */}
      <form onSubmit={handleTradeSubmit} className="flex flex-col gap-4">
        {/* Order Type Toggle */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Execution Type</span>
          <div className="flex gap-2">
            <button
              id="order-market"
              type="button"
              onClick={() => setOrderType("MARKET")}
              className={`px-2 py-1 rounded transition-all ${
                orderType === "MARKET" ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Market
            </button>
            <button
              id="order-limit"
              type="button"
              onClick={() => setOrderType("LIMIT")}
              className={`px-2 py-1 rounded transition-all ${
                orderType === "LIMIT" ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Limit Order
            </button>
          </div>
        </div>

        {/* Limit Price Input if LIMIT */}
        {orderType === "LIMIT" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono text-slate-400 uppercase">Limit Trigger Price (USD)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
              <input
                id="limit-price-input"
                type="number"
                step="0.0001"
                min="0.0001"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 pl-8 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-mono text-slate-400 uppercase">Order Size ({symbol})</label>
            <span className="text-[10px] font-mono text-slate-500">
              Avg Cost: ${activePosition.averageBuyPrice.toFixed(4)}
            </span>
          </div>
          <input
            id="amount-input"
            type="number"
            step="0.0001"
            min="0.0001"
            placeholder="0.0000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Percentage buttons */}
        <div className="grid grid-cols-4 gap-2 font-mono text-[10px] text-slate-400">
          {[25, 50, 75, 100].map((pct) => (
            <button
              id={`trade-pct-${pct}`}
              key={pct}
              type="button"
              onClick={() => handlePercentageClick(pct)}
              className="py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800/80 transition-all text-center"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* SL / TP Controls */}
        <div className="border-t border-slate-800/60 pt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <ShieldAlert size={14} className="text-amber-500" />
              <span>Guard Rails (SL/TP)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="toggle-sltp"
                type="checkbox"
                checked={useSlTp}
                onChange={(e) => setUseSlTp(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-300 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {useSlTp && (
            <div className="grid grid-cols-2 gap-3 text-xs font-mono animate-fade-in">
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] uppercase">Stop Loss</span>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                  <input
                    id="stop-loss-pct-input"
                    type="number"
                    min="1"
                    max="50"
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent focus:outline-none text-white text-center"
                  />
                  <span className="text-rose-500 font-bold ml-1">%</span>
                </div>
                <span className="text-[9px] text-slate-500 text-center">
                  Trigger @ ~${(targetPrice * (1 - stopLossPct / 100)).toFixed(4)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-[10px] uppercase">Take Profit</span>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1.5">
                  <input
                    id="take-profit-pct-input"
                    type="number"
                    min="1"
                    max="200"
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent focus:outline-none text-white text-center"
                  />
                  <span className="text-emerald-500 font-bold ml-1">%</span>
                </div>
                <span className="text-[9px] text-slate-500 text-center">
                  Trigger @ ~${(targetPrice * (1 + takeProfitPct / 100)).toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div
            id="trade-feedback"
            className={`p-3 rounded-xl text-xs border ${
              feedbackMsg.success
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Action Button */}
        <button
          id="trade-submit-btn"
          type="submit"
          className={`w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-lg ${
            tradeType === "BUY"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:brightness-110 shadow-emerald-500/10"
              : "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:brightness-110 shadow-rose-500/10"
          }`}
        >
          {tradeType === "BUY" ? "Execute Paper Buy" : "Execute Paper Sell"}
        </button>
      </form>
    </div>
  );
}
