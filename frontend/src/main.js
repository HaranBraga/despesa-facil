import './style.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ---- API Client ----
const api = {
  async request(method, path, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      localStorage.removeItem('token');
      currentPage = 'login';
      render();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  },
  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put: (path, body) => api.request('PUT', path, body),
  delete: (path) => api.request('DELETE', path)
};

// ---- State ----
let currentPage = 'dashboard';
let selectedCnpjId = null;

// ---- Toast ----
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ---- Router ----
function navigate(page, params = {}) {
  currentPage = page;
  render(params);
}

// ---- App Shell ----
function renderShell(content, activeNav) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <span class="logo" style="display:flex;align-items:center;gap:8px;">
          <svg width="24" height="24" fill="none" stroke="var(--accent)" stroke-width="2.5" viewBox="0 0 24 24">
            <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path>
          </svg>
          <span class="text-gradient">Despesa Fácil</span>
        </span>
        <button class="btn-icon" id="btn-logout" title="Sair">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </header>
      <main class="page-content page-enter">
        ${content}
      </main>
      <nav class="bottom-nav">
        <button class="nav-item ${activeNav === 'dashboard' ? 'active' : ''}" data-page="dashboard">
          <span class="nav-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></span>
          <span class="nav-label">Início</span>
        </button>
        <button class="nav-item nav-primary" data-page="lancamento">
          <span class="nav-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></span>
          <span class="nav-label">Lançar</span>
        </button>
        <button class="nav-item ${activeNav === 'historico' ? 'active' : ''}" data-page="historico">
          <span class="nav-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg></span>
          <span class="nav-label">Histórico</span>
        </button>
        <button class="nav-item ${activeNav === 'relatorio' ? 'active' : ''}" data-page="relatorio">
          <span class="nav-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span>
          <span class="nav-label">Relatório</span>
        </button>
        <button class="nav-item ${activeNav === 'config' ? 'active' : ''}" data-page="config">
          <span class="nav-icon"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></span>
          <span class="nav-label">Config</span>
        </button>
      </nav>
    </div>
  `;
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('login');
  });
}

// ---- Render ----
async function render(params = {}) {
  const token = localStorage.getItem('token');
  const publicPages = ['login', 'register'];

  if (!token && !publicPages.includes(currentPage)) {
    currentPage = 'login';
  }

  switch (currentPage) {
    case 'login': return renderLogin();
    case 'register': return renderRegister();
    case 'dashboard': return renderDashboard();
    case 'lancamento': return renderLancamento(params);
    case 'historico': return renderHistorico();
    case 'relatorio': return renderRelatorio();
    case 'config': return renderConfig();
    default: return renderDashboard();
  }
}

// ================= LOGIN =================
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-logo" style="display:flex;align-items:center;justify-content:center;gap:12px;">
        <svg width="32" height="32" fill="none" stroke="url(#theme-grad)" stroke-width="2.5" viewBox="0 0 24 24">
          <defs><linearGradient id="theme-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4f9cf9"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient></defs>
          <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path>
        </svg>
        <span class="text-gradient">Despesa Fácil</span>
      </div>
      <p class="auth-sub">Gestão de despesas por CNPJ</p>
      <div class="card auth-card gap-16">
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input id="l-email" type="email" class="form-input" placeholder="seu@email.com" inputmode="email" />
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input id="l-pass" type="password" class="form-input" placeholder="••••••" />
        </div>
        <button class="btn btn-primary" id="btn-login">Entrar</button>
        <p class="text-center text-sm text-muted mt-8">
          Não tem conta? <a href="#" id="go-register" style="color:var(--accent)">Cadastre-se</a>
        </p>
      </div>
    </div>
  `;
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim();
    const password = document.getElementById('l-pass').value;
    if (!email || !password) return showToast('Preencha todos os campos', 'error');
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      navigate('dashboard');
    } catch (e) { showToast(e.message, 'error'); }
  });
  document.getElementById('go-register').addEventListener('click', (e) => {
    e.preventDefault(); navigate('register');
  });
  document.getElementById('l-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('l-pass').focus(); });
  document.getElementById('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-login').click(); });
}

