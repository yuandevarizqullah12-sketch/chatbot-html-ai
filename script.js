// DOM elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const errorToast = document.getElementById('errorToast');

// Conversation state
const messages = [
  { role: 'system', content: 'You are a helpful and friendly assistant.' }
];

let isLoading = false;

// Markdown parser (global from CDN)
const { marked } = window;

// Configure marked
if (marked) {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
}

// Initialize with a welcome message
function addWelcomeMessage() {
  if (messages.length === 1) {
    const welcome = "Hello! How can I help you today?";
    messages.push({ role: 'assistant', content: welcome });
    renderMessage('assistant', welcome);
  }
}
addWelcomeMessage();

// Event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea and enable/disable send button
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
  updateSendButton();
});

// Initial button state
updateSendButton();

function updateSendButton() {
  sendButton.disabled = !userInput.value.trim() || isLoading;
}

async function sendMessage() {
  const content = userInput.value.trim();
  if (!content || isLoading) return;

  // Add user message to history and UI
  messages.push({ role: 'user', content });
  renderMessage('user', content);

  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';
  updateSendButton();

  // Show typing indicator
  setLoading(true);

  try {
    const assistantReply = await callAPI();
    messages.push({ role: 'assistant', content: assistantReply });
    renderMessage('assistant', assistantReply);
  } catch (error) {
    console.error('API Error:', error);
    showError('Failed to get response. Please check your connection.');
    renderMessage('system', '⚠️ Sorry, an error occurred. Please try again.', true);
  } finally {
    setLoading(false);
    updateSendButton();
  }
}

async function callAPI() {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error ${response.status}`);
  }

  const data = await response.json();
  return data.content;
}

function renderMessage(role, content, isError = false) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', role);
  if (isError) messageDiv.classList.add('error');

  if (role === 'assistant' && marked) {
    // Render markdown for assistant messages
    messageDiv.innerHTML = marked.parse(content);
  } else {
    // Escape HTML for others
    const escaped = escapeHTML(content);
    messageDiv.innerHTML = escaped.replace(/\n/g, '<br>');
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

function showError(message) {
  errorToast.textContent = message;
  errorToast.classList.add('show');
  setTimeout(() => errorToast.classList.remove('show'), 4000);
}