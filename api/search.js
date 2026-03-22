export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }

  console.log('Search query:', query);

  try {
    // Prioritize Wikipedia
    let results = [];
    
    console.log('Searching Wikipedia...');
    results = await searchWikipedia(query);
    console.log(`Wikipedia found ${results.length} results`);
    
    if (results.length === 0) {
      console.log('Searching RSS...');
      results = await searchRSS(query);
      console.log(`RSS found ${results.length} results`);
    }
    
    if (results.length === 0 && process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_ID) {
      console.log('Searching Google Custom Search...');
      console.log('GOOGLE_CSE_KEY exists:', !!process.env.GOOGLE_CSE_KEY);
      console.log('GOOGLE_CSE_ID exists:', !!process.env.GOOGLE_CSE_ID);
      results = await searchGoogleCustom(query);
      console.log(`Google CSE found ${results.length} results`);
    }
    
    console.log('Total results:', results.length);
    res.status(200).json({ results });
  } catch (error) {
    console.error('Search error DETAIL:', error.message);
    console.error('Search error stack:', error.stack);
    res.status(500).json({ error: 'Search failed: ' + error.message });
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
  
  if (!apiKey || !cx) {
    console.log('Google CSE credentials missing');
    return [];
  }
  
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
  console.log('Google CSE URL:', url.replace(apiKey, 'HIDDEN'));
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('Google CSE API error:', data.error);
      return [];
    }
    
    return (data.items || []).map(item => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      source: 'Google Search'
    }));
  } catch (error) {
    console.error('Google CSE fetch error:', error.message);
    return [];
  }
}