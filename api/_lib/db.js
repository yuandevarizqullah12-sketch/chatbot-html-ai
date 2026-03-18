// Mock in-memory database (for demo only). Use real DB in production.
const store = new Map(); // userId -> array of chats

export async function getUserChats(userId) {
  return store.get(userId) || [];
}

export async function saveUserChat(userId, chat) {
  const userChats = store.get(userId) || [];
  const index = userChats.findIndex(c => c.id === chat.id);
  if (index >= 0) {
    userChats[index] = chat;
  } else {
    userChats.unshift(chat);
  }
  store.set(userId, userChats);
}