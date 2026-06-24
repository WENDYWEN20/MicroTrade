import React, { useState } from "react";
import { PriceHistoryItem, TradeRecord, TokenSymbol } from "../types";

interface TokenChartProps {
  data: PriceHistoryItem[];
  trades: TradeRecord[];
  symbol: TokenSymbol;
  activeIndicators: {
    sma9: boolean;
    sma21: boolean;
    sma50: boolean;
    sma200: boolean;
    bb: boolean;
    rsi: boolean;
  };
}

export default function TokenChart({
  data,
  trades,
  symbol,
  activeIndicators,
}: TokenChartProps) {
  const [chartType, setChartType] = useState<"LINE" | "CANDLE">("CANDLE");

  if (data.length === 0) {
    return (
      <div id="chart-loading" className="flex items-center justify-center h-80 bg-slate-900/30 rounded-xl border border-slate-800">
        <span className="text-slate-400 font-mono text-sm animate-pulse">Loading market feeds...</span>
      </div>
    );
  }

  // Width and height for SVG viewBox
  const width = 800;
  const height = 300;
  const paddingLeft = 10;
  const paddingRight = 65;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Extract values to scale
  const prices = data.map((d) => d.price);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);

  let allValues = [...prices, ...highs, ...lows];

  // Include Indicators in scaling if active
  if (activeIndicators.sma9) {
    data.forEach((d) => {
      if (d.sma9) allValues.push(d.sma9);
    });
  }
  if (activeIndicators.sma21) {
    data.forEach((d) => {
      if (d.sma21) allValues.push(d.sma21);
    });
  }
  if (activeIndicators.sma50) {
    data.forEach((d) => {
      if (d.sma50) allValues.push(d.sma50);
    });
  }
  if (activeIndicators.sma200) {
    data.forEach((d) => {
      if (d.sma200) allValues.push(d.sma200);
    });
  }
  if (activeIndicators.bb) {
    data.forEach((d) => {
      if (d.bbUpper) allValues.push(d.bbUpper);
      if (d.bbLower) allValues.push(d.bbLower);
    });
  }

  const maxPrice = Math.max(...allValues) * 1.002;
  const minPrice = Math.max(0.001, Math.min(...allValues) * 0.998);
  const priceRange = maxPrice - minPrice;

  // X & Y Coordinate converters
  const getX = (index: number) => {
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (price: number) => {
    return paddingTop + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  // Generate main line path (if line chart)
  const linePoints = data
    .map((d, i) => `${getX(i)},${getY(d.price)}`)
    .join(" ");

  const gradientPoints = `${getX(0)},${paddingTop + chartHeight} ` +
    linePoints +
    ` ${getX(data.length - 1)},${paddingTop + chartHeight}`;

  // Bollinger Bands Paths
  let bbUpperPoints = "";
  let bbLowerPoints = "";
  let bbBasisPoints = "";
  let bbAreaPoints = "";

  if (activeIndicators.bb) {
    const upperList: string[] = [];
    const lowerList: string[] = [];

    data.forEach((d, i) => {
      if (d.bbUpper && d.bbLower && d.bbBasis) {
        upperList.push(`${getX(i)},${getY(d.bbUpper)}`);
        lowerList.push(`${getX(i)},${getY(d.bbLower)}`);
      }
    });

    bbUpperPoints = upperList.join(" ");
    bbLowerPoints = lowerList.join(" ");

    if (upperList.length > 0 && lowerList.length > 0) {
      bbAreaPoints = upperList.join(" ") + " " + [...lowerList].reverse().join(" ");
    }
  }

  // SMA Points
  const sma9Points = data
    .map((d, i) => (d.sma9 ? `${getX(i)},${getY(d.sma9)}` : ""))
    .filter(Boolean)
    .join(" ");

  const sma21Points = data
    .map((d, i) => (d.sma21 ? `${getX(i)},${getY(d.sma21)}` : ""))
    .filter(Boolean)
    .join(" ");

  const sma50Points = data
    .map((d, i) => (d.sma50 ? `${getX(i)},${getY(d.sma50)}` : ""))
    .filter(Boolean)
    .join(" ");

  const sma200Points = data
    .map((d, i) => (d.sma200 ? `${getX(i)},${getY(d.sma200)}` : ""))
    .filter(Boolean)
    .join(" ");

  // Grid lines
  const gridLinesCount = 5;
  const gridLines = Array.from({ length: gridLinesCount }).map((_, i) => {
    const price = minPrice + (priceRange / (gridLinesCount - 1)) * i;
    return {
      price,
      y: getY(price),
    };
  });

  // Time grid guides (every 15 entries)
  const timeGuides = data
    .map((d, i) => (i % 15 === 0 ? { label: d.time, x: getX(i) } : null))
    .filter((g): g is { label: string; x: number } => g !== null);

  // RSI Sub-chart Calculations
  const rsiHeight = 80;
  const rsiPaddingTop = 10;
  const rsiPaddingBottom = 15;
  const rsiChartHeight = rsiHeight - rsiPaddingTop - rsiPaddingBottom;

  const getRsiY = (rsi: number) => {
    return rsiPaddingTop + rsiChartHeight - (rsi / 100) * rsiChartHeight;
  };

  const rsiPoints = data
    .map((d, i) => (d.rsi !== undefined ? `${getX(i)},${getRsiY(d.rsi)}` : ""))
    .filter(Boolean)
    .join(" ");

  // Map trades to coordinate dots
  const activeSymbolTrades = trades.filter((t) => t.symbol === symbol);

  return (
    <div id="chart-card" className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase">Live Market Feed</span>
          <h3 className="text-lg font-semibold text-white tracking-tight">Real-Time Price & Trends</h3>
        </div>
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            id="toggle-candle"
            onClick={() => setChartType("CANDLE")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              chartType === "CANDLE"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Candlesticks
          </button>
          <button
            id="toggle-line"
            onClick={() => setChartType("LINE")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              chartType === "LINE"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Line Chart
          </button>
        </div>
      </div>

      {/* Main Chart SVG */}
      <div className="relative bg-slate-950/60 rounded-xl p-2 border border-slate-800 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="bbGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines & price markers */}
          {gridLines.map((line, idx) => (
            <g key={idx} className="opacity-40">
              <line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={width - paddingRight + 8}
                y={line.y + 4}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                className="font-medium"
              >
                ${line.price.toFixed(4)}
              </text>
            </g>
          ))}

          {/* Bollinger Bands Fill and Lines */}
          {activeIndicators.bb && bbUpperPoints && (
            <>
              {bbAreaPoints && (
                <polygon points={bbAreaPoints} fill="url(#bbGradient)" />
              )}
              <polyline
                points={bbUpperPoints}
                fill="none"
                stroke="#a5b4fc"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                className="opacity-70"
              />
              <polyline
                points={bbLowerPoints}
                fill="none"
                stroke="#a5b4fc"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                className="opacity-70"
              />
            </>
          )}

          {/* Horizontal Line at Last Price */}
          <line
            x1={paddingLeft}
            y1={getY(data[data.length - 1].price)}
            x2={width - paddingRight}
            y2={getY(data[data.length - 1].price)}
            stroke="#06b6d4"
            strokeWidth="1"
            strokeDasharray="2 2"
            className="opacity-50"
          />

          {/* Line Chart */}
          {chartType === "LINE" && (
            <>
              <polygon points={gradientPoints} fill="url(#areaGradient)" />
              <polyline
                points={linePoints}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Candlestick Chart */}
          {chartType === "CANDLE" &&
            data.map((d, i) => {
              const x = getX(i);
              const oY = getY(d.open);
              const cY = getY(d.close);
              const hY = getY(d.high);
              const lY = getY(d.low);

              const isGreen = d.close >= d.open;
              const candleColor = isGreen ? "#10b981" : "#f43f5e";
              const candleWidth = Math.max(2, chartWidth / data.length * 0.65);

              return (
                <g key={i}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={hY}
                    x2={x}
                    y2={lY}
                    stroke={candleColor}
                    strokeWidth="1.2"
                  />
                  {/* Real Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={Math.min(oY, cY)}
                    width={candleWidth}
                    height={Math.max(1.5, Math.abs(cY - oY))}
                    fill={candleColor}
                    stroke={candleColor}
                    strokeWidth="0.5"
                  />
                </g>
              );
            })}

          {/* SMA Overlays */}
          {activeIndicators.sma9 && sma9Points && (
            <polyline
              points={sma9Points}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="opacity-80"
            />
          )}
          {activeIndicators.sma21 && sma21Points && (
            <polyline
              points={sma21Points}
              fill="none"
              stroke="#ec4899"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="opacity-80"
            />
          )}
          {activeIndicators.sma50 && sma50Points && (
            <polyline
              points={sma50Points}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="opacity-80"
            />
          )}
          {activeIndicators.sma200 && sma200Points && (
            <polyline
              points={sma200Points}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="opacity-80"
            />
          )}

          {/* Simulated Trade Markers */}
          {activeSymbolTrades.map((t) => {
            // Find closest historical timestamp matching or just after
            const idx = data.findIndex((d) => Math.abs(d.timestamp - t.timestamp) < 15000);
            if (idx === -1) return null;

            const tx = getX(idx);
            const ty = getY(t.price);
            const isBuy = t.type === "BUY";

            return (
              <g key={t.id} className="cursor-help">
                <circle
                  cx={tx}
                  cy={ty}
                  r="6"
                  fill={isBuy ? "#10b981" : "#f43f5e"}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <polygon
                  points={isBuy ? `${tx},${ty - 16} ${tx - 5},${ty - 10} ${tx + 5},${ty - 10}` : `${tx},${ty + 16} ${tx - 5},${ty + 10} ${tx + 5},${ty + 10}`}
                  fill={isBuy ? "#10b981" : "#f43f5e"}
                />
                <title>{`${t.type} ${t.amount.toFixed(2)} @ $${t.price.toFixed(4)}`}</title>
              </g>
            );
          })}

          {/* Timeline Guides */}
          {timeGuides.map((guide, idx) => (
            <g key={idx} className="opacity-45">
              <line
                x1={guide.x}
                y1={paddingTop}
                x2={guide.x}
                y2={paddingTop + chartHeight}
                stroke="#334155"
                strokeWidth="0.5"
              />
              <text
                x={guide.x}
                y={paddingTop + chartHeight + 16}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {guide.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* RSI Sub-Chart if active */}
      {activeIndicators.rsi && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-pink-400 uppercase tracking-wider">
            <span>RSI Indicator (14 Period)</span>
            <span className="text-slate-400">Oversold: 30 | Overbought: 70</span>
          </div>
          <div className="relative bg-slate-950/60 rounded-xl p-2 border border-slate-800/80 overflow-hidden">
            <svg viewBox={`0 0 ${width} ${rsiHeight}`} className="w-full h-auto select-none overflow-visible">
              {/* RSI Guides (30 and 70 lines) */}
              <line
                x1={paddingLeft}
                y1={getRsiY(70)}
                x2={width - paddingRight}
                y2={getRsiY(70)}
                stroke="#f43f5e"
                strokeWidth="1"
                strokeDasharray="3 3"
                className="opacity-40"
              />
              <line
                x1={paddingLeft}
                y1={getRsiY(30)}
                x2={width - paddingRight}
                y2={getRsiY(30)}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                className="opacity-40"
              />
              <text
                x={width - paddingRight + 8}
                y={getRsiY(70) + 3}
                fill="#f43f5e"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                70
              </text>
              <text
                x={width - paddingRight + 8}
                y={getRsiY(30) + 3}
                fill="#10b981"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                30
              </text>

              {/* RSI line */}
              {rsiPoints && (
                <polyline
                  points={rsiPoints}
                  fill="none"
                  stroke="#f472b6"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 border-t border-slate-800/60 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]"></span>
          <span>Last Price: ${data[data.length - 1].price.toFixed(4)}</span>
        </div>
        {activeIndicators.sma9 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#f59e0b]"></span>
            <span>SMA 9</span>
          </div>
        )}
        {activeIndicators.sma21 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#ec4899]"></span>
            <span>SMA 21</span>
          </div>
        )}
        {activeIndicators.sma50 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#10b981]"></span>
            <span>SMA 50 (50-Day)</span>
          </div>
        )}
        {activeIndicators.sma200 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#8b5cf6]"></span>
            <span>SMA 200 (200-Day)</span>
          </div>
        )}
        {activeIndicators.bb && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#a5b4fc] border-t border-dashed"></span>
            <span>Bollinger Bands (20, 2)</span>
          </div>
        )}
        {activeIndicators.rsi && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#f472b6]"></span>
            <span>RSI (14)</span>
          </div>
        )}
        {activeSymbolTrades.length > 0 && (
          <div className="flex items-center gap-3 ml-auto text-[10px]">
            <span className="flex items-center gap-1 text-[#10b981] font-bold">
              ● Buy Trade Marker
            </span>
            <span className="flex items-center gap-1 text-[#f43f5e] font-bold">
              ● Sell Trade Marker
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
