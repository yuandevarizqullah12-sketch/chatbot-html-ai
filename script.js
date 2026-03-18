// ===== CONFIG =====
const API_BASE = ''; // relative to current origin

// Global state
let currentUser = null;
let currentChatId = null;
let chats = []; // array of { id, title, messages, mode }
let messages = [];
let isLoading = false;
let currentMode = 'ai'; // 'ai' or 'search'

// DOM elements
const authModal = document.getElementById('authModal');
const app = document.getElementById('app');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const chatHistoryEl = document.getElementById('chatHistory');
const userInfo = document.getElementById('userInfo');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const newChatBtn = document.getElementById('newChatBtn');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const errorToast = document.getElementById('errorToast');
const modeButtons = document.querySelectorAll('.mode-btn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const demoBtn = document.getElementById('demoBtn');

// Markdown parser
const { marked } = window;
if (marked) {
  marked.setOptions({ breaks: true, gfm: true });
}

// ===== HELPER FUNCTIONS =====
function showError(msg) {
  errorToast.textContent = msg;
  errorToast.classList.add('show');
  setTimeout(() => errorToast.classList.remove('show'), 4000);
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMessage(role, content, isError = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}${isError ? ' error' : ''}`;

  if (role === 'assistant' && marked) {
    msgDiv.innerHTML = marked.parse(content);
  } else {
    msgDiv.innerHTML = escapeHTML(content).replace(/\n/g, '<br>');
  }

  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function clearMessages() {
  chatMessages.innerHTML = '';
}

function loadChat(chatId) {
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;
  currentChatId = chatId;
  messages = chat.messages || [];
  currentMode = chat.mode || 'ai';
  updateModeUI();
  clearMessages();
  messages.forEach(m => renderMessage(m.role, m.content));
}

async function loadHistory() {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API_BASE}/api/history?userId=${currentUser.id}`);
    if (res.ok) {
      chats = await res.json();
      renderHistory();
      if (chats.length > 0) {
        loadChat(chats[0].id);
      } else {
        newChat();
      }
    }
  } catch (err) {
    console.error('Failed to load history', err);
  }
}

function renderHistory() {
  chatHistoryEl.innerHTML = '';
  chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
    item.textContent = chat.title || 'New Chat';
    item.dataset.id = chat.id;
    item.addEventListener('click', () => {
      loadChat(chat.id);
      if (window.innerWidth <= 768) sidebar.classList.remove('open');
    });
    chatHistoryEl.appendChild(item);
  });
}

async function saveChat(chat) {
  if (!currentUser) return;
  try {
    await fetch(`${API_BASE}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, chat })
    });
  } catch (err) {
    console.error('Failed to save chat', err);
  }
}

function newChat() {
  const newId = Date.now().toString();
  const newChatObj = {
    id: newId,
    title: 'New Chat',
    messages: [{ role: 'assistant', content: 'Hello! How can I help you today?' }],
    mode: currentMode
  };
  chats.unshift(newChatObj);
  renderHistory();
  loadChat(newId);
  saveChat(newChatObj);
  if (window.innerWidth <= 768) sidebar.classList.remove('open');
}

// ===== AUTHENTICATION =====
function handleCredentialResponse(response) {
  // Decode JWT to get user info
  const data = parseJwt(response.credential);
  currentUser = {
    id: data.sub,
    name: data.name,
    email: data.email,
    picture: data.picture
  };
  authModal.style.display = 'none';
  app.style.display = 'flex';
  updateUserInfo();
  loadHistory();
}

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  return JSON.parse(jsonPayload);
}

function updateUserInfo() {
  if (currentUser) {
    userAvatar.src = currentUser.picture;
    userName.textContent = currentUser.name;
  }
}

// Demo login (guest)
demoBtn.addEventListener('click', () => {
  currentUser = {
    id: 'guest-' + Date.now(),
    name: 'Guest User',
    picture: 'https://ui-avatars.com/api/?name=Guest&background=10a37f&color=fff'
  };
  authModal.style.display = 'none';
  app.style.display = 'flex';
  updateUserInfo();
  loadHistory(); // This will load from mock DB; for guest, we can start empty
  // If no history, create new chat
  if (chats.length === 0) newChat();
});

googleSignInBtn.addEventListener('click', () => {
  google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse
  });
  google.accounts.id.prompt(); // or direct sign-in
});

logoutBtn.addEventListener('click', () => {
  currentUser = null;
  app.style.display = 'none';
  authModal.style.display = 'flex';
  chats = [];
  messages = [];
  clearMessages();
});

// ===== UI TOGGLES =====
menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

closeSidebarBtn.addEventListener('click', () => {
  sidebar.classList.remove('open');
});

modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    // Optionally update current chat's mode
    if (currentChatId) {
      const chat = chats.find(c => c.id === currentChatId);
      if (chat) {
        chat.mode = currentMode;
        saveChat(chat);
      }
    }
  });
});

function updateModeUI() {
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === currentMode);
  });
}

// ===== CHAT FUNCTIONALITY =====
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
  updateSendButton();
});

function updateSendButton() {
  sendButton.disabled = !userInput.value.trim() || isLoading;
}

async function sendMessage() {
  const content = userInput.value.trim();
  if (!content || isLoading) return;

  // Add user message to UI and history
  messages.push({ role: 'user', content });
  renderMessage('user', content);

  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';
  updateSendButton();

  // Update chat title if first message
  if (messages.length === 2) { // after welcome message + first user
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
      renderHistory();
      saveChat(chat);
    }
  }

  setLoading(true);

  try {
    let assistantReply;
    if (currentMode === 'search') {
      assistantReply = await callSearchAPI(content);
    } else {
      assistantReply = await callChatAPI(content);
    }

    messages.push({ role: 'assistant', content: assistantReply });
    renderMessage('assistant', assistantReply);

    // Save chat after response
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
      chat.messages = messages;
      saveChat(chat);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Failed to get response. Please try again.');
    renderMessage('system', '⚠️ Error: Could not get response. Please check your connection.', true);
  } finally {
    setLoading(false);
  }
}

async function callChatAPI(userContent) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [...messages, { role: 'user', content: userContent }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'API error');
  }

  const data = await response.json();
  return data.content;
}

async function callSearchAPI(userContent) {
  // First perform search
  const searchRes = await fetch(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: userContent })
  });

  if (!searchRes.ok) {
    throw new Error('Search failed');
  }

  const searchData = await searchRes.json();
  const searchContext = formatSearchResults(searchData.results);

  // Then call chat with context
  const enhancedMessages = [
    ...messages,
    { role: 'system', content: `Here is some up-to-date information from the web that may help answer the user's query:\n\n${searchContext}` },
    { role: 'user', content: userContent }
  ];

  const chatRes = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: enhancedMessages })
  });

  if (!chatRes.ok) {
    throw new Error('Chat API failed');
  }

  const chatData = await chatRes.json();
  return chatData.content;
}

function formatSearchResults(results) {
  if (!results || results.length === 0) return 'No search results found.';
  return results.map(r => `- ${r.title}: ${r.snippet} (${r.url})`).join('\n');
}

function setLoading(loading) {
  isLoading = loading;
  userInput.disabled = loading;
  updateSendButton();

  if (loading) {
    typingIndicator.classList.add('visible');
  } else {
    typingIndicator.classList.remove('visible');
  }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

newChatBtn.addEventListener('click', newChat);

// Initialize with modal visible
authModal.style.display = 'flex';
app.style.display = 'none';