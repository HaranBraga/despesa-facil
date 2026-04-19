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
let _shellSidebarCollapsed = false;

function renderShell(content, activeNav) {
  const app = document.getElementById('app');
  const navItems = [
    { id: 'dashboard',  label: 'Início',          icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>' },
    { id: 'lancamento', label: 'Lançar Despesa',   icon: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>' },
    { id: 'historico',  label: 'Histórico',        icon: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>' },
    { id: 'relatorio',  label: 'Relatório Mensal', icon: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>' },
    { id: 'config',     label: 'Configurações',    icon: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>' }
  ];

  const sidebarNavHtml = navItems.map(n => `
    <button class="nav-item-side ${activeNav === n.id ? 'active' : ''}" data-page="${n.id}">
      <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;">${n.icon}</svg>
      <span class="collapse-hide">${n.label}</span>
    </button>
  `).join('');

  const walletIcon = '<svg width="22" height="22" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>';
  const logoutIcon = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>';
  const menuIcon  = '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
  const collapseIcon = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>';

  app.innerHTML = `
    <div class="app-shell${_shellSidebarCollapsed ? ' sidebar-collapsed' : ''}" id="app-shell">
      <aside class="sidebar-main" id="sidebar-main">
        <div class="sidebar-logo" style="justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;overflow:hidden;">
            <div class="sidebar-logo-icon">${walletIcon}</div>
            <div class="collapse-hide">
              <div class="sidebar-logo-text">Despesa Fácil</div>
            </div>
          </div>
          <button id="btn-toggle-sidebar" class="btn-sidebar-toggle" title="Recolher menu">${collapseIcon}</button>
        </div>
        <nav class="sidebar-nav">${sidebarNavHtml}</nav>
        <div class="sidebar-footer">
          <button class="nav-item-side" id="btn-logout-side">
            ${logoutIcon} <span class="collapse-hide">Sair da Conta</span>
          </button>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div style="display:flex;flex-direction:column;flex:1;min-width:0;">
        <header class="app-header">
          <button class="btn-ghost" id="btn-toggle-mobile-menu">${menuIcon}</button>
          <span class="logo">
            <svg width="22" height="22" fill="none" stroke="var(--brand)" stroke-width="2.5" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
            <span class="text-gradient">Despesa Fácil</span>
          </span>
          <button class="btn-icon" id="btn-logout" title="Sair" style="margin-left:auto;color:var(--red);">${logoutIcon}</button>
        </header>
        <main class="page-content page-enter">${content}</main>
        ${activeNav === 'lancamento' ? `
        <button id="fab-lancar" class="fab-lancar" title="Lançar Despesa">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          <span>Lançar</span>
        </button>` : ''}
        <nav class="bottom-nav">
          <button class="nav-item ${activeNav === 'dashboard' ? 'active' : ''}" data-page="dashboard">
            <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>
            <span class="nav-label">Início</span>
          </button>
          <button class="nav-item ${activeNav === 'historico' ? 'active' : ''}" data-page="historico">
            <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg></div>
            <span class="nav-label">Histórico</span>
          </button>
          <button class="nav-item nav-primary" data-page="lancamento">
            <div class="nav-icon"><svg width="24" height="24" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></div>
          </button>
          <button class="nav-item ${activeNav === 'relatorio' ? 'active' : ''}" data-page="relatorio">
            <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
            <span class="nav-label">Relatório</span>
          </button>
          <button class="nav-item ${activeNav === 'config' ? 'active' : ''}" data-page="config">
            <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></div>
            <span class="nav-label">Config</span>
          </button>
        </nav>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('sidebar-main')?.classList.remove('show');
      document.getElementById('sidebar-overlay')?.classList.remove('show');
      navigate(btn.dataset.page);
    });
  });

  document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => {
    _shellSidebarCollapsed = !_shellSidebarCollapsed;
    const shell = document.getElementById('app-shell');
    shell.classList.toggle('sidebar-collapsed', _shellSidebarCollapsed);
    const sidebar = document.getElementById('sidebar-main');
    sidebar.style.width = _shellSidebarCollapsed ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)';
    sidebar.style.padding = _shellSidebarCollapsed ? '28px 10px' : '28px 20px';
  });

  document.getElementById('btn-toggle-mobile-menu')?.addEventListener('click', () => {
    document.getElementById('sidebar-main')?.classList.add('show');
    document.getElementById('sidebar-overlay')?.classList.add('show');
  });

  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    document.getElementById('sidebar-main')?.classList.remove('show');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  });

  const logoutFn = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('login');
  };
  document.getElementById('btn-logout')?.addEventListener('click', logoutFn);
  document.getElementById('btn-logout-side')?.addEventListener('click', logoutFn);
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
    case 'conta': return renderConta();
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
          <label class="form-label">Usuário</label>
          <input id="l-email" type="text" class="form-input" placeholder="seu.usuario" autocomplete="username" />
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input id="l-pass" type="password" class="form-input" placeholder="••••••" />
        </div>
        <button class="btn btn-primary" id="btn-login">Entrar</button>
      </div>
    </div>
  `;
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim();
    const password = document.getElementById('l-pass').value;
    if (!email || !password) return showToast('Preencha todos os campos', 'error');
    try {
      const data = await api.post('/auth/login', { email, password });
      if (data.user.type === 'admin') throw new Error('Use o painel Admin para acessar esta conta.');
      if (data.user.type === 'counter') throw new Error('Use o painel do Contador para acessar esta conta.');
      localStorage.setItem('token', data.token);
      navigate('dashboard');
    } catch (e) { showToast(e.message, 'error'); }
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
          Já tem conta? <a href="#" id="go-login" style="color:var(--brand)">Entrar</a>
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
    const [cnpjs_report, user_info] = await Promise.all([
      api.get(`/reports/monthly?cnpj_id=${selectedCnpjId}&month=${month}&year=${year}`),
      api.get('/auth/me')
    ]);
    const report = cnpjs_report;
    let headerHtml = dashboardContent(cnpjs, report, month, year);
    renderShell(headerHtml, 'dashboard');
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
  const renderRow = (cat) => `
    <div class="lancamento-row">
      <span class="lancamento-cat-name">${cat.name}</span>
      <div class="lancamento-amount-wrap">
        <span class="lancamento-amount-prefix">R$</span>
        <input type="number" inputmode="decimal" step="0.01" min="0"
          class="lancamento-amount-input" data-cat-id="${cat.category_id}" placeholder="0,00" />
      </div>
    </div>
  `;

  return `
    <div class="gap-16" style="padding-bottom: 80px;">
      <div class="form-group">
        <label class="form-label">Empresa(s) para lançamento</label>
        <select id="l-cnpj" class="form-select">
          ${cnpjs.map(c => `<option value="${c.id}" ${c.id === selectedCnpjId ? 'selected' : ''}>${c.razao_social} — ${c.cnpj}</option>`).join('')}
        </select>
        ${cnpjs.length > 1 ? `
        <div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">
          <div style="font-size:0.72rem; font-weight:700; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.05em;">Aplicar também para:</div>
          <div id="cnpj-extra-checks" class="gap-6">
            ${cnpjs.filter(c => c.id !== selectedCnpjId).map(c => `
              <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border:1.5px solid var(--line);border-radius:10px;cursor:pointer;font-size:0.88rem;font-weight:500;transition:var(--ease);" class="cnpj-extra-label">
                <input type="checkbox" class="cnpj-extra-check" data-cnpj-id="${c.id}" style="width:16px;height:16px;accent-color:var(--brand);flex-shrink:0;cursor:pointer;" />
                <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.razao_social}</span>
                <span style="font-size:0.72rem;color:var(--ink-3);font-family:monospace;flex-shrink:0;">${c.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}</span>
              </label>`).join('')}
          </div>
        </div>` : ''}
      </div>

      <div class="form-group">
          <label class="form-label">Data do Lançamento</label>
          <input id="l-date" type="date" class="form-input" value="${today}" />
      </div>

      <p class="text-sm text-muted" style="text-align:center;margin:0">Preencha o valor das despesas:</p>
      
      <div id="lancamento-grid" class="gap-8">
          ${categories.length === 0 ? '<p class="text-sm text-muted text-center">Nenhuma despesa configurada.</p>' : categories.map(renderRow).join('')}
      </div>

      <button class="btn btn-primary" id="btn-salvar-lancamento" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Lançar Despesa
      </button>
    </div>
  `;
}

function setupLancamentoEvents(cnpjs, categories, now) {
  const SAVE_BTN_HTML = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Lançar Despesa';
  const renderGrid = (containerId, cats) => {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    if (cats.length === 0) {
      grid.innerHTML = '<p class="text-sm text-muted text-center">Nenhuma despesa configurada.</p>';
      return;
    }
    grid.innerHTML = cats.map(cat => `
      <div class="lancamento-row">
        <span class="lancamento-cat-name">${cat.name}</span>
        <div class="lancamento-amount-wrap">
          <span class="lancamento-amount-prefix">R$</span>
          <input type="number" inputmode="decimal" step="0.01" min="0" class="lancamento-amount-input" data-cat-id="${cat.category_id}" placeholder="0,00" />
        </div>
      </div>`).join('');
  };

  // Highlight checkbox label on check
  document.querySelectorAll('.cnpj-extra-check').forEach(chk => {
    chk.addEventListener('change', () => {
      chk.closest('.cnpj-extra-label').style.borderColor = chk.checked ? 'var(--brand)' : 'var(--line)';
      chk.closest('.cnpj-extra-label').style.background = chk.checked ? 'var(--brand-soft)' : 'var(--bg)';
    });
  });

  // CNPJ change — reload categories
  document.getElementById('l-cnpj').addEventListener('change', async (e) => {
    selectedCnpjId = e.target.value;
    const prefs = await api.get(`/preferences/${selectedCnpjId}`).catch(() => []);
    const visibleCats = prefs.filter(p => p.is_visible);
    renderGrid('lancamento-grid', visibleCats);
    // rebuild extra checkboxes (remove current cnpj, show rest)
    const extraContainer = document.getElementById('cnpj-extra-checks');
    if (extraContainer) {
      const others = cnpjs.filter(c => c.id !== selectedCnpjId);
      extraContainer.innerHTML = others.map(c => `
        <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border:1.5px solid var(--line);border-radius:10px;cursor:pointer;font-size:0.88rem;font-weight:500;transition:var(--ease);" class="cnpj-extra-label">
          <input type="checkbox" class="cnpj-extra-check" data-cnpj-id="${c.id}" style="width:16px;height:16px;accent-color:var(--brand);flex-shrink:0;cursor:pointer;" />
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.razao_social}</span>
          <span style="font-size:0.72rem;color:var(--ink-3);font-family:monospace;flex-shrink:0;">${c.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}</span>
        </label>`).join('');
      document.querySelectorAll('.cnpj-extra-check').forEach(chk => {
        chk.addEventListener('change', () => {
          chk.closest('.cnpj-extra-label').style.borderColor = chk.checked ? 'var(--brand)' : 'var(--line)';
          chk.closest('.cnpj-extra-label').style.background = chk.checked ? 'var(--brand-soft)' : 'var(--bg)';
        });
      });
    }
  });

  // Salvar Bulk
  document.getElementById('btn-salvar-lancamento').addEventListener('click', async () => {
    const expense_date = document.getElementById('l-date').value;
    if (!expense_date) return showToast('Selecione a data', 'error');

    const inputs = document.querySelectorAll('#lancamento-grid input[data-cat-id]');
    const items = Array.from(inputs)
      .filter(inp => inp.value && parseFloat(inp.value) > 0)
      .map(inp => ({ category_id: inp.dataset.catId, amount: parseFloat(inp.value) }));

    if (items.length === 0) return showToast('Preencha o valor de pelo menos uma despesa', 'error');

    const dateObj = new Date(expense_date);
    const period_month = dateObj.getUTCMonth() + 1;
    const period_year = dateObj.getUTCFullYear();

    const mainCnpj = document.getElementById('l-cnpj').value;
    const extraChecked = Array.from(document.querySelectorAll('.cnpj-extra-check:checked')).map(c => c.dataset.cnpjId);
    const targetCnpjs = [mainCnpj, ...extraChecked];

    const btn = document.getElementById('btn-salvar-lancamento');
    const fabBtn = document.getElementById('fab-lancar');
    btn.disabled = true; btn.textContent = 'Lançando...';
    if (fabBtn) { fabBtn.disabled = true; fabBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" opacity="0.4"/></svg><span>Lançando...</span>'; }

    try {
      for (const cnpj_id of targetCnpjs) {
        await api.post('/expenses/bulk', { cnpj_id, items, expense_date, period_month, period_year, tipo: 'diario' });
      }
      showToast(targetCnpjs.length > 1 ? `Lançado para ${targetCnpjs.length} CNPJs!` : 'Lançamento concluído!', 'success');
      inputs.forEach(inp => inp.value = '');
      document.querySelectorAll('.cnpj-extra-check:checked').forEach(c => { c.checked = false; c.dispatchEvent(new Event('change')); });
      btn.disabled = false; btn.innerHTML = SAVE_BTN_HTML;
      if (fabBtn) { fabBtn.disabled = false; fabBtn.innerHTML = '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg><span>Lançar</span>'; }
    } catch (e) {
      showToast(e.message, 'error');
      btn.disabled = false; btn.innerHTML = SAVE_BTN_HTML;
      if (fabBtn) { fabBtn.disabled = false; fabBtn.innerHTML = '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg><span>Lançar</span>'; }
    }
  });

  // FAB aciona o mesmo submit
  const fabEl = document.getElementById('fab-lancar');
  const inlineBtn = document.getElementById('btn-salvar-lancamento');
  if (fabEl && inlineBtn) {
    fabEl.addEventListener('click', () => inlineBtn.click());
    // Hide FAB when inline button is visible
    const observer = new IntersectionObserver(([entry]) => {
      fabEl.style.opacity = entry.isIntersecting ? '0' : '1';
      fabEl.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
    }, { threshold: 0.3 });
    observer.observe(inlineBtn);
  }
}

// ================= HISTÓRICO =================
async function renderHistorico() {
  renderShell('<div class="skeleton" style="height:50px;margin-bottom:12px"></div><div class="gap-8"><div class="skeleton" style="height:64px"></div><div class="skeleton" style="height:64px"></div><div class="skeleton" style="height:64px"></div></div>', 'historico');
  try {
    const cnpjs = await api.get('/cnpjs');
    if (cnpjs.length === 0) { renderShell(dashboardEmpty(), 'historico'); return; }
    if (!selectedCnpjId) selectedCnpjId = cnpjs[0].id;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = now.toLocaleDateString('sv');

    const expDatesRaw = await api.get(`/expenses/dates?cnpj_id=${selectedCnpjId}&month=${month}&year=${year}`).catch(() => []);
    const expDates = expDatesRaw.map(d => String(d).split('T')[0]);

    // Se hoje tem lançamentos usa hoje, senão usa a última data com lançamento do mês
    const activeDate = expDates.includes(today)
      ? today
      : ([...expDates].sort().reverse()[0] || today);

    const expenses = await api.get(`/expenses?cnpj_id=${selectedCnpjId}&date=${activeDate}`).catch(() => []);

    renderShell(historicoHtml(cnpjs, expenses, activeDate, month, year, expDates), 'historico');
    setupHistoricoEvents(cnpjs, activeDate, month, year, expDates);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function buildMiniCal(month, year, expDates, selectedDate) {
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const today = new Date().toLocaleDateString('sv');

  // Dates are already YYYY-MM-DD strings from the API — sort them
  const normalized = (expDates || []).map(d => String(d).split('T')[0]).sort();

  const chips = normalized.map(dateStr => {
    const [y, m, dd] = dateStr.split('-');
    const dt = new Date(parseInt(y), parseInt(m)-1, parseInt(dd));
    const label = dt.toLocaleDateString('pt-BR', { weekday:'short', day:'numeric', month:'short' });
    const isToday = dateStr === today;
    const isSelected = dateStr === selectedDate;
    return `<button class="cal-chip${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}" data-date="${dateStr}" type="button">
      <span class="cal-chip-day">${dd}</span>
      <span class="cal-chip-label">${label.replace(/\.$/, '')}</span>
    </button>`;
  });

  const emptyMsg = `<div style="text-align:center;padding:24px 0;color:var(--ink-3);font-size:0.85rem;">Nenhum lançamento neste mês</div>`;

  return `
    <div class="mini-cal card" style="padding:14px 16px;">
      <div class="mini-cal-header">
        <button id="cal-prev" type="button"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
        <span class="cal-month-label">${MONTHS[month - 1]} ${year}</span>
        <button id="cal-next" type="button"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
      </div>
      <div class="cal-chips-row">${chips.length ? chips.join('') : emptyMsg}</div>
    </div>
  `;
}

function historicoHtml(cnpjs, expenses, date, month, year, expDates) {
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
      <div id="h-calendar">${buildMiniCal(month, year, expDates, date)}</div>
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
        <div class="expense-name">${e.category_name} ${e.locked ? '<span style="font-size:0.75rem;color:var(--ink-3);font-weight:normal">(Travado)</span>' : ''}</div>
        <div class="expense-date">${e.description || formatDate(e.expense_date)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="expense-amount">${formatCurrency(e.amount)}</span>
        ${!e.locked ? `
          <button class="btn btn-danger btn-sm" data-del="${e.id}" style="display:flex;align-items:center;justify-content:center;padding:6px;border-radius:6px;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        ` : `<span style="color:var(--ink-3)"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></span>`}
      </div>
    </div>
  `).join('');
}

function setupHistoricoEvents(cnpjs, initialDate, calMonth, calYear, expDates) {
  let currentMonth = calMonth;
  let currentYear = calYear;
  let currentDate = initialDate;
  let currentExpDates = expDates;

  async function loadExpenses() {
    const cnpj_id = document.getElementById('h-cnpj')?.value;
    if (!cnpj_id || !currentDate) return;
    const expenses = await api.get(`/expenses?cnpj_id=${cnpj_id}&date=${currentDate}`).catch(() => []);
    const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    document.getElementById('expenses-list').innerHTML = renderExpenseList(expenses);
    // Update total card
    const statCard = document.querySelector('.stat-card');
    if (expenses.length > 0) {
      if (statCard) {
        statCard.querySelector('.stat-value').textContent = formatCurrency(total);
      } else {
        const list = document.getElementById('expenses-list');
        list.insertAdjacentHTML('beforebegin', `<div class="stat-card"><div class="stat-label">Total do dia</div><div class="stat-value success">${formatCurrency(total)}</div></div>`);
      }
    } else if (statCard) {
      statCard.remove();
    }
    setupDeleteHandlers();
  }

  async function refreshCalendar() {
    const cnpj_id = document.getElementById('h-cnpj')?.value;
    const raw = await api.get(`/expenses/dates?cnpj_id=${cnpj_id}&month=${currentMonth}&year=${currentYear}`).catch(() => []);
    currentExpDates = raw.map(d => String(d).split('T')[0]);
    document.getElementById('h-calendar').innerHTML = buildMiniCal(currentMonth, currentYear, currentExpDates, currentDate);
    setupCalendarHandlers();
  }

  function setupCalendarHandlers() {
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 1) { currentMonth = 12; currentYear--; }
      refreshCalendar();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 12) { currentMonth = 1; currentYear++; }
      refreshCalendar();
    });
    document.querySelectorAll('.cal-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentDate = chip.dataset.date;
        document.querySelectorAll('.cal-chip.selected').forEach(d => d.classList.remove('selected'));
        chip.classList.add('selected');
        loadExpenses();
      });
    });
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
          refreshCalendar(); // dates may change after delete
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
  }

  document.getElementById('h-cnpj')?.addEventListener('change', (e) => {
    selectedCnpjId = e.target.value;
    refreshCalendar();
    loadExpenses();
  });

  setupCalendarHandlers();
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
  const MONTHS_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const report = await api.get(`/reports/monthly?cnpj_id=${selectedCnpjId}&month=${month}&year=${year}`);

  const sentBadge = report.report_sent_at
    ? `<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--green-soft);border:1px solid var(--green);border-radius:var(--radius-md);margin-bottom:8px;">
         <svg width="20" height="20" fill="none" stroke="var(--green)" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
         <div>
           <div style="font-weight:700;font-size:0.85rem;color:var(--green)">Relatório Enviado ✓</div>
           <div style="font-size:0.75rem;color:var(--ink-3)">Enviado em ${new Date(report.report_sent_at).toLocaleDateString('pt-BR')} às ${new Date(report.report_sent_at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</div>
         </div>
       </div>`
    : '';

  const sendBtnHtml = report.report_sent_at
    ? `<button class="btn" id="btn-send-counter" disabled style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;background:var(--bg);border:1px solid var(--line);color:var(--ink-3);cursor:default;">
         <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
         Já Enviado
       </button>`
    : `<button class="btn btn-primary" id="btn-send-counter" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;background:var(--green);border-color:var(--green);">
         <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 2L11 13"></path><path d="M22 2L15 22L11 13L2 9L22 2z"></path></svg>
         Enviar Relatório para Contador
       </button>`;

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

      <!-- Month/Year Picker -->
      <div class="period-nav" id="period-picker-toggle" style="cursor:pointer;position:relative;">
        <svg width="18" height="18" fill="none" stroke="var(--brand)" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span class="period-label">${MONTHS_FULL[month]} / ${year}</span>
        <svg width="16" height="16" fill="none" stroke="var(--ink-3)" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div id="month-picker-grid" style="display:none;background:var(--bg-card);border:1px solid var(--line);border-radius:var(--radius-lg);padding:16px;box-shadow:var(--shadow-2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <button class="period-nav-btn" id="picker-prev-year">‹</button>
          <span style="font-weight:700;font-size:1rem;" id="picker-year-label">${year}</span>
          <button class="period-nav-btn" id="picker-next-year">›</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;" id="months-grid">
          ${MONTHS.slice(1).map((m, i) => `
            <button class="month-pill ${i + 1 === month ? 'active' : ''}" data-m="${i + 1}" style="padding:10px 4px;border-radius:var(--radius-sm);border:1.5px solid ${i + 1 === month ? 'var(--brand)' : 'var(--line)'};background:${i + 1 === month ? 'var(--brand-soft)' : 'var(--bg)'};color:${i + 1 === month ? 'var(--brand)' : 'var(--ink-2)'};font-weight:600;font-size:0.82rem;cursor:pointer;font-family:inherit;transition:var(--ease);">${m}</button>
          `).join('')}
        </div>
      </div>

      ${sentBadge}

      <div class="stat-card">
        <div class="stat-label">Total do mês</div>
        <div class="stat-value accent">${formatCurrency(report.total_geral)}</div>
      </div>
      
      ${sendBtnHtml}

      <div class="card">
        <div class="section-title" style="margin-bottom:12px">Por categoria</div>
        ${report.categories.map(cat => `
          <div class="report-row">
            <span class="report-cat-name">${cat.category_name}${cat.is_filial ? ' <span style="font-size:0.7rem;color:#8b5cf6">(Filial)</span>' : ''}</span>
            <span class="report-amount ${parseFloat(cat.total) === 0 ? 'zero' : ''}">${formatCurrency(cat.total)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  renderShell(contentHtml, 'relatorio');

  // Month picker toggle
  let pickerYear = year;
  document.getElementById('period-picker-toggle').addEventListener('click', () => {
    const grid = document.getElementById('month-picker-grid');
    grid.style.display = grid.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('picker-prev-year')?.addEventListener('click', (e) => {
    e.stopPropagation();
    pickerYear--;
    document.getElementById('picker-year-label').textContent = pickerYear;
  });
  document.getElementById('picker-next-year')?.addEventListener('click', (e) => {
    e.stopPropagation();
    pickerYear++;
    document.getElementById('picker-year-label').textContent = pickerYear;
  });

  document.querySelectorAll('.month-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newMonth = parseInt(btn.dataset.m);
      loadRelatorio(cnpjs, newMonth, pickerYear);
    });
  });

  document.getElementById('r-cnpj').addEventListener('change', (e) => {
    selectedCnpjId = e.target.value;
    loadRelatorio(cnpjs, month, year);
  });

  document.getElementById('btn-send-counter')?.addEventListener('click', async () => {
    if (report.report_sent_at) return;
    if (!confirm('Deseja enviar este relatório para o contador? Isso travará todos os lançamentos deste mês para evitar alterações.')) return;
    try {
      await api.post('/reports/send', { cnpj_id: selectedCnpjId, month, year });
      showToast('Relatório enviado com sucesso!', 'success');
      loadRelatorio(cnpjs, month, year);
    } catch (e) { showToast(e.message, 'error'); }
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

      <!-- Botão Minha Conta -->
      <button id="btn-goto-conta" class="btn btn-outline" style="display:flex;align-items:center;gap:8px;width:100%;">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path></svg>
        Minha Conta
      </button>


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
                <div class="expense-icon" style="background:var(--bg);color:var(--ink)"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg></div>
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
              <div class="pref-item" data-id="${p.category_id}" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border:1px solid var(--line);border-radius:12px;">
                <span style="flex:1;font-weight:600;font-size:0.95rem">${p.name}</span>
                <button class="btn btn-danger btn-sm btn-del-pref" data-cat-id="${p.category_id}" style="padding:6px;border-radius:8px;" title="Apagar despesa">
                  <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
                <button class="drag-toggle ${p.is_visible ? 'on' : ''}" data-visible="${p.is_visible ? '1' : '0'}" title="Visível no App"></button>
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
          ${cnpjs.length > 1 ? `
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="font-size:0.72rem; font-weight:700; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.05em;">Adicionar também para:</div>
            <div id="cat-cnpj-checks" class="gap-6">
              ${cnpjs.filter(c => c.id !== selectedCnpjId).map(c => `
                <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg);border:1.5px solid var(--line);border-radius:10px;cursor:pointer;font-size:0.85rem;font-weight:500;transition:var(--ease);" class="cat-cnpj-label">
                  <input type="checkbox" class="cat-cnpj-check" data-cnpj-id="${c.id}" style="width:16px;height:16px;accent-color:var(--brand);flex-shrink:0;cursor:pointer;" />
                  <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.razao_social}</span>
                </label>`).join('')}
            </div>
          </div>` : ''}
          <button class="btn btn-outline" id="btn-add-cat">Criar e Adicionar</button>
        </div>
      </div>
    </div>
  `;
}

async function setupConfigEvents(cnpjs, categories, prefs) {
  // Minha Conta
  document.getElementById('btn-goto-conta')?.addEventListener('click', () => navigate('conta'));

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
      return {
        category_id: item.dataset.id,
        sort_order: i,
        is_visible: isVisible
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
      <div class="pref-item" data-id="${p.category_id}" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border:1px solid var(--line);border-radius:12px;">
        <span style="flex:1;font-weight:600;font-size:0.95rem">${p.name}</span>
        <button class="btn btn-danger btn-sm btn-del-pref" data-cat-id="${p.category_id}" style="padding:6px;border-radius:8px;" title="Apagar despesa">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
        <button class="drag-toggle ${p.is_visible ? 'on' : ''}" data-visible="${p.is_visible ? '1' : '0'}" title="Visível no App"></button>
      </div>
    `).join('');
    setupToggles();
    setupDelPref();
  });

  // Add category
  document.getElementById('btn-add-cat')?.addEventListener('click', async () => {
    const name = document.getElementById('new-cat-name').value.trim();
    if (!name) return showToast('Digite o nome da categoria', 'error');

    try {
      const btn = document.getElementById('btn-add-cat');
      btn.disabled = true; btn.textContent = 'Adicionando...';

      const newCat = await api.post('/categories', { name });

      const allItems = document.querySelectorAll('.pref-item');
      let maxOrder = 0;
      allItems.forEach(i => { if (parseInt(i.dataset.order || 0) > maxOrder) maxOrder = parseInt(i.dataset.order || 0); });

      const prefs = Array.from(allItems).map((item, i) => {
        return {
          category_id: item.dataset.id,
          sort_order: i,
          is_visible: item.querySelector('.drag-toggle').dataset.visible === '1'
        };
      });

      prefs.push({ category_id: newCat.id, sort_order: maxOrder + 1, is_visible: true });

      await api.put(`/preferences/${selectedCnpjId}`, { preferences: prefs });

      // Salvar também para CNPJs extras marcados
      const extraChecks = document.querySelectorAll('.cat-cnpj-check:checked');
      for (const chk of extraChecks) {
        const extraId = chk.dataset.cnpjId;
        try {
          const extraPrefs = await api.get(`/preferences/${extraId}`).catch(() => []);
          let maxOrd = 0;
          extraPrefs.forEach(p => { if (p.sort_order > maxOrd) maxOrd = p.sort_order; });
          extraPrefs.push({ category_id: newCat.id, sort_order: maxOrd + 1, is_visible: true });
          await api.put(`/preferences/${extraId}`, { preferences: extraPrefs });
        } catch (ex) { console.warn('Erro ao salvar pref extra:', ex); }
      }

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

  // Delete preference
  const setupDelPref = () => {
    document.querySelectorAll('.btn-del-pref').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Apagar esta despesa da lista?')) return;
        try {
          await api.delete(`/categories/${btn.dataset.catId}`);
          showToast('Despesa removida', 'success');
          renderConfig();
        } catch (e) { showToast(e.message, 'error'); }
      });
    });
  };
  setupDelPref();
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
          <input id="m-razao" type="text" class="form-input" placeholder="Nome da empresa" style="text-transform:uppercase" />
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
    const razao_social = document.getElementById('m-razao').value.trim().toUpperCase();
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
(function init() {
  render();
})();

// ================= CONTA (configurações de conta) =================
async function renderConta() {
  renderShell('<div class="skeleton" style="height:300px"></div>', 'config');
  try {
    const account = await api.get('/account');
    const cnpjs = await api.get('/cnpjs');

    renderShell(`
      <div class="gap-16">
        <div class="section-title" style="display:flex;align-items:center;gap:8px;">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path></svg>
          Minha Conta
        </div>

        <!-- Dados da conta -->
        <div class="card gap-16">
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input id="ac-name" type="text" class="form-input" value="${account.name}" />
          </div>
          <div class="form-group">
            <label class="form-label">Usuário</label>
            <input type="text" class="form-input" value="${account.username || ''}" disabled style="opacity:0.6" />
          </div>
          <div class="form-group">
            <label class="form-label">WhatsApp padrão (para receber lembretes)</label>
            <input id="ac-wpp" type="tel" class="form-input" placeholder="11999999999" value="${account.whatsapp_number || ''}" inputmode="numeric" />
            <p class="text-sm text-muted" style="margin:4px 0 0">Usado quando o CNPJ não tiver número específico.</p>
          </div>
          <button class="btn btn-primary" id="btn-save-account">Salvar Conta</button>
        </div>

        <!-- Trocar senha -->
        <div class="card gap-16">
          <div class="section-title" style="font-size:1rem;display:flex;align-items:center;gap:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Trocar Senha
          </div>
          <div class="form-group">
            <label class="form-label">Senha atual</label>
            <input id="ac-pass-cur" type="password" class="form-input" placeholder="••••••" />
          </div>
          <div class="form-group">
            <label class="form-label">Nova senha</label>
            <input id="ac-pass-new" type="password" class="form-input" placeholder="Mín. 6 caracteres" />
          </div>
          <button class="btn btn-outline" id="btn-save-password">Atualizar Senha</button>
        </div>

        <!-- WhatsApp por CNPJ -->
        ${cnpjs.length > 0 ? `
        <div class="card">
          <div class="section-title" style="margin-bottom:12px;font-size:1rem;display:flex;align-items:center;gap:6px;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2.77h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 18.92z"></path></svg>
            WhatsApp por CNPJ
          </div>
          <p class="text-sm text-muted" style="margin:0 0 12px">Defina um número específico para cada empresa. Deixe em branco para usar o padrão da conta.</p>
          <div class="gap-12">
            ${cnpjs.map(c => `
              <div style="background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;">
                <div style="font-weight:600;font-size:0.9rem">${c.razao_social}</div>
                <div style="font-size:0.8rem;color:var(--ink-3);font-family:monospace">${c.cnpj}</div>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="tel" class="form-input cnpj-wpp-input" data-cnpj-id="${c.id}" placeholder="Padrão da conta" value="${c.whatsapp_number || ''}" inputmode="numeric" style="flex:1;" />
                  <button class="btn btn-outline btn-sm btn-save-cnpj-wpp" data-cnpj-id="${c.id}">Salvar</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        <button class="btn btn-outline" id="btn-back-config">← Voltar às Configurações</button>
      </div>
    `, 'config');

    // Salvar conta
    document.getElementById('btn-save-account').addEventListener('click', async () => {
      const name = document.getElementById('ac-name').value.trim();
      const whatsapp_number = document.getElementById('ac-wpp').value.trim() || null;
      try {
        await api.put('/account', { name, whatsapp_number });
        showToast('Conta atualizada!', 'success');
      } catch (e) { showToast(e.message, 'error'); }
    });

    // Trocar senha
    document.getElementById('btn-save-password').addEventListener('click', async () => {
      const current_password = document.getElementById('ac-pass-cur').value;
      const new_password = document.getElementById('ac-pass-new').value;
      if (!current_password || !new_password) return showToast('Preencha os campos de senha', 'error');
      try {
        await api.put('/account', { current_password, new_password });
        showToast('Senha alterada!', 'success');
        document.getElementById('ac-pass-cur').value = '';
        document.getElementById('ac-pass-new').value = '';
      } catch (e) { showToast(e.message, 'error'); }
    });

    // Salvar WhatsApp por CNPJ
    document.querySelectorAll('.btn-save-cnpj-wpp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.cnpjId;
        const whatsapp_number = document.querySelector(`.cnpj-wpp-input[data-cnpj-id="${id}"]`).value.trim() || null;
        try {
          await api.put(`/account/cnpjs/${id}/whatsapp`, { whatsapp_number });
          showToast('Número atualizado!', 'success');
        } catch (e) { showToast(e.message, 'error'); }
      });
    });

    document.getElementById('btn-back-config').addEventListener('click', () => navigate('config'));
  } catch (e) { showToast(e.message, 'error'); }
}
