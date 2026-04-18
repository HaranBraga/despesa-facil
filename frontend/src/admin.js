import './style.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ---- API Client ----
const api = {
  async request(method, path, body) {
    const token = localStorage.getItem('admin_token');
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
      const hadToken = !!localStorage.getItem('admin_token');
      localStorage.removeItem('admin_token');
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
  const token = localStorage.getItem('admin_token');
  if (!token) return renderLogin();
  try {
    const me = await api.get('/auth/me');
    if (me.type !== 'admin') {
      showToast('Acesso negado. Apenas administradores.', 'error');
      localStorage.removeItem('admin_token');
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
        <span class="text-gradient">Admin</span>
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
      if (data.user.type !== 'admin') throw new Error('Acesso negado. Usuário não é administrador.');
      localStorage.setItem('admin_token', data.token);
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
        <div class="sidebar-logo" style="justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;overflow:hidden;">
            <div class="sidebar-logo-icon">
              <svg width="22" height="22" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
                <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path>
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
            <svg width="22" height="22" fill="none" stroke="var(--brand)" stroke-width="2.5" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
            <span class="text-gradient">Admin</span>
          </span>
        </header>
        <main id="admin-main" class="page-content">
          <div class="card" style="background:linear-gradient(135deg, rgba(79,156,249,0.08), rgba(124,58,237,0.08)); border-color:rgba(124,58,237,0.15); margin-bottom:24px;">
            <p style="margin:0;font-weight:600;color:var(--ink)">Olá, ${user.name}</p>
            <p class="text-sm text-muted mt-4">Gerencie escritórios, contadores e usuários da plataforma.</p>
          </div>
          <div id="tab-content"></div>
        </main>
        <nav class="bottom-nav">
          <button class="nav-item active" data-tab="dashboard">
            <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg></div>
            <span class="nav-label">Início</span>
          </button>
          <button class="nav-item" data-tab="offices">
            <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
            <span class="nav-label">Escritórios</span>
          </button>
          <button class="nav-item" data-tab="users">
            <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
            <span class="nav-label">Usuários</span>
          </button>
        </nav>
      </div>
    </div>
  `;

  // Sidebar navigation
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll(`[data-tab="${tab}"]`).forEach(b => b.classList.add('active'));
      currentTab = tab;
      loadTab(currentTab);
    });
  });

  document.getElementById('btn-logout-sidebar').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
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
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;border-top:1px solid var(--line);padding-top:12px;">
            <div id="counters-for-${o.id}" class="gap-4">
              <div class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Contadores</div>
              <div class="counters-list text-sm">Carregando...</div>
            </div>
            <div id="clients-for-${o.id}" class="gap-4">
              <div class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Clientes</div>
              <div class="clients-list text-sm">Carregando...</div>
            </div>
          </div>
        </div>
      `).join('');

      offices.forEach(o => { loadCounters(o.id); loadClients(o.id); });

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
          <div style="display:flex;gap:4px;">
            <button class="btn-icon btn-edit-c" data-cid="${c.id}" data-cemail="${c.email}" data-cname="${c.name}" title="Editar" style="padding:4px;color:var(--brand);"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="btn-icon" style="color:var(--red);padding:4px;" data-del-c="${c.id}" title="Remover"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>
      `).join('');
      listEl.querySelectorAll('[data-del-c]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Remover acesso?')) return;
          try { await api.delete(`/offices/counters/${btn.dataset.delC}`); showToast('Removido', 'success'); loadCounters(officeId); } catch (e) { showToast(e.message, 'error'); }
        });
      });
      listEl.querySelectorAll('.btn-edit-c').forEach(btn => {
        btn.addEventListener('click', () => showEditCounterModal(btn.dataset.cid, btn.dataset.cname, btn.dataset.cemail, officeId));
      });
    } catch (e) { listEl.innerHTML = '<div class="text-xs text-danger">Erro.</div>'; }
  }

  async function loadClients(officeId) {
    const listEl = document.querySelector(`#clients-for-${officeId} .clients-list`);
    if (!listEl) return;
    try {
      const clients = await api.get(`/offices/${officeId}/clients`);
      if (clients.length === 0) {
        listEl.innerHTML = '<div class="text-xs text-muted">Nenhum cliente vinculado.</div>';
        return;
      }
      listEl.innerHTML = clients.map(c => `
        <div style="padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.05);">
          <div style="font-weight:500;font-size:0.85rem;">${c.name}</div>
          <div class="text-xs text-muted">${c.email} · ${c.cnpj_count} CNPJ${c.cnpj_count != 1 ? 's' : ''}</div>
        </div>
      `).join('');
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

  function showEditCounterModal(counterId, counterName, counterEmail, officeId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><div class="modal-handle"></div>
      <div class="modal-title">Editar Contador: ${counterName}</div>
      <div class="gap-16">
        <div class="form-group"><label class="form-label">Novo E-mail</label><input id="m-ec-email" type="email" class="form-input" placeholder="${counterEmail}"/></div>
        <div class="form-group"><label class="form-label">Nova Senha <span class="text-muted">(deixe em branco para não alterar)</span></label><input id="m-ec-pass" type="password" class="form-input" placeholder="Min 6 caracteres"/></div>
        <button class="btn btn-primary" id="btn-save-ec">Salvar Alterações</button>
        <button class="btn btn-outline" id="btn-cancel-ec">Cancelar</button>
      </div></div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.getElementById('btn-save-ec').addEventListener('click', async () => {
      const email = document.getElementById('m-ec-email').value.trim();
      const password = document.getElementById('m-ec-pass').value;
      if (!email && !password) return showToast('Informe email ou senha para alterar', 'error');
      const body = {};
      if (email) body.email = email;
      if (password) body.password = password;
      try {
        await api.put(`/offices/counters/${counterId}`, body);
        showToast('Contador atualizado!', 'success');
        overlay.remove();
        loadCounters(officeId);
      } catch (e) { showToast(e.message, 'error'); }
    });
    document.getElementById('btn-cancel-ec').addEventListener('click', () => overlay.remove());
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
            <button class="btn btn-outline" id="btn-test-wh" style="display:flex;align-items:center;gap:6px;">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Testar Webhook
            </button>
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
      document.getElementById('btn-test-wh').addEventListener('click', async () => {
        const url = document.getElementById('wh-url').value.trim();
        if (!url) return showToast('Informe a URL do webhook antes de testar', 'error');
        const btn = document.getElementById('btn-test-wh');
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true, source: 'Despesa Fácil', timestamp: new Date().toISOString() })
          });
          showToast(res.ok ? `Webhook respondeu: ${res.status} OK` : `Resposta: ${res.status}`, res.ok ? 'success' : 'error');
        } catch (e) {
          showToast('Erro ao conectar: ' + e.message, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Testar Webhook';
        }
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
        <button class="btn btn-primary btn-sm" id="btn-new-user" style="display:flex;align-items:center;gap:4px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Novo Usuário
        </button>
      </div>
      <div class="search-box" style="position:relative;margin-bottom:16px;">
        <input type="text" id="user-search" class="form-input" placeholder="Buscar por nome ou usuário..." style="padding-left:40px;border-radius:12px;">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ink-3);"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      </div>
      <div id="users-container"><div class="skeleton" style="height:200px"></div></div>
    `;
    loadUsers();
    document.getElementById('user-search').addEventListener('input', loadUsers);
    document.getElementById('btn-new-user').addEventListener('click', () => showAddUserModal());
  }

  async function showAddUserModal() {
    let offices = [];
    try { offices = await api.get('/offices'); } catch (e) { showToast('Erro ao carregar escritórios', 'error'); return; }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal"><div class="modal-handle"></div>
        <div class="modal-title">Cadastrar Novo Usuário</div>
        <div class="gap-16">
          <div class="form-group"><label class="form-label">Nome completo</label><input id="m-nu-name" type="text" class="form-input" placeholder="João Silva"/></div>
          <div class="form-group"><label class="form-label">Usuário <span class="text-muted text-xs">(para fazer login)</span></label><input id="m-nu-username" type="text" class="form-input" placeholder="joaosilva" autocomplete="off"/></div>
          <div class="form-group"><label class="form-label">Telefone / WhatsApp <span class="text-muted text-xs">(opcional)</span></label><input id="m-nu-phone" type="tel" class="form-input" placeholder="5511999999999" inputmode="tel"/></div>
          <div class="form-group"><label class="form-label">Escritório Contábil</label>
            <select id="m-nu-office" class="form-select">
              <option value="">Selecione...</option>
              ${offices.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Senha</label><input id="m-nu-pass" type="password" class="form-input" placeholder="Mín. 6 caracteres"/></div>
          <button class="btn btn-primary" id="btn-save-nu">Criar Usuário</button>
          <button class="btn btn-outline" id="btn-cancel-nu">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.getElementById('btn-save-nu').addEventListener('click', async () => {
      const name = document.getElementById('m-nu-name').value.trim();
      const username = document.getElementById('m-nu-username').value.trim();
      const phone = document.getElementById('m-nu-phone').value.trim();
      const office_id = document.getElementById('m-nu-office').value;
      const password = document.getElementById('m-nu-pass').value;
      if (!name || !username || !office_id || !password) return showToast('Preencha nome, usuário, escritório e senha', 'error');
      try {
        await api.post('/offices/users/register', { name, username, phone: phone || undefined, office_id, password });
        showToast('Usuário criado!', 'success');
        overlay.remove();
        loadUsers();
      } catch (e) { showToast(e.message, 'error'); }
    });
    document.getElementById('btn-cancel-nu').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  async function loadUsers() {
    try {
      const users = await api.get('/offices/users/all');
      const search = document.getElementById('user-search')?.value.toLowerCase() || '';
      const filtered = users.filter(u => u.name.toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search) || (u.username || '').toLowerCase().includes(search));
      const container = document.getElementById('users-container');
      if (!container) return;

      if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><p class="empty-title">Nenhum usuário encontrado</p></div>';
        return;
      }

      container.innerHTML = filtered.map(u => `
        <div class="card" style="padding:16px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:12px;min-width:0;">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--brand-soft);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;flex-shrink:0;">
                ${u.name.charAt(0).toUpperCase()}
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.name}</div>
                <div style="font-size:0.78rem;color:var(--ink-3);">${u.username ? '@' + u.username : u.email || '—'}${u.phone ? ' · ' + u.phone : ''}</div>
                <div style="font-size:0.72rem;color:var(--ink-3);margin-top:2px;">${u.office_name || 'Sem escritório'} · ${u.cnpj_count} CNPJ${u.cnpj_count != 1 ? 's' : ''}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
              <span style="padding:3px 10px;border-radius:100px;font-size:0.72rem;font-weight:700;border:1px solid ${u.is_active ? 'var(--green)' : 'var(--red)'};background:${u.is_active ? 'var(--green-soft)' : 'var(--red-soft)'};color:${u.is_active ? 'var(--green)' : 'var(--red)'};">
                ${u.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <button class="action-btn edit btn-edit-user" data-uid="${u.id}" data-uname="${u.name}" data-uemail="${u.email}" title="Editar usuário">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="action-btn btn-toggle-user" data-uid="${u.id}" title="${u.is_active ? 'Desativar' : 'Ativar'}" style="color:${u.is_active ? 'var(--amber)' : 'var(--green)'};">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${u.is_active ? '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>' : '<path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/>'}</svg>
              </button>
              <button class="action-btn delete btn-del-user" data-uid="${u.id}" data-uname="${u.name}" title="Excluir usuário">
                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.btn-toggle-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const result = await api.put(`/offices/users/${btn.dataset.uid}/toggle`);
            showToast(result.message, 'success');
            loadUsers();
          } catch (e) { showToast(e.message, 'error'); }
        });
      });

      document.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => showEditUserModal(btn.dataset.uid, btn.dataset.uname, btn.dataset.uemail));
      });

      document.querySelectorAll('.btn-del-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm(`Excluir o usuário "${btn.dataset.uname}"? Esta ação é irreversível e remove todos os seus CNPJs e lançamentos.`)) return;
          try {
            await api.delete(`/offices/users/${btn.dataset.uid}`);
            showToast('Usuário excluído', 'success');
            loadUsers();
          } catch (e) { showToast(e.message, 'error'); }
        });
      });
    } catch (e) { showToast(e.message, 'error'); }
  }

  function showEditUserModal(userId, userName, userEmail) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-handle"></div>
        <div class="modal-title">Editar Usuário: ${userName}</div>
        <div class="gap-16">
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input id="m-eu-name" type="text" class="form-input" value="${userName}" />
          </div>
          <div class="form-group">
            <label class="form-label">Novo E-mail</label>
            <input id="m-eu-email" type="email" class="form-input" placeholder="${userEmail}" />
          </div>
          <div class="form-group">
            <label class="form-label">Nova Senha <span style="color:var(--ink-3);font-weight:400;">(deixe em branco para não alterar)</span></label>
            <input id="m-eu-pass" type="password" class="form-input" placeholder="Mín. 6 caracteres" />
          </div>
          <button class="btn btn-primary" id="btn-save-eu">Salvar Alterações</button>
          <button class="btn btn-outline" id="btn-cancel-eu">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.getElementById('btn-save-eu').addEventListener('click', async () => {
      const name = document.getElementById('m-eu-name').value.trim();
      const email = document.getElementById('m-eu-email').value.trim();
      const password = document.getElementById('m-eu-pass').value;
      const body = {};
      if (name && name !== userName) body.name = name;
      if (email) body.email = email;
      if (password) body.password = password;
      if (Object.keys(body).length === 0) return showToast('Nenhuma alteração detectada', 'error');
      try {
        await api.put(`/offices/users/${userId}`, body);
        showToast('Usuário atualizado!', 'success');
        overlay.remove();
        loadUsers();
      } catch (e) { showToast(e.message, 'error'); }
    });
    document.getElementById('btn-cancel-eu').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  // Initial load
  loadTab('dashboard');
}

// ---- Init ----
render();
