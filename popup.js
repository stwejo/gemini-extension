const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ── State ──────────────────────────────────────────────────────────────────
let apiKey = '';
let tasks = [];
let chatHistory = [];

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['geminiApiKey', 'tasks']);
  apiKey = data.geminiApiKey || '';
  tasks = data.tasks || [];

  renderTasks();

  if (!apiKey) {
    document.getElementById('settingsPanel').classList.remove('hidden');
  }

  setupTabs();
  setupSettings();
  setupChat();
  setupTasks();
});

// ── Tabs ───────────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
    });
  });
}

// ── Settings ───────────────────────────────────────────────────────────────
function setupSettings() {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const keyStatus = document.getElementById('keyStatus');

  if (apiKey) apiKeyInput.value = apiKey;

  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  saveKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;
    await chrome.storage.local.set({ geminiApiKey: key });
    apiKey = key;
    keyStatus.textContent = '✓ Key saved!';
    setTimeout(() => {
      keyStatus.textContent = '';
      settingsPanel.classList.add('hidden');
    }, 1500);
  });
}

// ── Chat ───────────────────────────────────────────────────────────────────
function setupChat() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  if (!apiKey) {
    alert('Please set your Gemini API key first (click ⚙).');
    document.getElementById('settingsPanel').classList.remove('hidden');
    return;
  }

  input.value = '';
  appendMessage('user', text);

  const loadingId = appendMessage('gemini', '...', true);
  document.getElementById('sendBtn').disabled = true;

  chatHistory.push({ role: 'user', parts: [{ text }] });

  try {
    const response = await callGemini(chatHistory);
    const reply = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    updateMessage(loadingId, reply);
  } catch (err) {
    updateMessage(loadingId, `Error: ${err.message}`);
  }

  document.getElementById('sendBtn').disabled = false;
}

function appendMessage(role, text, loading = false) {
  const messages = document.getElementById('chatMessages');
  const id = 'msg-' + Date.now();
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.id = id;
  div.innerHTML = `
    <span class="avatar">${role === 'gemini' ? '✦' : '👤'}</span>
    <div class="bubble${loading ? ' loading' : ''}">${escapeHtml(text)}</div>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function updateMessage(id, text) {
  const el = document.getElementById(id);
  if (el) {
    const bubble = el.querySelector('.bubble');
    bubble.classList.remove('loading');
    bubble.textContent = text;
    document.getElementById('chatMessages').scrollTop = 9999;
  }
}

// ── Tasks ──────────────────────────────────────────────────────────────────
function setupTasks() {
  document.getElementById('addTaskBtn').addEventListener('click', addTask);
  document.getElementById('taskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });
  document.getElementById('askGeminiBtn').addEventListener('click', askGeminiAboutTasks);
}

async function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  tasks.push({ id: Date.now(), text, done: false });
  input.value = '';
  await saveTasks();
  renderTasks();
}

async function toggleTask(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  await saveTasks();
  renderTasks();
}

async function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  await saveTasks();
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';
  if (tasks.length === 0) {
    list.innerHTML = '<li style="color:#555;text-align:center;padding:16px">No tasks yet. Add one above!</li>';
    return;
  }
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <input type="checkbox" ${task.done ? 'checked' : ''} data-id="${task.id}" />
      <span class="${task.done ? 'done' : ''}">${escapeHtml(task.text)}</span>
      <button class="del-btn" data-id="${task.id}">✕</button>
    `;
    li.querySelector('input').addEventListener('change', () => toggleTask(task.id));
    li.querySelector('.del-btn').addEventListener('click', () => deleteTask(task.id));
    list.appendChild(li);
  });
}

async function saveTasks() {
  await chrome.storage.local.set({ tasks });
}

async function askGeminiAboutTasks() {
  if (!apiKey) {
    alert('Please set your Gemini API key first (click ⚙).');
    document.getElementById('settingsPanel').classList.remove('hidden');
    return;
  }
  if (tasks.length === 0) {
    alert('Add some tasks first!');
    return;
  }

  const btn = document.getElementById('askGeminiBtn');
  const responseDiv = document.getElementById('geminiTaskResponse');
  btn.disabled = true;
  btn.textContent = '✦ Thinking...';
  responseDiv.classList.remove('hidden');
  responseDiv.textContent = 'Gemini is reviewing your tasks...';

  const pending = tasks.filter(t => !t.done).map(t => `- ${t.text}`).join('\n');
  const done = tasks.filter(t => t.done).map(t => `- ${t.text}`).join('\n');

  const prompt = `Here are my tasks:\n\nPending:\n${pending || 'None'}\n\nCompleted:\n${done || 'None'}\n\nPlease give me a brief, helpful summary and any suggestions to prioritize or tackle these tasks efficiently.`;

  try {
    const response = await callGemini([{ role: 'user', parts: [{ text: prompt }] }]);
    const reply = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    responseDiv.textContent = reply;
  } catch (err) {
    responseDiv.textContent = `Error: ${err.message}`;
  }

  btn.disabled = false;
  btn.textContent = '✦ Ask Gemini about my tasks';
}

// ── Gemini API ─────────────────────────────────────────────────────────────
async function callGemini(contents) {
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
