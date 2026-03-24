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
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      renderLogin();
      if (hadToken) throw new Error('Sessão expirada. Faça login novamente.');
      throw new Error('');
    }
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  },
  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put: (path, body) => api.request('PUT', path, body),
  delete: (path) => api.request('DELETE', path)
};

// ---- Toast ----
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ---- Render ----
async function render() {
  const token = localStorage.getItem('token');
  if (!token) return renderLogin();
  try {
    const me = await api.get('/auth/me');
    if (!me.is_admin) {
      showToast('Acesso negado. Apenas administradores.', 'error');
      localStorage.removeItem('token');
      return renderLogin();
    }
    renderDashboard(me);
  } catch (e) {
    if (e.message) showToast(e.message, 'error');
    renderLogin();
  }
}

// ================= LOGIN =================
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="auth-page">
      <div class="auth-logo" style="display:flex;align-items:center;justify-content:center;gap:12px;">
        <svg width="32" height="32" fill="none" stroke="var(--brand)" stroke-width="2.5" viewBox="0 0 24 24">
          <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path>
        </svg>
        <span class="text-gradient">Admin HQ</span>
      </div>
      <p class="auth-sub">Acesso restrito a administradores</p>
      <div class="card auth-card gap-16">
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input id="l-email" type="email" class="form-input" placeholder="admin@despesafacil.com" inputmode="email" />
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input id="l-pass" type="password" class="form-input" placeholder="••••••" />
        </div>
        <button class="btn btn-primary" id="btn-login">Acessar Painel</button>
      </div>
    </div>
  `;
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('l-email').value.trim();
    const password = document.getElementById('l-pass').value;
    if (!email || !password) return showToast('Preencha todos os campos', 'error');
    try {
      const data = await api.post('/auth/login', { email, password });
      if (!data.user.is_admin) throw new Error('Acesso negado. Usuário não é administrador.');
      localStorage.setItem('token', data.token);
      render();
    } catch (e) { showToast(e.message, 'error'); }
  });
  document.getElementById('l-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('l-pass').focus(); });
  document.getElementById('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-login').click(); });
}

// ================= DASHBOARD ADMIN =================
async function renderDashboard(user) {
  let currentTab = 'dashboard';
  let isSidebarCollapsed = false;

  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <aside id="sidebar-main" class="sidebar-main">
        <div class="sidebar-logo" style="justify-content:space-between;width:100;">
          <div style="display:flex;align-items:center;gap:12px;overflow:hidden;">
            <div class="sidebar-logo-icon">
              <svg width="24" height="24" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <div class="collapse-hide">
              <div class="sidebar-logo-text">Despesa Fácil</div>
              <div class="sidebar-logo-badge">Admin</div>
            </div>
          </div>
          <button id="btn-toggle-sidebar" class="btn-sidebar-toggle">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>

        <nav class="sidebar-nav">
          <button class="nav-item-side active" data-tab="dashboard">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            <span class="collapse-hide">Dashboard</span>
          </button>
          <button class="nav-item-side" data-tab="offices">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span class="collapse-hide">Escritórios</span>
          </button>
          <button class="nav-item-side" data-tab="users">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span class="collapse-hide">Usuários</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <button class="nav-item-side" id="btn-logout-sidebar">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span class="collapse-hide">Sair</span>
          </button>
        </div>
      </aside>

      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <div style="display:flex;flex-direction:column;flex:1;min-width:0;">
        <header class="app-header">
          <button class="btn-ghost" id="btn-toggle-mobile-menu">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <span class="logo">
            <span class="text-gradient" style="font-weight:800;">Admin HQ</span>
          </span>
        </header>
        <main id="admin-main" class="page-content">
          <div class="card" style="background:linear-gradient(135deg, rgba(79,156,249,0.08), rgba(124,58,237,0.08)); border-color:rgba(124,58,237,0.15); margin-bottom:24px;">
            <p style="margin:0;font-weight:600;color:var(--ink)">Olá, ${user.name}</p>
            <p class="text-sm text-muted mt-4">Gerencie escritórios, contadores e usuários da plataforma.</p>
          </div>
          <div id="tab-content"></div>
        </main>
      </div>
    </div>
  `;

  // Sidebar navigation
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      loadTab(currentTab);
    });
  });

  document.getElementById('btn-logout-sidebar').addEventListener('click', () => {
    localStorage.removeItem('token');
    renderLogin();
  });

  // Sidebar toggle
  document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    isSidebarCollapsed = !isSidebarCollapsed;
    const shell = document.querySelector('.app-shell');
    shell.classList.toggle('sidebar-collapsed', isSidebarCollapsed);
    const sidebar = document.getElementById('sidebar-main');
    sidebar.style.width = isSidebarCollapsed ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)';
    sidebar.style.padding = isSidebarCollapsed ? '32px 10px' : '32px 24px';
  });

  const btnMobileMenu = document.getElementById('btn-toggle-mobile-menu');
  if(btnMobileMenu) {
      btnMobileMenu.addEventListener('click', () => {
          document.getElementById('sidebar-main').classList.add('show');
          document.getElementById('sidebar-overlay').classList.add('show');
      });
  }

  const overlay = document.getElementById('sidebar-overlay');
  if(overlay) {
      overlay.addEventListener('click', () => {
          document.getElementById('sidebar-main').classList.remove('show');
          overlay.classList.remove('show');
      });
  }

  async function loadTab(tab) {
    const container = document.getElementById('tab-content');
    container.innerHTML = '<div class="skeleton" style="height:200px"></div>';

    switch (tab) {
      case 'dashboard': return loadDashboardTab(container);
      case 'offices': return loadOfficesTab(container);
      case 'users': return loadUsersTab(container);
    }
  }

  // ---- DASHBOARD TAB ----
  async function loadDashboardTab(container) {
    try {
      const stats = await api.get('/offices/admin/stats');
      container.innerHTML = `
        <div class="section-title" style="margin-bottom:20px;display:flex;align-items:center;gap:8px;">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
          Visão Geral
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="stat-card" style="border-left:4px solid var(--brand);">
            <div class="stat-label">Escritórios</div>
            <div class="stat-value accent">${stats.total_offices}</div>
          </div>
          <div class="stat-card" style="border-left:4px solid #8b5cf6;">
            <div class="stat-label">Contadores</div>
            <div class="stat-value" style="color:#8b5cf6">${stats.total_counters}</div>
          </div>
          <div class="stat-card" style="border-left:4px solid var(--green);">
            <div class="stat-label">Usuários</div>
            <div class="stat-value" style="color:var(--green)">${stats.total_users}</div>
          </div>
          <div class="stat-card" style="border-left:4px solid var(--amber);">
            <div class="stat-label">CNPJs Ativos</div>
            <div class="stat-value" style="color:var(--amber)">${stats.total_cnpjs}</div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="card" style="color:var(--red)">${e.message}</div>`;
    }
  }

  // ---- OFFICES TAB ----
  async function loadOfficesTab(container) {
    container.innerHTML = `
      <div class="section-header" style="margin-bottom:16px;">
        <div class="section-title" style="display:flex;align-items:center;gap:8px;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Escritórios de Contabilidade
        </div>
        <button class="btn btn-primary btn-sm" id="btn-new-office">+ Novo Escritório</button>
      </div>
      <div id="offices-container" class="gap-8"><div class="skeleton" style="height:60px"></div></div>
    `;
    document.getElementById('btn-new-office').addEventListener('click', showAddOfficeModal);
    loadOffices();
  }

  async function loadOffices() {
    try {
      const offices = await api.get('/offices');
      const container = document.getElementById('offices-container');
      if (!container) return;

      if (offices.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div><p class="empty-title">Nenhum escritório</p><p class="empty-sub">Cadastre o primeiro escritório.</p></div>';
        return;
      }

      container.innerHTML = offices.map(o => `
        <div class="card" style="padding:16px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div>
              <div style="font-weight:700;font-size:1rem;">${o.name}</div>
              <div class="text-sm text-muted" style="font-family:monospace">ID: ${o.id.split('-')[0]}...</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-outline btn-sm" data-webhook-o="${o.id}" style="padding:6px 10px;" title="Configurar Webhook">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </button>
              <button class="btn btn-outline btn-sm" data-add-c="${o.id}" style="padding:6px 10px;">+ Contador</button>
              <button class="btn btn-danger btn-sm" data-del-o="${o.id}" style="padding:8px;border-radius:8px;">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <div id="counters-for-${o.id}" class="gap-4" style="border-top:1px solid var(--line);padding-top:8px;">
            <div class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Contadores vinculados:</div>
            <div class="counters-list text-sm">Carregando...</div>
          </div>
        </div>
      `).join('');

      offices.forEach(o => loadCounters(o.id));

      document.querySelectorAll('[data-add-c]').forEach(btn => {
        btn.addEventListener('click', () => showAddCounterModal(btn.dataset.addC));
      });
      document.querySelectorAll('[data-del-o]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Excluir este escritório? Ação irreversível.')) return;
          try {
            await api.delete(`/offices/${btn.dataset.delO}`);
            showToast('Escritório excluído', 'success');
            loadOffices();
          } catch (e) { showToast(e.message, 'error'); }
        });
      });
      document.querySelectorAll('[data-webhook-o]').forEach(btn => {
        btn.addEventListener('click', () => showWebhookModal(btn.dataset.webhookO));
      });
    } catch (e) { showToast('Erro ao carregar escritórios', 'error'); }
  }

  async function loadCounters(officeId) {
    const listEl = document.querySelector(`#counters-for-${officeId} .counters-list`);
    if (!listEl) return;
    try {
      const counters = await api.get(`/offices/${officeId}/counters`);
      if (counters.length === 0) {
        listEl.innerHTML = '<div class="text-xs text-muted">Nenhum contador cadastrado.</div>';
        return;
      }
      listEl.innerHTML = counters.map(c => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
          <div><div style="font-weight:500;">${c.name}</div><div class="text-xs text-muted">${c.email}</div></div>
          <button class="btn-icon" style="color:var(--red);padding:4px;" data-del-c="${c.id}" title="Remover"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
      `).join('');
      listEl.querySelectorAll('[data-del-c]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Remover acesso?')) return;
          try { await api.delete(`/offices/counters/${btn.dataset.delC}`); showToast('Removido', 'success'); loadCounters(officeId); } catch (e) { showToast(e.message, 'error'); }
        });
      });
    } catch (e) { listEl.innerHTML = '<div class="text-xs text-danger">Erro.</div>'; }
  }

  function showAddOfficeModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-handle"></div><div class="modal-title">Novo Escritório</div><div class="gap-16"><div class="form-group"><label class="form-label">Nome do Escritório</label><input id="m-office-name" type="text" class="form-input" placeholder="Ex: Contabilidade Silva LTDA"/></div><button class="btn btn-primary" id="btn-conf-office">Salvar</button><button class="btn btn-outline" id="btn-cancel-office">Cancelar</button></div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.getElementById('btn-conf-office').addEventListener('click', async () => {
      const name = document.getElementById('m-office-name').value.trim();
      if (!name) return showToast('Preencha o nome', 'error');
      try { await api.post('/offices', { name }); showToast('Escritório criado!', 'success'); overlay.remove(); loadOffices(); } catch (e) { showToast(e.message, 'error'); }
    });
    document.getElementById('btn-cancel-office').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  function showAddCounterModal(officeId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-handle"></div><div class="modal-title">Novo Contador</div><div class="gap-16"><div class="form-group"><label class="form-label">Nome</label><input id="m-c-name" type="text" class="form-input" placeholder="João Silva"/></div><div class="form-group"><label class="form-label">E-mail</label><input id="m-c-email" type="email" class="form-input" placeholder="joao@escritorio.com"/></div><div class="form-group"><label class="form-label">Senha Inicial</label><input id="m-c-pass" type="password" class="form-input" placeholder="Min 6 caracteres"/></div><button class="btn btn-primary" id="btn-save-counter">Criar Acesso</button><button class="btn btn-outline" id="btn-cancel-counter">Cancelar</button></div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.getElementById('btn-save-counter').addEventListener('click', async () => {
      const name = document.getElementById('m-c-name').value.trim();
      const email = document.getElementById('m-c-email').value.trim();
      const password = document.getElementById('m-c-pass').value;
      if (!name || !email || !password) return showToast('Preencha todos os campos', 'error');
      try { await api.post(`/offices/${officeId}/counters`, { name, email, password }); showToast('Contador criado!', 'success'); overlay.remove(); loadCounters(officeId); } catch (e) { showToast(e.message, 'error'); }
    });
    document.getElementById('btn-cancel-counter').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  async function showWebhookModal(officeId) {
    try {
      const settings = await api.get(`/offices/${officeId}/settings`);
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:440px;">
          <div class="modal-handle"></div>
          <div class="modal-title" style="display:flex;align-items:center;gap:8px;">
            <svg width="20" height="20" fill="none" stroke="var(--brand)" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Webhook & Lembretes
          </div>
          <div class="gap-16">
            <div class="form-group">
              <label class="form-label">URL do Webhook (N8N, Zapier, etc)</label>
              <input id="wh-url" type="url" class="form-input" placeholder="https://n8n.example.com/webhook/..." value="${settings.webhook_url || ''}" />
              <p class="text-xs text-muted" style="margin-top:4px;">Lembretes de cobrança serão enviados para esta URL.</p>
            </div>
            <div class="form-group">
              <label class="form-label">Horário de Disparo</label>
              <div style="display:flex;gap:12px;align-items:center;">
                <input id="wh-hour" type="number" class="form-input" min="0" max="23" value="${settings.reminder_whatsapp_hour}" style="text-align:center;font-weight:700;">
                <span style="font-weight:800;color:var(--ink-3);font-size:1.2rem;">:</span>
                <input id="wh-min" type="number" class="form-input" min="0" max="59" value="${settings.reminder_whatsapp_minute}" style="text-align:center;font-weight:700;">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Limite (Dias Úteis)</label>
              <input id="wh-day" type="number" class="form-input" min="1" max="10" value="${settings.reminder_max_business_day || 3}" style="font-weight:700;">
            </div>
            <button class="btn btn-primary" id="btn-save-wh">Salvar Configurações</button>
            <button class="btn btn-outline" id="btn-cancel-wh">Cancelar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      document.getElementById('btn-save-wh').addEventListener('click', async () => {
        try {
          await api.put(`/offices/${officeId}/settings`, {
            webhook_url: document.getElementById('wh-url').value.trim() || null,
            reminder_whatsapp_hour: parseInt(document.getElementById('wh-hour').value),
            reminder_whatsapp_minute: parseInt(document.getElementById('wh-min').value),
            reminder_max_business_day: parseInt(document.getElementById('wh-day').value),
            reminder_enabled: true
          });
          showToast('Configurações salvas!', 'success');
          overlay.remove();
        } catch (e) { showToast(e.message, 'error'); }
      });
      document.getElementById('btn-cancel-wh').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    } catch (e) { showToast(e.message, 'error'); }
  }

  // ---- USERS TAB ----
  async function loadUsersTab(container) {
    container.innerHTML = `
      <div class="section-header" style="margin-bottom:16px;">
        <div class="section-title" style="display:flex;align-items:center;gap:8px;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          Gerenciamento de Usuários
        </div>
      </div>
      <div class="search-box" style="position:relative;margin-bottom:16px;">
        <input type="text" id="user-search" class="form-input" placeholder="Buscar por nome ou email..." style="padding-left:40px;border-radius:12px;">
        <svg width="18" height="18" fill="none" stroke="#64748b" stroke-width="2" viewBox="0 0 24 24" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      </div>
      <div id="users-container"><div class="skeleton" style="height:200px"></div></div>
    `;
    loadUsers();
    document.getElementById('user-search').addEventListener('input', loadUsers);
  }

  async function loadUsers() {
    try {
      const users = await api.get('/offices/users/all');
      const search = document.getElementById('user-search')?.value.toLowerCase() || '';
      const filtered = users.filter(u => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
      const container = document.getElementById('users-container');
      if (!container) return;

      if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="empty-title">Nenhum usuário encontrado</p></div>';
        return;
      }

      container.innerHTML = `
        <div style="overflow-x:auto;">
          <table class="data-table" style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:2px solid var(--line);background:var(--bg);">
                <th style="padding:12px 16px;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left;">Nome</th>
                <th style="padding:12px 16px;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left;">Email</th>
                <th style="padding:12px 16px;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;text-align:left;">Escritório</th>
                <th style="padding:12px 16px;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;text-align:center;">CNPJs</th>
                <th style="padding:12px 16px;font-size:0.75rem;font-weight:700;color:#64748b;text-transform:uppercase;text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(u => `
                <tr style="border-bottom:1px solid var(--line);">
                  <td style="padding:12px 16px;font-weight:600;">${u.name}</td>
                  <td style="padding:12px 16px;font-size:0.85rem;color:#64748b;">${u.email}</td>
                  <td style="padding:12px 16px;font-size:0.85rem;">${u.office_name || '<span class="text-muted">-</span>'}</td>
                  <td style="padding:12px 16px;text-align:center;font-weight:700;">${u.cnpj_count}</td>
                  <td style="padding:12px 16px;text-align:center;">
                    <button class="btn btn-sm btn-toggle-user" data-uid="${u.id}" style="font-size:0.75rem;padding:4px 12px;border-radius:100px;border:1px solid ${u.is_active ? 'var(--green)' : 'var(--red)'};background:${u.is_active ? 'var(--green-soft)' : 'var(--red-soft)'};color:${u.is_active ? 'var(--green)' : 'var(--red)'};font-weight:700;cursor:pointer;">
                      ${u.is_active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      document.querySelectorAll('.btn-toggle-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const result = await api.put(`/offices/users/${btn.dataset.uid}/toggle`);
            showToast(result.message, 'success');
            loadUsers();
          } catch (e) { showToast(e.message, 'error'); }
        });
      });
    } catch (e) { showToast(e.message, 'error'); }
  }

  // Initial load
  loadTab('dashboard');
}

// ---- Init ----
render();
