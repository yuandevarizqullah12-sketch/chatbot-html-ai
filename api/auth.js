export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Missing credential' });
  }

  try {
    // In production, verify the JWT with Google's public keys
    // For demo, we'll just decode and return user info
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

    // Here you would create a session or return a token
    res.status(200).json({
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}