import { getUserChats, saveUserChat } from './_lib/db.js';

export default async function handler(req, res) {
  const { userId } = req.query;

  if (req.method === 'GET') {
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const chats = await getUserChats(userId);
    res.status(200).json(chats);
  } else if (req.method === 'POST') {
    const { userId, chat } = req.body;
    if (!userId || !chat) return res.status(400).json({ error: 'Missing data' });
    await saveUserChat(userId, chat);
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}