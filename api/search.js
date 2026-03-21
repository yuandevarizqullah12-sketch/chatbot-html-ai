export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    // Prioritize Wikipedia
    let results = await searchWikipedia(query);
    if (results.length === 0) {
      results = await searchRSS(query);
    }
    if (results.length === 0 && process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_ID) {
      results = await searchGoogleCustom(query);
    }
    res.status(200).json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}

async function searchWikipedia(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  const response = await fetch(url);
  const data = await response.json();
  return (data.query?.search || []).map(item => ({
    title: item.title,
    snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
    source: 'Wikipedia'
  }));
}

async function searchRSS(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url);
  const text = await response.text();
  const titles = [...text.matchAll(/<title>([^<]*)<\/title>/g)].map(m => m[1]).slice(1);
  const links = [...text.matchAll(/<link>([^<]*)<\/link>/g)].map(m => m[1]).slice(1);
  return titles.slice(0, 5).map((title, i) => ({
    title,
    snippet: title,
    url: links[i] || '#',
    source: 'Google News'
  }));
}

async function searchGoogleCustom(query) {
  const apiKey = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const data = await response.json();
  return (data.items || []).map(item => ({
    title: item.title,
    snippet: item.snippet,
    url: item.link,
    source: 'Google Custom'
  }));
}