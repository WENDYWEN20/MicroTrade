import React from "react";
import { OrderBook, TokenSymbol } from "../types";

interface OrderBookComponentProps {
  orderBook: OrderBook;
  currentPrice: number;
}

export default function OrderBookComponent({
  orderBook,
  currentPrice,
}: OrderBookComponentProps) {
  // Find highest total to scale progress bars
  const maxTotalBid = Math.max(...orderBook.bids.map((b) => b.total), 1);
  const maxTotalAsk = Math.max(...orderBook.asks.map((a) => a.total), 1);
  const maxTotal = Math.max(maxTotalBid, maxTotalAsk);

  return (
    <div id="order-book-card" className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      <div>
        <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase">Liquidity Profile</span>
        <h3 className="text-lg font-semibold text-white tracking-tight">Order Book Depth</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 font-mono text-xs">
        {/* BUY / BIDS Column (Left) */}
        <div className="flex flex-col">
          <div className="flex justify-between border-b border-slate-800 pb-1.5 mb-2 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
            <span>Price (USD)</span>
            <span>Size (Bids)</span>
          </div>
          <div className="flex flex-col gap-1">
            {orderBook.bids.map((bid, idx) => {
              const widthPct = (bid.total / maxTotal) * 100;
              return (
                <div key={idx} className="relative flex justify-between py-1 px-1.5 rounded overflow-hidden">
                  <div
                    className="absolute inset-y-0 right-0 bg-emerald-500/5 transition-all duration-300"
                    style={{ width: `${widthPct}%` }}
                  />
                  <span className="text-emerald-400 relative z-10 font-bold">${bid.price.toFixed(4)}</span>
                  <span className="text-slate-300 relative z-10">{bid.amount.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SELL / ASKS Column (Right) */}
        <div className="flex flex-col">
          <div className="flex justify-between border-b border-slate-800 pb-1.5 mb-2 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
            <span>Price (USD)</span>
            <span>Size (Asks)</span>
          </div>
          <div className="flex flex-col gap-1">
            {orderBook.asks.map((ask, idx) => {
              const widthPct = (ask.total / maxTotal) * 100;
              return (
                <div key={idx} className="relative flex justify-between py-1 px-1.5 rounded overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-rose-500/5 transition-all duration-300"
                    style={{ width: `${widthPct}%` }}
                  />
                  <span className="text-rose-400 relative z-10 font-bold">${ask.price.toFixed(4)}</span>
                  <span className="text-slate-300 relative z-10">{ask.amount.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spread Calculator */}
      {orderBook.asks.length > 0 && orderBook.bids.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-slate-500 text-[10px] uppercase">Spread Gap</span>
            <span className="text-white font-bold">
              ${(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(4)}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-slate-500 text-[10px] uppercase">Spread %</span>
            <span className="text-slate-300">
              {(
                ((orderBook.asks[0].price - orderBook.bids[0].price) / currentPrice) *
                100
              ).toFixed(3)}
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
