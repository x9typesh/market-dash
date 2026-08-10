// api/news.js
// Returns today's top 6 market news headlines from Polygon

const POLYGON_KEY = process.env.POLYGON_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (!POLYGON_KEY) {
    return res.status(500).json({ error: 'POLYGON_API_KEY not set.' });
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const url = `https://api.polygon.io/v2/reference/news?published_utc.gte=${today}&order=desc&limit=6&sort=published_utc&apiKey=${POLYGON_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    const articles = (data.results || []).map(a => ({
      title:     a.title,
      published: a.published_utc,
      url:       a.article_url,
      publisher: a.publisher?.name ?? '',
      tickers:   a.tickers?.slice(0, 3) ?? [],
    }));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=120');
    return res.status(200).json({ articles, fetchedAt: new Date().toISOString() });

  } catch (err) {
    console.error('news error:', err);
    return res.status(500).json({ error: err.message });
  }
}
