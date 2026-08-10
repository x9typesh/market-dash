// api/movers.js
// Returns today's top 5 gainers and top 5 losers from Polygon snapshots
// Filters to stocks with price > $5 and volume > 500K to avoid penny stocks

const POLYGON_KEY = process.env.POLYGON_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (!POLYGON_KEY) {
    return res.status(500).json({ error: 'POLYGON_API_KEY not set.' });
  }

  try {
    // Polygon gainers snapshot
    const [gainersRes, losersRes] = await Promise.all([
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apiKey=${POLYGON_KEY}`),
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/losers?apiKey=${POLYGON_KEY}`)
    ]);

    const [gainersData, losersData] = await Promise.all([
      gainersRes.json(),
      losersRes.json()
    ]);

    const shape = (item) => ({
      ticker:    item.ticker,
      price:     item.day?.c ?? item.prevDay?.c ?? null,
      change:    item.todaysChange ?? null,
      changePct: item.todaysChangePerc ?? null,
      volume:    item.day?.v ?? null,
    });

    const filter = (item) => {
      const price = item.day?.c ?? item.prevDay?.c ?? 0;
      const vol   = item.day?.v ?? 0;
      return price >= 5 && vol >= 500000;
    };

    const gainers = (gainersData.tickers || []).filter(filter).slice(0, 5).map(shape);
    const losers  = (losersData.tickers  || []).filter(filter).slice(0, 5).map(shape);

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');
    return res.status(200).json({ gainers, losers, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('movers error:', err);
    return res.status(500).json({ error: err.message });
  }
}
