export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, userId, isGuest } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  // ===== RATE LIMITING DENGAN FALLBACK =====
  let rateLimitEnabled = true;
  let rateLimitFn;
  
  try {
    const module = await import('./_lib/rateLimit.js');
    rateLimitFn = module.default;
  } catch (err) {
    console.error('Rate limit module not found, skipping rate limiting:', err.message);
    rateLimitEnabled = false;
  }
  
  if (rateLimitEnabled && rateLimitFn) {
    const identifier = isGuest ? `guest_${req.headers['x-forwarded-for'] || 'unknown'}` : userId;
    const limit = isGuest ? 5 : 30;
    const { allowed } = rateLimitFn(identifier, limit);
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
    }
  }

  // ===== API KEY =====
  const API_KEY = process.env.GROQ_API_KEY;
  
  if (!API_KEY) {
    console.error('GROQ_API_KEY is missing!');
    return res.status(500).json({ error: 'Server configuration error: missing API key' });
  }

  const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const MODEL = 'llama-3.1-8b-instant';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Groq API error' 
      });
    }

    const data = await response.json();
    return res.status(200).json({ content: data.choices[0].message.content });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}