// ================= REGISTER =================
async function renderRegister() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-logo" style="display:flex;align-items:center;justify-content:center;gap:12px;">
        <svg width="32" height="32" fill="none" stroke="url(#theme-grad)" stroke-width="2.5" viewBox="0 0 24 24">
          <defs><linearGradient id="theme-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4f9cf9"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient></defs>
          <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path>
        </svg>
        <span class="text-gradient">Despesa Fácil</span>
      </div>
      <p class="auth-sub">Crie sua conta gratuita</p>
      <div class="card auth-card gap-16">
        <div class="form-group">
          <label class="form-label">Nome completo</label>
          <input id="r-name" type="text" class="form-input" placeholder="João Silva" />
        </div>
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input id="r-email" type="email" class="form-input" placeholder="seu@email.com" inputmode="email" />
        </div>
        <div class="form-group">
          <label class="form-label">Escritório Contábil</label>
          <select id="r-office" class="form-select">
            <option value="">Carregando...</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input id="r-pass" type="password" class="form-input" placeholder="Mín. 6 caracteres" />
        </div>
        <button class="btn btn-primary" id="btn-register">Criar conta</button>
        <p class="text-center text-sm text-muted mt-8">
          Já tem conta? <a href="#" id="go-login" style="color:var(--accent)">Entrar</a>
        </p>
      </div>
    </div>
  `;

  try {
    // Usando request direto sem auth para pegar os escritórios na tela de registro
    const res = await fetch(`${API_URL}/offices`);
    const offices = await res.json();
    const select = document.getElementById('r-office');
    if (offices.length === 0) {
      select.innerHTML = '<option value="">Nenhum escritório disponível</option>';
      select.disabled = true;
    } else {
      select.innerHTML = '<option value="">Selecione seu escritório...</option>' +
        offices.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
    }
  } catch (e) {
    document.getElementById('r-office').innerHTML = '<option value="">Erro ao carregar</option>';
  }

  document.getElementById('btn-register').addEventListener('click', async () => {
    const name = document.getElementById('r-name').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const office_id = document.getElementById('r-office').value;
    const password = document.getElementById('r-pass').value;

    if (!name || !email || !password) return showToast('Preencha nome, email e senha', 'error');
    if (!office_id) return showToast('Selecione o seu escritório de contabilidade', 'error');

    try {
      const data = await api.post('/auth/register', { name, email, password, office_id });
      localStorage.setItem('token', data.token);
      navigate('dashboard');
    } catch (e) { showToast(e.message, 'error'); }
  });
  document.getElementById('go-login').addEventListener('click', (e) => { e.preventDefault(); navigate('login'); });
}

// ================= DASHBOARD =================
async function renderDashboard() {
  renderShell('<div class="skeleton" style="height:120px;margin-bottom:16px"></div><div class="skeleton" style="height:80px"></div>', 'dashboard');
  try {
    const cnpjs = await api.get('/cnpjs');
    if (cnpjs.length === 0) {
      renderShell(dashboardEmpty(), 'dashboard');
      setupDashboardEvents([], null);
      return;
    }
    if (!selectedCnpjId || !cnpjs.find(c => c.id === selectedCnpjId)) {
      selectedCnpjId = cnpjs[0].id;
    }
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const report = await api.get(`/reports/monthly?cnpj_id=${selectedCnpjId}&month=${month}&year=${year}`);
    renderShell(dashboardContent(cnpjs, report, month, year), 'dashboard');
    setupDashboardEvents(cnpjs, report);
  } catch (e) {
    renderShell(`<div class="empty-state"><div class="empty-icon"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div><p class="empty-title">${e.message}</p></div>`, 'dashboard');
  }
}

function dashboardEmpty() {
  return `
    <div class="empty-state" style="margin-top:40px">
      <div class="empty-icon"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg></div>
      <p class="empty-title">Nenhum CNPJ cadastrado</p>
      <p class="empty-sub">Vá em Configurações para adicionar seu primeiro CNPJ</p>
      <button class="btn btn-primary btn-sm mt-16" id="go-config-btn">Ir para Configurações</button>
    </div>
  `;
}

function dashboardContent(cnpjs, report, month, year) {
  const MONTHS = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const cnpj = cnpjs.find(c => c.id === selectedCnpjId);
  const topCats = report.categories.filter(c => parseFloat(c.total) > 0).slice(0, 5);

  return `
    <div class="gap-16">
      <div class="cnpj-selector" id="cnpj-selector">
        ${cnpjs.map(c => `
          <button class="cnpj-pill ${c.id === selectedCnpjId ? 'active' : ''}" data-cnpj="${c.id}">
            ${c.razao_social}
          </button>
        `).join('')}
      </div>

      <div class="card" style="background: linear-gradient(135deg, rgba(79,156,249,0.15), rgba(124,58,237,0.15)); border-color: rgba(79,156,249,0.2);">
        <div class="stat-label">Total em ${MONTHS[month]}/${year}</div>
        <div class="stat-value accent" style="font-size:2rem">
          ${formatCurrency(report.total_geral)}
        </div>
        <div class="text-sm text-muted mt-8">${cnpj?.cnpj || ''} — ${cnpj?.razao_social || ''}</div>
      </div>

      <div class="section-header">
        <div>
          <div class="section-title">Maiores despesas</div>
          <div class="section-sub">${MONTHS[month]}/${year}</div>
        </div>
        <button class="btn btn-outline btn-sm" id="btn-see-report">Ver tudo</button>
      </div>

      ${topCats.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg></div>
          <p class="empty-title">Sem lançamentos este mês</p>
          <p class="empty-sub">Toque em Nova Despesa para lançar</p>
        </div>
      ` : `
        <div class="gap-8">
          ${topCats.map(cat => `
            <div class="report-row">
              <span class="report-cat-name">${cat.category_name}</span>
              <span class="report-amount">${formatCurrency(cat.total)}</span>
            </div>
          `).join('')}
        </div>
      `}

      <button class="btn btn-primary" id="btn-do-lancamento" style="display:flex;align-items:center;justify-content:center;gap:8px;">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Lançar Despesa
      </button>
    </div>
  `;
}

