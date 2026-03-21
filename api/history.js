// Simple in-memory store (not persistent across invocations, but fine for demo)
const store = new Map();

export default async function handler(req, res) {
  const { userId } = req.query;

  if (req.method === 'GET') {
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const chats = store.get(userId) || [];
    res.status(200).json(chats);
  } else if (req.method === 'POST') {
    const { userId, chat } = req.body;
    if (!userId || !chat) return res.status(400).json({ error: 'Missing data' });
    const userChats = store.get(userId) || [];
    const index = userChats.findIndex(c => c.id === chat.id);
    if (index !== -1) {
      userChats[index] = chat;
    } else {
      userChats.unshift(chat);
    }
    store.set(userId, userChats);
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}