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
      throw new Error(''); // Silent failure for first load
    }
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  },
  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
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
      showToast('Acesso negado. Apenas administradores podem acessar esta página.', 'error');
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
        <svg width="32" height="32" fill="none" stroke="var(--accent)" stroke-width="2.5" viewBox="0 0 24 24">
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
      if (!data.user.is_admin) {
        throw new Error('Acesso negado. Usuário não é administrador.');
      }
      localStorage.setItem('token', data.token);
      render();
    } catch (e) { showToast(e.message, 'error'); }
  });
  document.getElementById('l-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('l-pass').focus(); });
  document.getElementById('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-login').click(); });
}

// ================= DASHBOARD ADMIN =================
async function renderDashboard(user) {
  document.getElementById('app').innerHTML = `
    <div class="app-shell" style="max-width: 1000px; margin: 0 auto; display: block; height: auto; min-height: 100vh;">
      <header class="app-header" style="border-radius: 12px; margin: 16px; position: sticky; top: 16px; z-index: 50;">
        <span class="logo" style="display:flex;align-items:center;gap:8px;">
          <svg width="24" height="24" fill="none" stroke="var(--accent)" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span class="text-gradient">Admin | Despesa Fácil</span>
        </span>
        <button class="btn-icon" id="btn-logout" title="Sair do Admin">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </header>
      
      <main style="padding: 0 16px 40px 16px;" class="gap-16">
        <div class="card" style="background: linear-gradient(135deg, rgba(79,156,249,0.1), rgba(124,58,237,0.1)); border-color: rgba(124,58,237,0.2);">
           <p style="margin:0; font-weight:600; color:var(--text-primary)">Olá, ${user.name}</p>
           <p class="text-sm text-muted" style="margin-top:4px;">Gerencie os Escritórios de Contabilidade ativos na plataforma.</p>
        </div>

        <div class="card">
            <div class="section-header" style="margin-bottom:16px;">
                <div class="section-title" style="display:flex;align-items:center;gap:8px;">
                     <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                     Escritórios de Contabilidade
                </div>
                <button class="btn btn-primary btn-sm" id="btn-new-office">+ Novo Escritório</button>
            </div>
            
            <div id="offices-container" class="gap-8">
                <div class="skeleton" style="height:60px"></div>
                <div class="skeleton" style="height:60px"></div>
            </div>
        </div>
      </main>
    </div>
  `;

  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    renderLogin();
  });

  const showAddModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
          <div class="modal-handle"></div>
          <div class="modal-title" style="display:flex;align-items:center;gap:8px;">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Novo Escritório
          </div>
          <div class="gap-16">
            <div class="form-group">
              <label class="form-label">Nome do Escritório</label>
              <input id="m-office-name" type="text" class="form-input" placeholder="Ex: Contabilidade Silva LTDA" />
            </div>
            <button class="btn btn-primary" id="btn-conf-office">Salvar Escritório</button>
            <button class="btn btn-outline" id="btn-cancel-office">Cancelar</button>
          </div>
        </div>
      `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    document.getElementById('btn-conf-office').addEventListener('click', async () => {
      const name = document.getElementById('m-office-name').value.trim();
      if (!name) return showToast('Preencha o nome do escritório', 'error');
      try {
        await api.post('/offices', { name });
        showToast('Escritório criado com sucesso!', 'success');
        overlay.remove();
        loadOffices();
      } catch (e) { showToast(e.message, 'error'); }
    });
    document.getElementById('btn-cancel-office').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  };

  document.getElementById('btn-new-office').addEventListener('click', showAddModal);

  async function loadOffices() {
    try {
      const offices = await api.get('/offices');
      const container = document.getElementById('offices-container');

      if (offices.length === 0) {
        container.innerHTML = `
                <div class="empty-state">
                  <div class="empty-icon"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></div>
                  <p class="empty-title">Nenhum escritório</p>
                  <p class="empty-sub">Cadastre o primeiro escritório para seus clientes poderem se registrar.</p>
                </div>
              `;
        return;
      }

      container.innerHTML = offices.map(o => `
              <div class="expense-item" style="padding:12px 16px">
                  <div class="expense-info">
                      <div class="expense-name" style="font-size:1rem;">${o.name}</div>
                      <div class="text-sm text-muted" style="margin-top:2px;font-family:monospace">ID: ${o.id.split('-')[0]}...</div>
                  </div>
                  <button class="btn btn-danger btn-sm" data-del-o="${o.id}" style="display:flex;align-items:center;justify-content:center;padding:8px;border-radius:8px;">
                     <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
              </div>
          `).join('');

      document.querySelectorAll('[data-del-o]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Tem certeza que deseja excluir este escritório? Clientes associados não poderão fazer login corretamente. Esta ação é irreversível.')) return;
          try {
            await api.delete(`/offices/${btn.dataset.delO}`);
            showToast('Escritório excluído', 'success');
            loadOffices();
          } catch (e) { showToast(e.message, 'error'); }
        });
      });

    } catch (e) {
      showToast('Erro ao carregar escritórios', 'error');
    }
  }

  loadOffices();
}

// ---- Init ----
render();