function setupDashboardEvents(cnpjs, report) {
  document.querySelectorAll('[data-cnpj]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCnpjId = btn.dataset.cnpj;
      renderDashboard();
    });
  });
  document.getElementById('go-config-btn')?.addEventListener('click', () => navigate('config'));
  document.getElementById('btn-do-lancamento')?.addEventListener('click', () => navigate('lancamento'));
  document.getElementById('btn-see-report')?.addEventListener('click', () => navigate('relatorio'));
}

// ================= LANCAMENTO =================
let lancamentoTab = 'diario';

async function renderLancamento(params = {}) {
  renderShell('<div class="skeleton" style="height:200px"></div>', 'lancamento');
  try {
    const cnpjs = await api.get('/cnpjs');
    if (cnpjs.length === 0) {
      renderShell(`<div class="empty-state" style="margin-top:40px">
        <div class="empty-icon"><svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg></div>
        <p class="empty-title">Cadastre um CNPJ primeiro</p>
        <button class="btn btn-primary btn-sm mt-16" id="go-cfg-btn">Ir para Config</button>
      </div>`, 'lancamento');
      document.getElementById('go-cfg-btn')?.addEventListener('click', () => navigate('config'));
      return;
    }

    if (!selectedCnpjId || !cnpjs.find(c => c.id === selectedCnpjId)) {
      selectedCnpjId = cnpjs[0].id;
    }

    const prefs = await api.get(`/preferences/${selectedCnpjId}`);
    const visibleCats = prefs.filter(p => p.is_visible);
    const today = new Date().toLocaleDateString('sv');
    const now = new Date();

    renderShell(lancamentoHtml(cnpjs, visibleCats, today, now), 'lancamento');
    setupLancamentoEvents(cnpjs, visibleCats, now);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function getMonthName(m) {
  return ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m];
}

function lancamentoHtml(cnpjs, categories, today, now) {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const isDiario = lancamentoTab === 'diario';

  const tabStyle = (active) => active
    ? 'flex:1;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:white;font-weight:700;cursor:pointer;font-family:inherit;font-size:0.9rem;'
    : 'flex:1;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-secondary);font-weight:600;cursor:pointer;font-family:inherit;font-size:0.9rem;';

  // Filtra as categorias ativas pelo tipo da aba para a renderização inicial
  const catsDiario = categories.filter(c => c.tipo === 'diario' || c.tipo === 'ambos');
  const catsMensal = categories.filter(c => c.tipo === 'mensal' || c.tipo === 'ambos');

  const renderRow = (cat) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
      <span style="flex:1;font-size:0.9rem;font-weight:500;color:var(--text-primary)">
        ${cat.name}
      </span>
      <div style="position:relative">
        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:0.85rem;pointer-events:none">R$</span>
        <input type="number" inputmode="decimal" step="0.01" min="0"
          class="form-input amount-input" data-cat-id="${cat.category_id}"
          style="width:120px;padding:8px 8px 8px 32px;font-size:1rem;text-align:right" placeholder="0,00" />
      </div>
    </div>
  `;

  return `
    <div class="gap-16" style="padding-bottom: 80px;">
      <div class="form-group">
        <label class="form-label">Empresa (CNPJ)</label>
        <select id="l-cnpj" class="form-select">
          ${cnpjs.map(c => `<option value="${c.id}" ${c.id === selectedCnpjId ? 'selected' : ''}>${c.razao_social} — ${c.cnpj}</option>`).join('')}
        </select>
      </div>

      <div style="display:flex;gap:8px;">
        <button id="tab-diario" style="${tabStyle(isDiario)};display:flex;align-items:center;justify-content:center;gap:6px;">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg> Diária
        </button>
        <button id="tab-mensal" style="${tabStyle(!isDiario)};display:flex;align-items:center;justify-content:center;gap:6px;">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Mensal
        </button>
      </div>

      <!-- TAB DIÁRIO -->
      <div id="tab-diario-content" style="display:${isDiario ? 'flex' : 'none'};flex-direction:column;gap:16px">
        <div class="form-group">
          <label class="form-label">Data do Lançamento</label>
          <input id="l-date" type="date" class="form-input" value="${today}" />
        </div>
        <p class="text-sm text-muted" style="text-align:center;margin:0">Preencha o valor das despesas do dia:</p>
        <div id="diario-grid" class="gap-8">
          ${catsDiario.length === 0 ? '<p class="text-sm text-muted text-center">Nenhuma despesa diária configurada.</p>' : catsDiario.map(renderRow).join('')}
        </div>
      </div>

      <!-- TAB MENSAL -->
      <div id="tab-mensal-content" style="display:${!isDiario ? 'flex' : 'none'};flex-direction:column;gap:16px">
        <div class="period-nav" style="margin-bottom:0">
          <button class="period-nav-btn" id="prev-month-l">‹</button>
          <span class="period-label" id="period-label-l">${getMonthName(month)} / ${year}</span>
          <button class="period-nav-btn" id="next-month-l">›</button>
        </div>
        <p class="text-sm text-muted" style="text-align:center;margin:0">Preencha o valor das despesas do mês:</p>
        <div id="mensal-grid" class="gap-8">
          ${catsMensal.length === 0 ? '<p class="text-sm text-muted text-center">Nenhuma despesa mensal configurada.</p>' : catsMensal.map(renderRow).join('')}
        </div>
      </div>
      
      <!-- Sticky Save Button -->
      <div class="sticky-save-bar">
        <button class="btn btn-primary" id="btn-salvar-lancamento" style="width:100%;max-width:500px;box-shadow:0 4px 12px rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center;gap:8px;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Salvar Despesas
        </button>
      </div>
    </div>
  `;
}

function setupLancamentoEvents(cnpjs, categories, now) {
  let currentMonth = now.getMonth() + 1;
  let currentYear = now.getFullYear();

  function setTab(tab) {
    lancamentoTab = tab;
    const isDiario = tab === 'diario';
    document.getElementById('tab-diario-content').style.display = isDiario ? 'flex' : 'none';
    document.getElementById('tab-mensal-content').style.display = !isDiario ? 'flex' : 'none';
    const activeStyle = 'flex:1;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:white;font-weight:700;cursor:pointer;font-family:inherit;font-size:0.9rem;';
    const inactiveStyle = 'flex:1;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-secondary);font-weight:600;cursor:pointer;font-family:inherit;font-size:0.9rem;';
    document.getElementById('tab-diario').style.cssText = isDiario ? activeStyle : inactiveStyle;
    document.getElementById('tab-mensal').style.cssText = !isDiario ? activeStyle : inactiveStyle;
  }

  document.getElementById('tab-diario').addEventListener('click', () => setTab('diario'));
  document.getElementById('tab-mensal').addEventListener('click', () => setTab('mensal'));

  // Define as categorias de cada tela baseado no tipo
  const renderGrid = (containerId, cats) => {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    if (cats.length === 0) {
      grid.innerHTML = '<p class="text-sm text-muted text-center">Nenhuma despesa configurada para esta aba.</p>';
      return;
    }
    grid.innerHTML = cats.map(cat => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
        <span style="flex:1;font-size:0.9rem;font-weight:500;color:var(--text-primary)">${cat.name}</span>
        <div style="position:relative">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:0.85rem;pointer-events:none">R$</span>
          <input type="number" inputmode="decimal" step="0.01" min="0" class="form-input amount-input" data-cat-id="${cat.category_id}" style="width:120px;padding:8px 8px 8px 32px;font-size:1rem;text-align:right" placeholder="0,00" />
        </div>
      </div>`).join('');
  };

  // CNPJ change — reload categories array
  document.getElementById('l-cnpj').addEventListener('change', async (e) => {
    selectedCnpjId = e.target.value;
    const prefs = await api.get(`/preferences/${selectedCnpjId}`).catch(() => []);
    const visibleCats = prefs.filter(p => p.is_visible);
    renderGrid('diario-grid', visibleCats.filter(c => c.tipo === 'diario' || c.tipo === 'ambos'));
    renderGrid('mensal-grid', visibleCats.filter(c => c.tipo === 'mensal' || c.tipo === 'ambos'));
  });

  // Mensal — navegação
  document.getElementById('prev-month-l').addEventListener('click', () => {
    currentMonth--; if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    document.getElementById('period-label-l').textContent = `${getMonthName(currentMonth)} / ${currentYear}`;
  });
  document.getElementById('next-month-l').addEventListener('click', () => {
    currentMonth++; if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    document.getElementById('period-label-l').textContent = `${getMonthName(currentMonth)} / ${currentYear}`;
  });

  // Salvar Bulk (Serve para Diário e Mensal)
  document.getElementById('btn-salvar-lancamento').addEventListener('click', async () => {
    const isDiario = lancamentoTab === 'diario';
    const cnpj_id = document.getElementById('l-cnpj').value;

    const selector = isDiario ? '#diario-grid input[data-cat-id]' : '#mensal-grid input[data-cat-id]';
    const inputs = document.querySelectorAll(selector);

    const items = Array.from(inputs)
      .filter(inp => inp.value && parseFloat(inp.value) > 0)
      .map(inp => ({ category_id: inp.dataset.catId, amount: parseFloat(inp.value) }));

    if (items.length === 0) return showToast('Preencha o valor de pelo menos uma despesa', 'error');

    const payload = {
      cnpj_id,
      items,
      period_month: currentMonth,
      period_year: currentYear,
      tipo: isDiario ? 'diario' : 'mensal'
    };

    if (isDiario) {
      const expense_date = document.getElementById('l-date').value;
      if (!expense_date) return showToast('Selecione a data', 'error');
      payload.expense_date = expense_date;

      const dateObj = new Date(expense_date);
      payload.period_month = dateObj.getUTCMonth() + 1;
      payload.period_year = dateObj.getUTCFullYear();
    }

    try {
      const btn = document.getElementById('btn-salvar-lancamento');
      btn.disabled = true; btn.textContent = 'Salvando...';
      const result = await api.post('/expenses/bulk', payload);

      showToast(`${result.inserted} despesa(s) salva(s) com sucesso!`, 'success');
      inputs.forEach(inp => inp.value = ''); // Limpa formulário

      btn.disabled = false; btn.innerHTML = '✅ Salvar Despesas';
    } catch (e) {
      showToast(e.message, 'error');
      const btn = document.getElementById('btn-salvar-lancamento');
      if (btn) { btn.disabled = false; btn.innerHTML = '✅ Salvar Despesas'; }
    }
  });
}

