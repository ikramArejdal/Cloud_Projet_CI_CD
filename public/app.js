// ═══════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════
const API_URL = '';

let currentToken    = localStorage.getItem('token');
let currentUser     = JSON.parse(localStorage.getItem('user') || 'null');
let currentFilter   = 'all';
let currentPriority = 'medium'; // priorité sélectionnée pour la nouvelle tâche
let tasks = [];

// ═══════════════════════════════════════════
// THÈME
// ═══════════════════════════════════════════
function initTheme() {
  const saved      = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  // Sync toutes les paires moon/sun
  document.querySelectorAll('.icon-moon').forEach(el => el.classList.toggle('hidden', theme === 'light'));
  document.querySelectorAll('.icon-sun').forEach(el  => el.classList.toggle('hidden', theme === 'dark'));
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ═══════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  if (currentToken && currentUser) {
    showApp();
  } else {
    showAuth();
  }

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('new-task-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') addTask();
  });
});

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function switchTab(tab, event) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  hideMessage();
}

function showAuth() {
  document.getElementById('auth-page').classList.add('active');
  document.getElementById('app-page').classList.remove('active');
}

function showApp() {
  document.getElementById('auth-page').classList.remove('active');
  document.getElementById('app-page').classList.add('active');

  const username = currentUser?.username || 'Utilisateur';
  const nameEl   = document.getElementById('user-name');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl)   nameEl.textContent   = username;
  if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();

  loadTasks();
}

// ═══════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  setLoading(e.target, true);
  try {
    const res  = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erreur de connexion');
    saveSession(data.token, data.user);
    showApp();
  } catch (err) {
    showMessage(err.message, 'error');
  } finally {
    setLoading(e.target, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  setLoading(e.target, true);
  try {
    const res  = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur d'inscription");
    showMessage('Compte créé. Connectez-vous.', 'success');
    // Basculer vers login
    const [loginTab] = document.querySelectorAll('.tab-btn');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    loginTab.classList.add('active');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
  } catch (err) {
    showMessage(err.message, 'error');
  } finally {
    setLoading(e.target, false);
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentToken = null;
  currentUser  = null;
  tasks = [];
  showAuth();
}

function saveSession(token, user) {
  currentToken = token;
  currentUser  = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// ═══════════════════════════════════════════
// 401 HANDLER
// ═══════════════════════════════════════════
function handleUnauthorized(res) {
  if (res.status === 401) { logout(); return true; }
  return false;
}

// ═══════════════════════════════════════════
// PRIORITÉ
// ═══════════════════════════════════════════
function selectPriority(priority) {
  currentPriority = priority;
  document.querySelectorAll('.prio-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.priority === priority);
  });
}

// ═══════════════════════════════════════════
// TÂCHES
// ═══════════════════════════════════════════
async function loadTasks() {
  try {
    const res  = await fetch(`${API_URL}/api/tasks`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (handleUnauthorized(res)) return;
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    tasks = data.tasks || [];
    renderTasks();
    updateStats();
  } catch (err) {
    showMessage('Erreur : ' + err.message, 'error');
  }
}

async function addTask() {
  const input = document.getElementById('new-task-input');
  const title = input.value.trim();
  if (!title) return;
  try {
    const res  = await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
      body: JSON.stringify({ title, priority: currentPriority }),
    });
    if (handleUnauthorized(res)) return;
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    input.value = '';
    await loadTasks();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

async function toggleTask(id) {
  try {
    const res  = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (handleUnauthorized(res)) return;
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await loadTasks();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

async function deleteTask(id) {
  if (!confirm('Supprimer cette tâche ?')) return;
  try {
    const res  = await fetch(`${API_URL}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (handleUnauthorized(res)) return;
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    await loadTasks();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

// ═══════════════════════════════════════════
// RENDU
// ═══════════════════════════════════════════
const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const TRASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

function renderTasks() {
  const list = document.getElementById('task-list');

  const filtered = tasks.filter(t => {
    if (currentFilter === 'active')    return t.status !== 'completed';
    if (currentFilter === 'completed') return t.status === 'completed';
    return true;
  });

  if (filtered.length === 0) {
    const msgs = {
      all:       ['Aucune tâche', 'Ajoutez votre première tâche ci-dessus.'],
      active:    ['Aucune tâche en cours', 'Toutes vos tâches sont terminées.'],
      completed: ['Aucune tâche terminée', 'Commencez à cocher des tâches !'],
    };
    const [title, sub] = msgs[currentFilter];
    list.innerHTML = `
      <li class="task-empty">
        <div class="empty-graphic">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
        </div>
        <p class="empty-title">${title}</p>
        <p class="empty-sub">${sub}</p>
      </li>`;
    return;
  }

  list.innerHTML = filtered.map(task => {
    const done = task.status === 'completed';
    return `
    <li class="task-item ${done ? 'completed' : ''}" data-id="${task.id}">
      <div class="task-checkbox" onclick="toggleTask(${task.id})" title="${done ? 'Marquer en cours' : 'Marquer terminée'}">${done ? CHECK_SVG : ''}</div>
      <span class="task-title">${escapeHtml(task.title)}</span>
      <span class="task-priority priority-${task.priority || 'medium'}">${priorityLabel(task.priority)}</span>
      <span class="task-date">${formatDate(task.created_at)}</span>
      <button class="task-delete" onclick="deleteTask(${task.id})" title="Supprimer">${TRASH_SVG}</button>
    </li>`;
  }).join('');
}

function priorityLabel(p) {
  return { low: 'Basse', medium: 'Normale', high: 'Haute' }[p] || 'Normale';
}

function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const active    = total - completed;

  animateNumber('stat-total',     total);
  animateNumber('stat-active',    active);
  animateNumber('stat-completed', completed);

  // Badges sidebar
  const setB = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setB('badge-all',    total);
  setB('badge-active', active);
  setB('badge-done',   completed);

  // Progression
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const bar = document.getElementById('progress-bar');
  const lbl = document.getElementById('progress-label');
  if (bar) bar.style.width  = pct + '%';
  if (lbl) lbl.textContent  = pct + '%';
}

function animateNumber(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const dur   = 400;
  const t0    = performance.now();
  const tick  = now => {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.floor(start + (value - start) * p);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function filterTasks(filter, event) {
  currentFilter = filter;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  renderTasks();
}

// ═══════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════
function showMessage(text, type) {
  const msg = document.getElementById('auth-message');
  if (!msg) return;
  msg.textContent = text;
  msg.className   = `message ${type}`;
  msg.classList.remove('hidden');
  setTimeout(hideMessage, 5000);
}

function hideMessage() {
  const msg = document.getElementById('auth-message');
  if (msg) msg.classList.add('hidden');
}

function setLoading(form, loading) {
  const btn    = form.querySelector('.btn-primary');
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}