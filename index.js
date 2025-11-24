import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// Cache settings
const CACHE_FILE = path.join(process.cwd(), "cache.json");
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes in ms

// List of tickers
const TICKERS = ["BTC","ETH","SOL","BNB","XRP","DOGE","SHIB","PEPE","ADA","AVAX","MATIC"];

app.get("/", async (req, res) => {
  const token = process.env.TWITTER_BEARER;

  // Check cache first
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      const age = Date.now() - cache.timestamp;
      if (age < CACHE_TTL) {
        return res.json({ cached: true, results: cache.results });
      }
    }
  } catch (err) {
    console.error("Cache read error:", err.message);
  }

  // If no token, return mock data
  if (!token) {
    const mockData = TICKERS.map(t => ({ ticker: t, tweets: Math.floor(Math.random()*5000)+100 }));
    return res.json({ mock: true, results: mockData });
  }

  // Build query: all tickers in one request
  const query = TICKERS.map(t => `$${t}`).join(" OR ");
  const url = `https://api.twitter.com/2/tweets/counts/recent?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (response.status === 429) {
      // Rate limit hit, return cached or mock
      const mockData = TICKERS.map(t => ({ ticker: t, tweets: Math.floor(Math.random()*5000)+100 }));
      return res.json({ error: "Too many requests", mock: true, results: mockData });
    }

    const data = await response.json();

    // Map data to ticker counts (simplified for demo)
    const results = TICKERS.map(t => {
      let count = 0;
      if (data.meta && data.meta.total_tweet_count) count = data.meta.total_tweet_count;
      return { ticker: t, tweets: count };
    });

    // Save cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), results }));

    res.json({ cached: false, results });

  } catch (err) {
    console.error(err);
    const mockData = TICKERS.map(t => ({ ticker: t, tweets: Math.floor(Math.random()*5000)+100 }));
    res.json({ error: err.message, mock: true, results: mockData });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