// ================= HISTÓRICO =================
async function renderHistorico() {
  renderShell('<div class="skeleton" style="height:50px;margin-bottom:12px"></div><div class="gap-8"><div class="skeleton" style="height:64px"></div><div class="skeleton" style="height:64px"></div><div class="skeleton" style="height:64px"></div></div>', 'historico');
  try {
    const cnpjs = await api.get('/cnpjs');
    if (cnpjs.length === 0) { renderShell(dashboardEmpty(), 'historico'); return; }
    if (!selectedCnpjId) selectedCnpjId = cnpjs[0].id;

    const today = new Date().toLocaleDateString('sv');
    const expenses = await api.get(`/expenses?cnpj_id=${selectedCnpjId}&date=${today}`);

    renderShell(historicoHtml(cnpjs, expenses, today), 'historico');
    setupHistoricoEvents(cnpjs, today);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function historicoHtml(cnpjs, expenses, date) {
  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  return `
    <div class="gap-16">
      <div class="section-header">
        <div class="section-title" style="display:flex;align-items:center;gap:8px;">
          <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> Histórico
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Empresa</label>
        <select id="h-cnpj" class="form-select">
          ${cnpjs.map(c => `<option value="${c.id}" ${c.id === selectedCnpjId ? 'selected' : ''}>${c.razao_social}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data</label>
        <input id="h-date" type="date" class="form-input" value="${date}" />
      </div>
      ${expenses.length > 0 ? `
        <div class="stat-card">
          <div class="stat-label">Total do dia</div>
          <div class="stat-value success">${formatCurrency(total)}</div>
        </div>
      ` : ''}
      <div class="gap-8" id="expenses-list">
        ${renderExpenseList(expenses)}
      </div>
    </div>
  `;
}

function renderExpenseList(expenses) {
  if (expenses.length === 0) return `
    <div class="empty-state">
      <div class="empty-icon"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg></div>
      <p class="empty-title">Nenhum lançamento nesta data</p>
    </div>
  `;
  return expenses.map(e => `
    <div class="expense-item" data-id="${e.id}">
      <div class="expense-icon"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
      <div class="expense-info">
        <div class="expense-name">${e.category_name}</div>
        <div class="expense-date">${e.description || formatDate(e.expense_date)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="expense-amount">${formatCurrency(e.amount)}</span>
        <button class="btn btn-danger btn-sm" data-del="${e.id}" style="display:flex;align-items:center;justify-content:center;padding:6px;border-radius:6px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function setupHistoricoEvents(cnpjs, initialDate) {
  async function loadExpenses() {
    const cnpj_id = document.getElementById('h-cnpj')?.value;
    const date = document.getElementById('h-date')?.value;
    if (!cnpj_id || !date) return;
    const expenses = await api.get(`/expenses?cnpj_id=${cnpj_id}&date=${date}`).catch(() => []);
    document.getElementById('expenses-list').innerHTML = renderExpenseList(expenses);
    setupDeleteHandlers();
  }

  function setupDeleteHandlers() {
    document.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Excluir este lançamento?')) return;
        try {
          await api.delete(`/expenses/${btn.dataset.del}`);
          showToast('Removido!', 'success');
          loadExpenses();
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
  }

  document.getElementById('h-cnpj').addEventListener('change', (e) => { selectedCnpjId = e.target.value; loadExpenses(); });
  document.getElementById('h-date').addEventListener('change', loadExpenses);
  setupDeleteHandlers();
}

// ================= RELATÓRIO =================
async function renderRelatorio() {
  renderShell('<div class="skeleton" style="height:200px"></div>', 'relatorio');
  try {
    const cnpjs = await api.get('/cnpjs');
    if (cnpjs.length === 0) { renderShell(dashboardEmpty(), 'relatorio'); return; }
    if (!selectedCnpjId) selectedCnpjId = cnpjs[0].id;
    const now = new Date();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();
    await loadRelatorio(cnpjs, month, year);
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadRelatorio(cnpjs, month, year) {
  const MONTHS = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const report = await api.get(`/reports/monthly?cnpj_id=${selectedCnpjId}&month=${month}&year=${year}`);

  const contentHtml = `
    <div class="gap-16">
      <div class="section-title" style="display:flex;align-items:center;gap:8px;">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> Relatório Mensal
      </div>
      <div class="form-group">
        <label class="form-label">Empresa</label>
        <select id="r-cnpj" class="form-select">
          ${cnpjs.map(c => `<option value="${c.id}" ${c.id === selectedCnpjId ? 'selected' : ''}>${c.razao_social}</option>`).join('')}
        </select>
      </div>
      <div class="period-nav">
        <button class="period-nav-btn" id="prev-month">‹</button>
        <span class="period-label">${MONTHS[month]} / ${year}</span>
        <button class="period-nav-btn" id="next-month">›</button>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total do mês</div>
        <div class="stat-value accent">${formatCurrency(report.total_geral)}</div>
      </div>
      <div class="card">
        <div class="section-title" style="margin-bottom:12px">Por categoria</div>
        ${report.categories.map(cat => `
          <div class="report-row">
            <span class="report-cat-name">${cat.category_name}${cat.is_filial ? ' <span style="font-size:0.7rem;color:var(--accent-2)">(Filial)</span>' : ''}</span>
            <span class="report-amount ${parseFloat(cat.total) === 0 ? 'zero' : ''}">${formatCurrency(cat.total)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  renderShell(contentHtml, 'relatorio');

  document.getElementById('r-cnpj').addEventListener('change', (e) => {
    selectedCnpjId = e.target.value;
    loadRelatorio(cnpjs, month, year);
  });
  document.getElementById('prev-month').addEventListener('click', () => {
    month--; if (month < 1) { month = 12; year--; }
    loadRelatorio(cnpjs, month, year);
  });
  document.getElementById('next-month').addEventListener('click', () => {
    month++; if (month > 12) { month = 1; year++; }
    loadRelatorio(cnpjs, month, year);
  });
}

// ================= CONFIG =================
async function renderConfig() {
  renderShell('<div class="skeleton" style="height:300px"></div>', 'config');
  try {
    const [cnpjs, categories] = await Promise.all([
      api.get('/cnpjs'),
      api.get('/categories')
    ]);
    if (!selectedCnpjId && cnpjs.length > 0) selectedCnpjId = cnpjs[0].id;

    let prefs = selectedCnpjId ? await api.get(`/preferences/${selectedCnpjId}`).catch(() => []) : [];
    renderShell(configHtml(cnpjs, categories, prefs), 'config');
    setupConfigEvents(cnpjs, categories, prefs);
  } catch (e) { showToast(e.message, 'error'); }
}

function configHtml(cnpjs, categories, prefs) {
  return `
    <div class="gap-16">
      <div class="section-title" style="display:flex;align-items:center;gap:8px;">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        Configurações
      </div>

      <!-- CNPJs -->
      <div class="card">
        <div class="section-header" style="margin-bottom:12px">
          <div class="section-title" style="display:flex;align-items:center;gap:6px;">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg> Meus CNPJs
          </div>
          <button class="btn btn-outline btn-sm" id="btn-add-cnpj" style="display:flex;align-items:center;gap:4px;"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Novo</button>
        </div>
        <div class="gap-8" id="cnpj-list">
          ${cnpjs.length === 0 ? '<p class="text-muted text-sm">Nenhum CNPJ cadastrado</p>' :
      cnpjs.map(c => `
              <div class="expense-item">
                <div class="expense-icon" style="background:var(--bg-app);color:var(--text-primary)"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg></div>
                <div class="expense-info">
                  <div class="expense-name">${c.razao_social}</div>
                  <div class="expense-date" style="font-family:monospace">${c.cnpj}</div>
                </div>
                <button class="btn btn-danger btn-sm" data-del-cnpj="${c.id}">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            `).join('')}
        </div>
      </div>

      <!-- Preferências de despesas -->
      ${cnpjs.length > 0 ? `
        <div class="card">
          <div class="section-header" style="margin-bottom:12px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
              <div class="section-title" style="display:flex;align-items:center;gap:6px;">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 1 0-6 0v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg> Minhas Despesas
              </div>
              <button class="btn btn-primary btn-sm" id="btn-save-prefs" style="padding:6px 12px">Salvar</button>
            </div>
            <p class="text-sm text-muted" style="margin:0">Marque onde a despesa deve aparecer no Lançamento.</p>
          </div>
          <div class="form-group" style="margin-bottom: 16px">
            <select id="pref-cnpj" class="form-select">
              ${cnpjs.map(c => `<option value="${c.id}" ${c.id === selectedCnpjId ? 'selected' : ''}>${c.razao_social}</option>`).join('')}
            </select>
          </div>
          <div id="categorias-list" class="gap-8" style="margin-bottom:16px;">
            ${prefs.map((p, i) => `
              <div class="pref-item" data-id="${p.category_id}" style="display:flex;flex-direction:column;gap:8px;padding:12px;background:var(--bg-app);border:1px solid var(--border);border-radius:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-weight:600;font-size:0.95rem">${p.name}</span>
                  <button class="drag-toggle ${p.is_visible ? 'on' : ''}" data-visible="${p.is_visible ? '1' : '0'}" title="Visível no App"></button>
                </div>
                <div style="display:flex;gap:12px;margin-top:4px" class="type-checks">
                  <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
                     <input type="checkbox" class="check-diario" ${p.tipo === 'diario' || p.tipo === 'ambos' ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary)"> Diária
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
                     <input type="checkbox" class="check-mensal" ${p.tipo === 'mensal' || p.tipo === 'ambos' ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary)"> Mensal
                  </label>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Nova Despesa -->
      <div class="card">
        <div class="section-title" style="margin-bottom:12px;display:flex;align-items:center;gap:6px;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Criar Despesa
        </div>
        <div class="gap-12">
          <input id="new-cat-name" type="text" class="form-input" placeholder="Nome da nova despesa..." />
          <div style="display:flex;gap:12px;align-items:center">
             <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:500">
               <input type="radio" name="new-cat-tipo" value="diario" checked style="accent-color:var(--primary)"> Diária
             </label>
             <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:500">
               <input type="radio" name="new-cat-tipo" value="mensal" style="accent-color:var(--primary)"> Mensal
             </label>
             <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;font-weight:500">
               <input type="radio" name="new-cat-tipo" value="ambos" style="accent-color:var(--primary)"> Ambas
             </label>
          </div>
          <button class="btn btn-outline" id="btn-add-cat">Criar e Adicionar à Lista</button>
        </div>
      </div>
    </div>
  `;
}

async function setupConfigEvents(cnpjs, categories, prefs) {
  // Add CNPJ modal
  document.getElementById('btn-add-cnpj')?.addEventListener('click', () => {
    showAddCnpjModal();
  });

  // Delete CNPJ
  document.querySelectorAll('[data-del-cnpj]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Desativar este CNPJ?')) return;
      try {
        await api.delete(`/cnpjs/${btn.dataset.delCnpj}`);
        showToast('CNPJ removido', 'success');
        if (selectedCnpjId === btn.dataset.delCnpj) selectedCnpjId = null;
        renderConfig();
      } catch (e) { showToast(e.message, 'error'); }
    });
  });

  // Toggle visibility
  const setupToggles = () => {
    document.querySelectorAll('.drag-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const isOn = toggle.dataset.visible === '1';
        toggle.dataset.visible = isOn ? '0' : '1';
        toggle.classList.toggle('on', !isOn);
      });
    });
  };
  setupToggles();

  // Save Config / Preferences
  document.getElementById('btn-save-prefs')?.addEventListener('click', async () => {
    const items = document.querySelectorAll('.pref-item');
    const preferences = Array.from(items).map((item, i) => {
      const isVisible = item.querySelector('.drag-toggle').dataset.visible === '1';
      const isDiario = item.querySelector('.check-diario').checked;
      const isMensal = item.querySelector('.check-mensal').checked;
      let tipo = 'ambos';
      if (isDiario && !isMensal) tipo = 'diario';
      if (!isDiario && isMensal) tipo = 'mensal';
      if (!isDiario && !isMensal) tipo = 'ambos'; // Fallback se desmarcar os dois

      return {
        category_id: item.dataset.id,
        sort_order: i, // mantemos a ordem atual
        is_visible: isVisible,
        tipo
      };
    });

    try {
      await api.put(`/preferences/${selectedCnpjId}`, { preferences });
      showToast('Lista de despesas atualizada!', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });

  // Change CNPJ for preferences
  document.getElementById('pref-cnpj')?.addEventListener('change', async (e) => {
    selectedCnpjId = e.target.value;
    const newPrefs = await api.get(`/preferences/${selectedCnpjId}`).catch(() => []);
    const catList = document.getElementById('categorias-list');
    catList.innerHTML = newPrefs.map((p, i) => `
      <div class="pref-item" data-id="${p.category_id}" style="display:flex;flex-direction:column;gap:8px;padding:12px;background:var(--bg-app);border:1px solid var(--border);border-radius:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:600;font-size:0.95rem">${p.name}</span>
          <button class="drag-toggle ${p.is_visible ? 'on' : ''}" data-visible="${p.is_visible ? '1' : '0'}" title="Visível no App"></button>
        </div>
        <div style="display:flex;gap:12px;margin-top:4px" class="type-checks">
          <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
             <input type="checkbox" class="check-diario" ${p.tipo === 'diario' || p.tipo === 'ambos' ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary)"> Diária
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem;color:var(--text-secondary);cursor:pointer;">
             <input type="checkbox" class="check-mensal" ${p.tipo === 'mensal' || p.tipo === 'ambos' ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary)"> Mensal
          </label>
        </div>
      </div>
    `).join('');
    setupToggles();
  });

  // Add category
  document.getElementById('btn-add-cat')?.addEventListener('click', async () => {
    const name = document.getElementById('new-cat-name').value.trim();
    const tipo = document.querySelector('input[name="new-cat-tipo"]:checked').value;
    if (!name) return showToast('Digite o nome da categoria', 'error');

    try {
      const btn = document.getElementById('btn-add-cat');
      btn.disabled = true; btn.textContent = 'Adicionando...';

      const newCat = await api.post('/categories', { name, tipo });

      const allItems = document.querySelectorAll('.pref-item');
      let maxOrder = 0;
      allItems.forEach(i => { if (parseInt(i.dataset.order || 0) > maxOrder) maxOrder = parseInt(i.dataset.order || 0); });

      const prefs = Array.from(allItems).map((item, i) => {
        const isDiario = item.querySelector('.check-diario').checked;
        const isMensal = item.querySelector('.check-mensal').checked;
        let t = 'ambos';
        if (isDiario && !isMensal) t = 'diario';
        if (!isDiario && isMensal) t = 'mensal';
        if (!isDiario && !isMensal) t = 'ambos';
        return {
          category_id: item.dataset.id,
          sort_order: i,
          is_visible: item.querySelector('.drag-toggle').dataset.visible === '1',
          tipo: t
        };
      });

      prefs.push({ category_id: newCat.id, sort_order: maxOrder + 1, is_visible: true, tipo: newCat.tipo || tipo });

      await api.put(`/preferences/${selectedCnpjId}`, { preferences: prefs });

      showToast('Despesa criada e adicionada à lista!', 'success');
      renderConfig(); // reload
    } catch (e) {
      showToast(e.message, 'error');
      const btn = document.getElementById('btn-add-cat');
      if (btn) {
        btn.disabled = false; btn.textContent = 'Criar e Adicionar à Lista';
      }
    }
  });
}

function showAddCnpjModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-handle"></div>
      <div class="modal-title" style="display:flex;align-items:center;gap:8px;">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg> Novo CNPJ
      </div>
      <div class="gap-16">
        <div class="form-group">
          <label class="form-label">Razão Social</label>
          <input id="m-razao" type="text" class="form-input" placeholder="Nome da empresa" />
        </div>
        <div class="form-group">
          <label class="form-label">CNPJ</label>
          <input id="m-cnpj" type="text" class="form-input" placeholder="00.000.000/0001-00" inputmode="numeric" maxlength="18" />
        </div>
        <button class="btn btn-primary" id="btn-confirm-cnpj">Cadastrar</button>
        <button class="btn btn-outline" id="btn-cancel-cnpj">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  // CNPJ mask
  document.getElementById('m-cnpj').addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 14);
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
    e.target.value = v;
  });

  document.getElementById('btn-confirm-cnpj').addEventListener('click', async () => {
    const razao_social = document.getElementById('m-razao').value.trim();
    const cnpj = document.getElementById('m-cnpj').value.trim();
    if (!razao_social || !cnpj) return showToast('Preencha todos os campos', 'error');
    try {
      await api.post('/cnpjs', { razao_social, cnpj });
      showToast('CNPJ cadastrado!', 'success');
      overlay.remove();
      renderConfig();
    } catch (e) { showToast(e.message, 'error'); }
  });
  document.getElementById('btn-cancel-cnpj').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ---- Helpers ----
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

// ---- Init ----
render();
