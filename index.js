import express from "express";
import fetch from "node-fetch";
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const token = process.env.TWITTER_BEARER;

  try {
    if (!token) {
      return res.json({
        mock: true,
        data: [
          { ticker: "BTC", tweets: 12000 },
          { ticker: "ETH", tweets: 9500 },
          { ticker: "SOL", tweets: 4300 }
        ]
      });
    }

    const response = await fetch("https://api.twitter.com/2/tweets/search/recent?query=BTC", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.json({
      error: true,
      message: err.message,
      mock: true,
      data: [
        { ticker: "BTC", tweets: 12000 },
        { ticker: "ETH", tweets: 9500 },
        { ticker: "SOL", tweets: 4300 }
      ]
    });
  }
});

app.listen(PORT, () => console.log("Server running on port " + PORT));
