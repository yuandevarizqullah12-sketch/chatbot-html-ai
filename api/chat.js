import rateLimit from './_lib/rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, userId, isGuest } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  // Rate limiting
  const identifier = isGuest ? `guest_${req.headers['x-forwarded-for'] || 'unknown'}` : userId;
  const limit = isGuest ? 5 : 30; // 5 per minute for guests, 30 for logged in
  const { allowed, remaining } = rateLimit(identifier, limit);
  if (!allowed) {
    return res.status(429).json({ error: `Rate limit exceeded. Please wait a moment. (${remaining} requests left this minute)` });
  }

  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
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
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errorData.error?.message || 'API error' });
    }

    const data = await response.json();
    res.status(200).json({ content: data.choices[0].message.content });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}