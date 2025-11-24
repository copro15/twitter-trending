import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// Cache
const CACHE_FILE = path.join(process.cwd(), "cache.json");
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Tickers
const TICKERS = ["BTC","ETH","SOL","BNB","XRP","DOGE","SHIB","PEPE","ADA","AVAX","MATIC"];

app.get("/", async (req, res) => {
  const token = process.env.TWITTER_BEARER;

  if (!token) {
    return res.status(403).json({ error: "Twitter token missing. Cannot fetch real data." });
  }

  // Return cached data if fresh
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      if (Date.now() - cache.timestamp < CACHE_TTL) {
        return res.json({ cached: true, results: cache.results.slice(0, 5) });
      }
    }
  } catch (err) {
    console.error("Cache read error:", err.message);
  }

  const results = [];

  // Fetch up to 100 recent tweets per ticker
  for (let ticker of TICKERS) {
    const query = encodeURIComponent(`$${ticker} -is:retweet`);
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=100`;

    try {
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.status === 429) {
        console.warn("Rate limit reached. Returning partial results.");
        break; // stop fetching more tickers
      }

      const data = await response.json();
      const count = Array.isArray(data.data) ? data.data.length : 0;
      results.push({ ticker, tweets: count });

    } catch (err) {
      console.error("Error fetching ticker", ticker, err.message);
      results.push({ ticker, tweets: 0, error: err.message });
    }
  }

  // Sort descending by tweet count and pick top 5
  const topResults = results.sort((a,b) => b.tweets - a.tweets).slice(0, 5);

  // Save cache
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), results: topResults }));
  } catch (err) {
    console.error("Cache write error:", err.message);
  }

  res.json({ cached: false, results: topResults });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
