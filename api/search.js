export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    // 1. Try Wikipedia
    let results = await searchWikipedia(query);
    if (results.length === 0) {
      // 2. Try Google RSS (simplified: use a public RSS feed search)
      results = await searchRSS(query);
    }
    if (results.length === 0) {
      // 3. Fallback to Google Custom Search
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
  return data.query?.search?.map(item => ({
    title: item.title,
    snippet: item.snippet.replace(/<\/?[^>]+(>|$)/g, ""),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
    source: 'Wikipedia'
  })) || [];
}

async function searchRSS(query) {
  // Using a simple RSS feed search via a public API (e.g., RSS Search)
  // For demo, we'll use a mock or a simple Google News RSS
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url);
  const text = await response.text();
  // Parse RSS (simplified: extract titles and links)
  const titleRegex = /<title>([^<]*)<\/title>/g;
  const linkRegex = /<link>([^<]*)<\/link>/g;
  const titles = [...text.matchAll(titleRegex)].map(m => m[1]).slice(1); // skip first
  const links = [...text.matchAll(linkRegex)].map(m => m[1]).slice(1);
  return titles.slice(0, 5).map((title, i) => ({
    title,
    snippet: title, // no snippet
    url: links[i] || '#',
    source: 'Google News'
  }));
}

async function searchGoogleCustom(query) {
  const API_KEY = process.env.VITE_GOOGLE_CSE_KEY;
  const CX = process.env.VITE_GOOGLE_CSE_ID;
  if (!API_KEY || !CX) return [];
  const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.items?.map(item => ({
    title: item.title,
    snippet: item.snippet,
    url: item.link,
    source: 'Google Custom'
  })) || [];
}