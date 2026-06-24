import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize GoogleGenAI
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API routes
  app.post("/api/analyze-strategy", async (req, res) => {
    try {
      const { tokenName, strategyName, priceHistory, indicators, query } = req.body;

      if (!ai) {
        return res.status(200).json({
          analysis: "### ⚠️ Gemini API Key Required\n\nTo unlock customized AI Strategy coaching and real-time market sentiment analysis, please configure your **GEMINI_API_KEY** in the **Settings > Secrets** panel in the Google AI Studio sidebar.\n\n*In the meantime, you can continue using all interactive charts, backtesters, indicators, and paper trading modules!*"
        });
      }

      const prompt = `
        You are a professional algorithmic trading strategist and financial coach specializing in cryptocurrency and digital assets.
        The user is asking about trading the token "${tokenName || "MGC/MES"}" using the "${strategyName || "General Technical Analysis"}" strategy.

        Here is the recent simulated market data for ${tokenName || "the token"}:
        - Current Price: $${priceHistory?.[priceHistory.length - 1]?.price?.toFixed(4) || "N/A"}
        - High (recent): $${Math.max(...(priceHistory?.map((h: any) => h.price) || [0]))?.toFixed(4) || "N/A"}
        - Low (recent): $${Math.min(...(priceHistory?.map((h: any) => h.price) || [0]))?.toFixed(4) || "N/A"}
        - Technical Indicators computed: SMA 9, SMA 21, RSI 14, Bollinger Bands.
        ${indicators ? `- Indicator details: ${JSON.stringify(indicators)}` : ""}

        The user's specific query/request is:
        "${query || "Analyze this token and suggest a trading plan."}"

        Please provide a response structured as follows:
        1. **Market Trend Analysis**: Evaluate if the asset is in an uptrend, downtrend, or consolidation based on the indicators.
        2. **Strategy Action Plan**: Explain how the "${strategyName}" strategy would execute here (Buy, Sell, or Hold). Detail the trigger conditions.
        3. **Risk Management Recommendations**: Specifically suggest take-profit (TP) and stop-loss (SL) price levels, and position sizing guidelines.
        4. **Interactive Trading Insight**: Offer 2-3 brief, highly actionable tips tailored to daily volatility in ${tokenName}.

        Return the response in structured, beautifully-formatted markdown with clear headers, bold accents, and key bullets. Keep it practical, professional, and educational. Add a disclaimer that this is a simulation for educational purposes only.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Failed to generate strategy analysis." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server startup error:", err);
});
