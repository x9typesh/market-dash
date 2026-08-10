// api/quotes.js
// Proxies Polygon.io for index + sector ETF snapshots
// Keeps your API key server-side only

const POLYGON_KEY = process.env.POLYGON_API_KEY;

// Tickers we need
// Indices (via ETFs that track them closely)
// SPY=S&P500, DIA=Dow, QQQ=Nasdaq, IWM=Russell2000
// Sector ETFs
const TICKERS = [
  'SPY','DIA','QQQ','IWM',         // indices
  'XLK','XLF','XLE','XLV',         // tech, financials, energy, healthcare
  'XLI','XLC','XLY','XLU'          // industrials, comm services, cons disc, utilities
].join(',');

export default async function handler(req, res) {
  // CORS so the browser can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (!POLYGON_KEY) {
    return res.status(500).json({ error: 'POLYGON_API_KEY not set in environment variables.' });
  }

  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${TICKERS}&apiKey=${POLYGON_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Polygon error: ${text}` });
    }

    const data = await response.json();

    // Shape the response into something easy for the dashboard to consume
    const shaped = {};
    for (const item of (data.tickers || [])) {
      shaped[item.ticker] = {
        ticker:   item.ticker,
        price:    item.day?.c   ?? item.prevDay?.c ?? null,  // today's close or prev close
        open:     item.day?.o   ?? null,
        high:     item.day?.h   ?? null,
        low:      item.day?.l   ?? null,
        prevClose:item.prevDay?.c ?? null,
        change:   item.todaysChange ?? null,
        changePct:item.todaysChangePerc ?? null,
        volume:   item.day?.v   ?? null,
        updated:  item.updated  ?? null,
      };
    }

    // Cache for 60 seconds on Vercel's CDN edge
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json({ tickers: shaped, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('quotes error:', err);
    return res.status(500).json({ error: err.message });
  }
}
