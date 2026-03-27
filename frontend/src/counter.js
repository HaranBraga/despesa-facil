import './style.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ---- API Client ----
const api = {
    async request(method, path, body) {
        const token = localStorage.getItem('counter_token');
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
            localStorage.removeItem('counter_token');
            renderLogin();
            throw new Error('Sessão expirada.');
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

// ---- Login ----
function renderLogin() {
    document.getElementById('app').innerHTML = `
        <div class="auth-page">
            <div class="auth-logo" style="display:flex;align-items:center;justify-content:center;gap:12px;">
                <svg width="32" height="32" fill="none" stroke="var(--brand)" stroke-width="2.5" viewBox="0 0 24 24">
                    <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path>
                </svg>
                <span class="text-gradient">Despesa Fácil</span>
            </div>
            <p class="auth-sub">Área do Contador</p>
            <div class="card auth-card gap-16">
                <div class="form-group">
                    <label class="form-label">E-mail</label>
                    <input id="l-email" type="email" class="form-input" placeholder="contador@escritorio.com" inputmode="email" />
                </div>
                <div class="form-group">
                    <label class="form-label">Senha</label>
                    <input id="l-pass" type="password" class="form-input" placeholder="••••••" />
                </div>
                <button class="btn btn-primary" id="btn-login">Entrar</button>
                <p class="text-center text-xs text-muted mt-8">Conta criada pelo seu escritório de contabilidade</p>
            </div>
        </div>
    `;
    document.getElementById('btn-login').addEventListener('click', async () => {
        const email = document.getElementById('l-email').value.trim();
        const password = document.getElementById('l-pass').value;
        if (!email || !password) return showToast('Preencha todos os campos', 'error');
        try {
            const data = await api.post('/auth/login', { email, password });
            if (!data.user.office_id) throw new Error('Acesso negado. Esta conta não é de um contador.');
            localStorage.setItem('counter_token', data.token);
            render();
        } catch (e) { showToast(e.message, 'error'); }
    });
    document.getElementById('l-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('l-pass').focus(); });
    document.getElementById('l-pass').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-login').click(); });
}

// ---- Render ----
async function render() {
    const token = localStorage.getItem('counter_token');
    if (!token) {
        renderLogin();
        return;
    }

    try {
        const me = await api.get('/auth/me');
        if (!me.office_id) {
            showToast('Acesso negado. Esta conta não é de um contador.', 'error');
            localStorage.removeItem('counter_token');
            renderLogin();
            return;
        }
        renderDashboard(me);
    } catch (e) {
        if (e.message) showToast(e.message, 'error');
        renderLogin();
    }
}

async function renderDashboard(user) {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let selectedCompanyId = null;
    let isSidebarCollapsed = false;
    let currentFilter = 'all'; // all, completed, pending
    let companiesList = [];

    const now = new Date();
    let dashboardMonth = now.getMonth() + 1;
    let dashboardYear = now.getFullYear();


    document.getElementById('app').innerHTML = `
    <div class="app-shell">
        <aside id="sidebar-main" class="sidebar-main">
            <div class="sidebar-logo" style="justify-content:space-between;width:100%;">
                <div style="display:flex;align-items:center;gap:12px;overflow:hidden;">
                    <div class="sidebar-logo-icon">
                         <svg width="24" height="24" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24">
                            <rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path>
                        </svg>
                    </div>
                    <div class="collapse-hide">
                        <div class="sidebar-logo-text">Despesa Fácil</div>
                        <div class="sidebar-logo-badge">Contador</div>
                    </div>
                </div>
                <button id="btn-toggle-sidebar" class="btn-sidebar-toggle">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
            </div>

            <nav class="sidebar-nav">
                <button class="nav-item-side active">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                    <span class="collapse-hide">Dashboard</span>
                </button>
            </nav>

            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-avatar">${user.name.charAt(0)}</div>
                    <div class="collapse-hide" style="min-width:0;">
                        <div class="sidebar-user-name">${user.name}</div>
                        <div class="sidebar-user-role">Escritório Ativo</div>
                    </div>
                </div>
                <button class="nav-item-side" id="btn-settings">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
                    <span class="collapse-hide">Limites</span>
                </button>
                <button class="nav-item-side" id="btn-logout" style="color:var(--red);">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span class="collapse-hide">Sair</span>
                </button>
            </div>
        </aside>
        
        <!-- Sidebar overlay for mobile -->
        <div class="sidebar-overlay" id="sidebar-overlay"></div>

        <!-- Main Content -->
        <main class="page-content" id="main-content">
            <header class="app-header">
                <button class="btn-ghost" id="btn-toggle-mobile-menu">
                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <span class="logo"><span class="text-gradient" style="font-weight:800;">Painel do Contador</span></span>
            </header>
            
            <!-- VIEW: DASHBOARD MESTRE -->
            <div id="dashboard-view" style="display:flex; flex-direction:column; gap:32px; transition:var(--ease);">
                <header style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h1 style="font-size:1.8rem; font-weight:800; color:#1e293b; margin-bottom:4px;">Olá, ${user.name.split(' ')[0]}</h1>
                        <p style="color:#64748b;">Aqui está o resumo contábil do seu escritório.</p>
                    </div>
                    
                    <div id="dashboard-period-picker" style="display:flex; gap:12px; background:white; padding:12px 20px; border-radius:16px; box-shadow:var(--shadow-1); border:1px solid var(--line); align-items:center;">
                        <span style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Período:</span>
                        <select id="dash-sel-month" class="form-input" style="width:auto; padding:4px 8px; border:none; background:transparent; font-weight:600; cursor:pointer;"></select>
                        <div style="width:1px; height:20px; background:var(--line);"></div>
                        <select id="dash-sel-year" class="form-input" style="width:auto; padding:4px 8px; border:none; background:transparent; font-weight:600; cursor:pointer;"></select>
                    </div>
                </header>

                <!-- Summary Cards Premium -->
            <div class="grid-stats" id="summary-container">
                <div class="summary-card-v2 animate-up glass clickable-card active-card" data-filter="all" data-color="var(--brand)" style="--delay:0ms; cursor:pointer; border-color: var(--brand);">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--brand-soft); color:var(--brand);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 21h18M3 7v14M21 7v14M12 3L2 7h20L12 3z"/></svg>
                        </div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Total de Empresas</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-total">-</div>
                    </div>
                </div>

                <div class="summary-card-v2 animate-up glass clickable-card" data-filter="delivered" data-color="var(--green)" style="--delay:100ms; cursor:pointer;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--green-soft); color:var(--green);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <div id="prog-delivered" style="font-size:0.75rem; font-weight:700; color:var(--green); background:var(--green-soft); padding:4px 10px; border-radius:100px;">0%</div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Entregues</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-delivered">-</div>
                    </div>
                </div>

                <div class="summary-card-v2 animate-up glass clickable-card" data-filter="in_progress" data-color="#8b5cf6" style="--delay:200ms; cursor:pointer;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:rgba(139,92,246,0.10); color:#8b5cf6;">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </div>
                        <div id="prog-in-progress" style="font-size:0.75rem; font-weight:700; color:#8b5cf6; background:rgba(139,92,246,0.10); padding:4px 10px; border-radius:100px;">0%</div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Em Digitação</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-in-progress">-</div>
                    </div>
                </div>

                <div class="summary-card-v2 animate-up glass clickable-card" data-filter="pending" data-color="var(--red)" style="--delay:300ms; cursor:pointer;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--red-soft); color:var(--red);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4M12 16h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z"/></svg>
                        </div>
                        <div id="prog-pending" style="font-size:0.75rem; font-weight:700; color:var(--red); background:var(--red-soft); padding:4px 10px; border-radius:100px;">0%</div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Pendente</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-pending">-</div>
                    </div>
                </div>
            </div>

            <!-- Company List Area -->
            <div style="display:flex; flex-direction:column; gap:16px;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
                    <div>
                        <div style="font-size:1.05rem; font-weight:700; color:#1e293b;">Empresas</div>
                        <div class="text-xs text-muted" id="company-count">0 empresas</div>
                    </div>
                    <div class="search-box" style="position:relative; flex:1; min-width:180px; max-width:320px;">
                        <input type="text" id="company-search" class="form-input" placeholder="Buscar empresa ou CNPJ..." style="padding-left:40px; border-radius:12px; font-size:0.85rem;">
                        <svg width="18" height="18" fill="none" stroke="#64748b" stroke-width="2" viewBox="0 0 24 24" style="position:absolute; left:14px; top:50%; transform:translateY(-50%);"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    </div>
                </div>
                <div id="companies-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:12px;">
                    <div class="skeleton" style="height:96px; border-radius:16px;"></div>
                    <div class="skeleton" style="height:96px; border-radius:16px;"></div>
                    <div class="skeleton" style="height:96px; border-radius:16px;"></div>
                </div>
            </div>
            </div> <!-- Close dashboard-view -->
            
            <!-- VIEW: DETALHE COMPANHIA -->
            <div id="company-detail-view" style="display:none; flex-direction:column; gap:16px; transition:var(--ease);">
                <!-- Header -->
                <header style="display:flex; align-items:center; gap:12px;">
                    <button id="btn-back-dashboard" style="width:40px; height:40px; border-radius:12px; border:1px solid var(--line); background:white; display:flex; align-items:center; justify-content:center; color:#64748b; cursor:pointer; flex-shrink:0; transition:var(--ease);">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    </button>
                    <div style="flex:1; min-width:0;">
                        <h1 id="detail-company-name" style="font-size:1.2rem; font-weight:800; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0;">Carregando...</h1>
                        <p id="detail-company-cnpj" style="color:#64748b; font-size:0.78rem; margin:0; font-family:monospace;">--</p>
                    </div>
                </header>

                <!-- Tabs -->
                <div style="display:flex; gap:4px; background:var(--bg); padding:4px; border-radius:14px; border:1px solid var(--line);">
                    <button class="detail-tab-btn active" data-tab="relatorios" style="flex:1; padding:9px 0; border-radius:10px; border:none; font-size:0.85rem; font-weight:700; cursor:pointer; transition:var(--ease); background:white; color:var(--brand); box-shadow:0 1px 4px rgba(0,0,0,0.08);">
                        Relatórios
                    </button>
                    <button class="detail-tab-btn" data-tab="conta" style="flex:1; padding:9px 0; border-radius:10px; border:none; font-size:0.85rem; font-weight:700; cursor:pointer; transition:var(--ease); background:transparent; color:var(--ink-3);">
                        Conta
                    </button>
                </div>

                <!-- TAB: RELATÓRIOS -->
                <div id="detail-tab-relatorios" style="display:flex; flex-direction:column; gap:16px;">
                    <!-- Hidden period selectors (driven by month pills) -->
                    <select id="sel-month" style="display:none;"></select>
                    <select id="sel-year" style="display:none;"></select>

                    <!-- Month pills -->
                    <div>
                        <div style="font-size:0.68rem; font-weight:700; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px;">Período</div>
                        <div id="month-pills-row" class="cnpj-selector"></div>
                    </div>

                    <!-- Report summary card -->
                    <div id="report-summary-card" class="card" style="padding:16px; background:linear-gradient(135deg, var(--brand-soft), rgba(139,92,246,0.05)); border-color:rgba(99,102,241,0.2);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div style="font-size:0.68rem; font-weight:700; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Total do período</div>
                                <div id="report-total-display" style="font-size:1.5rem; font-weight:800; color:#1e293b; letter-spacing:-0.02em;">--</div>
                            </div>
                            <div id="report-status-badge"></div>
                        </div>
                        <div id="report-categories-mini" style="margin-top:12px; display:none; padding-top:12px; border-top:1px solid rgba(99,102,241,0.1);"></div>
                    </div>

                    <!-- Export buttons -->
                    <div style="display:flex; gap:8px; align-self:flex-end; flex-wrap:wrap; justify-content:flex-end;">
                        <button id="btn-export-detailed" class="btn btn-outline btn-sm" style="display:flex; align-items:center; gap:6px; padding:8px 14px;">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Detalhado
                        </button>
                        <button id="btn-export-grouped" class="btn btn-outline btn-sm" style="display:flex; align-items:center; gap:6px; padding:8px 14px; color:#8b5cf6; border-color:#8b5cf6;">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Por Categoria
                        </button>
                    </div>

                    <!-- Expense table -->
                    <div class="card" style="padding:0; overflow:hidden; border-radius:16px;">
                        <div style="padding:14px 16px; border-bottom:1px solid var(--line); background:var(--bg);">
                            <h3 style="font-size:0.85rem; font-weight:700; color:#1e293b; margin:0;">Lançamentos do período</h3>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
                                <thead>
                                    <tr style="border-bottom:1px solid var(--line); background:rgba(241,245,249,0.5);">
                                        <th style="padding:10px 14px; font-size:0.68rem; font-weight:700; color:#64748b; text-transform:uppercase;">Data</th>
                                        <th style="padding:10px 14px; font-size:0.68rem; font-weight:700; color:#64748b; text-transform:uppercase;">Descrição</th>
                                        <th style="padding:10px 14px; font-size:0.68rem; font-weight:700; color:#64748b; text-transform:uppercase;">Categoria</th>
                                        <th style="padding:10px 14px; font-size:0.68rem; font-weight:700; color:#64748b; text-transform:uppercase; text-align:right;">Valor</th>
                                        <th style="padding:10px 14px; font-size:0.68rem; font-weight:700; color:#64748b; text-transform:uppercase; text-align:center;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="expenses-list-tbody">
                                    <tr><td colspan="5" style="padding:40px; text-align:center;"><div class="skeleton" style="height:120px; border-radius:12px;"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- TAB: CONTA -->
                <div id="detail-tab-conta" style="display:none; flex-direction:column; gap:16px;">
                    <div id="conta-loading" class="card" style="padding:24px;">
                        <div class="skeleton" style="height:80px; border-radius:12px;"></div>
                    </div>
                </div>
            </div>
        </main>
        <nav class="bottom-nav" id="counter-bottom-nav">
            <button class="nav-item active" id="bn-dashboard">
                <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg></div>
                <span class="nav-label">Dashboard</span>
            </button>
            <button class="nav-item" id="bn-settings">
                <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
                <span class="nav-label">Configurações</span>
            </button>
            <button class="nav-item" id="bn-logout" style="color:var(--red);">
                <div class="nav-icon"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>
                <span class="nav-label">Sair</span>
            </button>
        </nav>
    </div>
    `;

    async function loadSummary() {
        try {
            const summ = await api.get(`/counter/dashboard-summary?month=${dashboardMonth}&year=${dashboardYear}`);
            document.getElementById('summ-total').textContent = summ.total;
            document.getElementById('summ-delivered').textContent = summ.delivered;
            document.getElementById('summ-in-progress').textContent = summ.in_progress;
            document.getElementById('summ-pending').textContent = summ.pending;
            
            const pctDeliv = Math.round((summ.delivered / summ.total) * 100) || 0;
            const pctProg = Math.round((summ.in_progress / summ.total) * 100) || 0;
            const pctPend = Math.round((summ.pending / summ.total) * 100) || 0;
            
            document.getElementById('prog-delivered').textContent = `${pctDeliv}%`;
            document.getElementById('prog-in-progress').textContent = `${pctProg}%`;
            document.getElementById('prog-pending').textContent = `${pctPend}%`;
        } catch (e) { console.error('Erro ao carregar resumo:', e); }
    }

    async function loadCompanies() {
        try {
            companiesList = await api.get(`/counter/companies?month=${dashboardMonth}&year=${dashboardYear}`);
            renderCompanies();
        } catch (e) { showToast(e.message, 'error'); }
    }

    function renderCompanies() {
        const container = document.getElementById('companies-container');
        const searchTerm = document.getElementById('company-search')?.value.toLowerCase() || '';

        let filtered = companiesList;

        if (currentFilter === 'delivered') filtered = companiesList.filter(c => c.is_locked);
        if (currentFilter === 'in_progress') filtered = companiesList.filter(c => c.has_expenses && !c.is_locked);
        if (currentFilter === 'pending') filtered = companiesList.filter(c => !c.has_expenses);

        if (searchTerm) {
            filtered = filtered.filter(c =>
                c.razao_social.toLowerCase().includes(searchTerm) ||
                c.cnpj.includes(searchTerm) ||
                (c.owner_name && c.owner_name.toLowerCase().includes(searchTerm))
            );
        }

        document.getElementById('company-count').textContent = `${filtered.length} empresa${filtered.length !== 1 ? 's' : ''}`;

        container.style.transition = 'opacity 0.2s ease';
        container.style.opacity = '0';

        setTimeout(() => {
            if (filtered.length === 0) {
                container.style.gridTemplateColumns = '1fr';
                container.innerHTML = `
                <div class="empty-state animate-fade" style="padding:48px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px; grid-column:1/-1;">
                    <div style="width:64px; height:64px; border-radius:50%; background:var(--bg); display:flex; align-items:center; justify-content:center; color:#94a3b8;">
                        <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    </div>
                    <div>
                        <div style="font-weight:700; color:#1e293b; font-size:1rem;">Nenhuma empresa encontrada</div>
                        <div style="font-size:0.82rem; color:#64748b; margin-top:4px;">Tente ajustar o filtro ou a busca.</div>
                    </div>
                </div>`;
                container.style.opacity = '1';
                return;
            }

            container.style.gridTemplateColumns = '';

            // Group by owner
            const grouped = {};
            filtered.forEach(c => {
                const key = c.owner_name || 'Sem responsável';
                if (!grouped[key]) grouped[key] = { owner_email: c.owner_email, companies: [] };
                grouped[key].companies.push(c);
            });

            const ownerKeys = Object.keys(grouped).sort();
            const useGroups = ownerKeys.length > 1 && !searchTerm;

            function companyCard(c) {
                const initials = c.razao_social.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const isActive = selectedCompanyId == c.id;

                let statusColor = '#cbd5e1';
                let statusLabel = 'Pendente';
                let statusBg = '#f8fafc';
                if (c.is_locked) {
                    statusColor = 'var(--green)'; statusLabel = 'Entregue'; statusBg = 'rgba(34,197,94,0.07)';
                } else if (c.has_expenses) {
                    statusColor = '#8b5cf6'; statusLabel = 'Em Digitação'; statusBg = 'rgba(139,92,246,0.06)';
                }

                const lateCount = parseInt(c.late_expenses_count) || 0;
                const lateBadge = lateCount > 0 ? `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;background:rgba(245,158,11,0.12);border-radius:100px;font-size:0.6rem;font-weight:700;color:var(--amber);">+${lateCount} após envio</span>` : '';

                return `
                <div class="clickable-company" data-id="${c.id}" style="display:flex; flex-direction:column; gap:10px; padding:14px 16px; border-radius:16px; border:1.5px solid ${isActive ? 'var(--brand)' : 'var(--line)'}; background:${isActive ? 'rgba(99,102,241,0.04)' : 'white'}; cursor:pointer; transition:var(--ease); position:relative; overflow:hidden;">
                    ${isActive ? '<div style="position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--brand); border-radius:3px 0 0 3px;"></div>' : ''}
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:40px; height:40px; background:var(--bg); color:#475569; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem; flex-shrink:0; border:1px solid var(--line);">${initials}</div>
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:700; color:#1e293b; font-size:0.88rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.razao_social}</div>
                            <div style="font-size:0.7rem; color:#94a3b8; font-family:monospace;">${c.cnpj}</div>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:100px;font-size:0.68rem;font-weight:700;color:${statusColor};background:${statusBg};">
                            <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};"></span>${statusLabel}
                        </span>
                        ${lateBadge}
                    </div>
                </div>`;
            }

            if (useGroups) {
                // Render with group headers as col-span rows
                let html = '';
                ownerKeys.forEach(owner => {
                    const g = grouped[owner];
                    html += `<div style="grid-column:1/-1; display:flex; align-items:center; gap:10px; padding:4px 0; margin-top:4px;">
                        <div style="width:28px; height:28px; border-radius:8px; background:var(--brand-soft); color:var(--brand); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.75rem; flex-shrink:0;">${owner.charAt(0).toUpperCase()}</div>
                        <div>
                            <div style="font-weight:700; font-size:0.82rem; color:#1e293b;">${owner}</div>
                            ${g.owner_email ? `<div style="font-size:0.68rem; color:#94a3b8;">${g.owner_email}</div>` : ''}
                        </div>
                        <div style="flex:1; height:1px; background:var(--line);"></div>
                        <span style="font-size:0.68rem; font-weight:700; color:var(--ink-3);">${g.companies.length} CNPJ${g.companies.length > 1 ? 's' : ''}</span>
                    </div>`;
                    html += g.companies.map(companyCard).join('');
                });
                container.innerHTML = html;
            } else {
                container.innerHTML = filtered.map(companyCard).join('');
            }

            document.querySelectorAll('.clickable-company').forEach(el => {
                el.addEventListener('click', () => {
                    const companyData = companiesList.find(c => c.id === el.dataset.id);
                    if (companyData) openCompanyDetail(companyData);
                });
            });

            container.style.opacity = '1';
        }, 150);
    }
    
    // --- Tab switching in detail view ---
    function switchDetailTab(tabName) {
        document.querySelectorAll('.detail-tab-btn').forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.style.background = isActive ? 'white' : 'transparent';
            btn.style.color = isActive ? 'var(--brand)' : 'var(--ink-3)';
            btn.style.boxShadow = isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none';
        });
        document.getElementById('detail-tab-relatorios').style.display = tabName === 'relatorios' ? 'flex' : 'none';
        document.getElementById('detail-tab-conta').style.display = tabName === 'conta' ? 'flex' : 'none';
        if (tabName === 'conta') loadContaTab();
    }

    // --- Navigation Master/Detail ---
    function openCompanyDetail(company) {
        selectedCompanyId = company.id;

        document.getElementById('detail-company-name').textContent = company.razao_social;
        document.getElementById('detail-company-cnpj').textContent = company.cnpj;

        document.getElementById('dashboard-view').style.display = 'none';
        document.getElementById('company-detail-view').style.display = 'flex';

        // Reset to relatorios tab
        switchDetailTab('relatorios');

        document.querySelectorAll('.detail-tab-btn').forEach(btn => {
            btn.onclick = () => switchDetailTab(btn.dataset.tab);
        });

        generateMonthPills();
        loadReport();
        loadIndividualExpenses();

        // Export XLSX
        async function doExport(mode) {
            const month = document.getElementById('sel-month')?.value;
            const year = document.getElementById('sel-year')?.value;
            if (!month || !year) return showToast('Selecione um período', 'error');
            const btn = document.getElementById(mode === 'grouped' ? 'btn-export-grouped' : 'btn-export-detailed');
            const origHtml = btn.innerHTML;
            btn.disabled = true; btn.textContent = 'Exportando...';
            try {
                const token = localStorage.getItem('counter_token');
                const res = await fetch(`${API_URL}/counter/export?cnpj_id=${selectedCompanyId}&month=${month}&year=${year}&mode=${mode}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Erro ao exportar');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `relatorio_${month}_${year}.xlsx`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Exportado!', 'success');
            } catch (e) { showToast(e.message, 'error'); }
            btn.disabled = false; btn.innerHTML = origHtml;
        }
        document.getElementById('btn-export-detailed').onclick = () => doExport('detailed');
        document.getElementById('btn-export-grouped').onclick = () => doExport('grouped');
    }

    async function loadContaTab() {
        const container = document.getElementById('detail-tab-conta');
        container.innerHTML = `<div class="card" style="padding:24px;"><div class="skeleton" style="height:120px; border-radius:12px;"></div></div>`;
        try {
            const data = await api.get(`/counter/cnpj/${selectedCompanyId}`);

            container.innerHTML = `
                <!-- Responsável -->
                <div class="card" style="padding:20px; display:flex; flex-direction:column; gap:16px;">
                    <div style="font-size:0.72rem; font-weight:700; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.06em;">Responsável pela conta</div>
                    <div style="display:flex; align-items:center; gap:14px;">
                        <div style="width:48px; height:48px; border-radius:14px; background:var(--brand-soft); color:var(--brand); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem; flex-shrink:0;">
                            ${data.owner_name.charAt(0).toUpperCase()}
                        </div>
                        <div style="min-width:0;">
                            <div style="font-weight:700; color:#1e293b; font-size:0.95rem;">${data.owner_name}</div>
                            <div style="font-size:0.8rem; color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${data.owner_email}</div>
                        </div>
                    </div>
                </div>

                <!-- WhatsApp de notificação -->
                <div class="card" style="padding:20px; display:flex; flex-direction:column; gap:14px;">
                    <div>
                        <div style="font-size:0.72rem; font-weight:700; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px;">WhatsApp para notificações</div>
                        <p style="font-size:0.8rem; color:#64748b; margin:0; line-height:1.4;">Número que receberá lembretes e alertas para este CNPJ. Deixe em branco para usar o número padrão da conta.</p>
                    </div>

                    ${data.account_whatsapp ? `
                    <div style="display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--bg); border-radius:10px; border:1px dashed var(--line);">
                        <svg width="14" height="14" fill="none" stroke="var(--ink-3)" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2.77h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 18.92z"></path></svg>
                        <span style="font-size:0.78rem; color:var(--ink-3);">Padrão da conta: <strong style="color:var(--ink-2);">${data.account_whatsapp}</strong></span>
                    </div>` : ''}

                    <div style="display:flex; gap:8px; align-items:center;">
                        <input id="cnpj-wpp-counter" type="tel" class="form-input" placeholder="${data.account_whatsapp ? 'Usar padrão da conta' : '5511999999999'}" value="${data.cnpj_whatsapp || ''}" inputmode="numeric" style="flex:1;" />
                        <button id="btn-save-cnpj-wpp" class="btn btn-primary btn-sm" style="flex-shrink:0; white-space:nowrap;">Salvar</button>
                    </div>
                    ${data.cnpj_whatsapp ? `<button id="btn-clear-cnpj-wpp" class="btn btn-outline btn-sm" style="align-self:flex-start; font-size:0.78rem;">Usar padrão da conta</button>` : ''}
                </div>
            `;

            document.getElementById('btn-save-cnpj-wpp').addEventListener('click', async () => {
                const val = document.getElementById('cnpj-wpp-counter').value.trim() || null;
                try {
                    await api.put(`/counter/cnpj/${selectedCompanyId}/whatsapp`, { whatsapp_number: val });
                    showToast('WhatsApp atualizado!', 'success');
                    loadContaTab();
                } catch (e) { showToast(e.message, 'error'); }
            });

            document.getElementById('btn-clear-cnpj-wpp')?.addEventListener('click', async () => {
                try {
                    await api.put(`/counter/cnpj/${selectedCompanyId}/whatsapp`, { whatsapp_number: null });
                    showToast('Usando padrão da conta.', 'success');
                    loadContaTab();
                } catch (e) { showToast(e.message, 'error'); }
            });

        } catch (e) {
            container.innerHTML = `<div class="card" style="padding:24px; color:var(--red);">${e.message}</div>`;
        }
    }

    function generateMonthPills() {
        const container = document.getElementById('month-pills-row');
        if (!container) return;
        const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const now = new Date();
        const currentMonth = parseInt(document.getElementById('sel-month')?.value) || (now.getMonth() + 1);
        const currentYear = parseInt(document.getElementById('sel-year')?.value) || now.getFullYear();

        const pills = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const isActive = m === currentMonth && y === currentYear;
            pills.push(`
                <button class="cnpj-pill ${isActive ? 'active' : ''}" data-month="${m}" data-year="${y}" style="min-width:52px; text-align:center; padding:8px 10px;">
                    <div style="font-weight:700; font-size:0.82rem; line-height:1.2;">${MONTHS_SHORT[m-1]}</div>
                    ${y !== now.getFullYear() ? `<div style="font-size:0.6rem; opacity:0.65;">${y}</div>` : ''}
                </button>
            `);
        }
        container.innerHTML = pills.join('');

        container.querySelectorAll('[data-month]').forEach(pill => {
            pill.addEventListener('click', () => {
                container.querySelectorAll('.cnpj-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                document.getElementById('sel-month').value = pill.dataset.month;
                document.getElementById('sel-year').value = pill.dataset.year;
                loadReport();
                loadIndividualExpenses();
            });
        });
    }
    
    function closeCompanyDetail() {
        selectedCompanyId = null;
        
        const dashboard = document.getElementById('dashboard-view');
        const detailView = document.getElementById('company-detail-view');
        
        detailView.style.display = 'none';
        dashboard.style.display = 'flex';
        
        // Ensure main content is scrollable
        const main = document.getElementById('main-content');
        main.scrollTop = 0;
    }

    async function loadReport() {
        if (!selectedCompanyId) return;
        const month = document.getElementById('sel-month')?.value;
        const year = document.getElementById('sel-year')?.value;
        if (!month || !year) return;

        const totalEl = document.getElementById('report-total-display');
        const badgeEl = document.getElementById('report-status-badge');
        const catsEl = document.getElementById('report-categories-mini');
        if (!totalEl) return;

        totalEl.textContent = '...';
        if (badgeEl) badgeEl.innerHTML = '';
        if (catsEl) catsEl.style.display = 'none';

        try {
            const report = await api.get(`/reports/monthly?cnpj_id=${selectedCompanyId}&month=${month}&year=${year}`);

            if (!report.categories || report.categories.length === 0 || report.total_geral === 0) {
                totalEl.textContent = 'R$ 0,00';
                if (badgeEl) badgeEl.innerHTML = `<span style="font-size:0.72rem; font-weight:700; padding:4px 12px; border-radius:100px; background:var(--line); color:var(--ink-3);">Sem lançamentos</span>`;
                return;
            }

            totalEl.textContent = `R$ ${report.total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            if (badgeEl) badgeEl.innerHTML = `<span style="font-size:0.72rem; font-weight:700; padding:4px 12px; border-radius:100px; background:var(--green-soft); color:var(--green);">${report.categories.reduce((a,c) => a + parseInt(c.lancamentos), 0)} lançamentos</span>`;

            if (catsEl) {
                const topCats = [...report.categories].sort((a,b) => parseFloat(b.total) - parseFloat(a.total)).slice(0, 4);
                catsEl.style.display = 'block';
                catsEl.innerHTML = topCats.map(c => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(99,102,241,0.08); font-size:0.82rem;">
                        <span style="color:var(--ink-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60%;">${c.category_name}</span>
                        <span style="font-weight:700; color:var(--ink); flex-shrink:0;">R$ ${parseFloat(c.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                `).join('');
            }
        } catch (e) {
            if (totalEl) totalEl.textContent = 'Erro';
        }
    }

    async function loadIndividualExpenses() {
        if (!selectedCompanyId) return;
        const month = document.getElementById('sel-month').value;
        const year = document.getElementById('sel-year').value;
        const tbody = document.getElementById('expenses-list-tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="padding:40px; text-align:center;"><div class="skeleton" style="height:200px; border-radius:12px;"></div></td></tr>';

        try {
            const expenses = await api.get(`/counter/expenses?cnpj_id=${selectedCompanyId}&month=${month}&year=${year}`);
            
            if (expenses.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="padding:48px 24px; text-align:center; color:#64748b;">
                            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-bottom:12px; opacity:0.5;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <p style="margin:0;">Nenhum lançamento registrado neste mês.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = expenses.map(e => {
                const lateBadge = e.is_late ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--amber);margin-left:6px;" title="Adicionada após envio do relatório"></span>' : '';
                return `
                <tr style="border-bottom:1px solid var(--line); transition:var(--ease);${e.is_late ? 'background:rgba(245,158,11,0.04);' : ''}" onmouseover="this.style.background='rgba(241, 245, 249, 0.4)'" onmouseout="this.style.background='${e.is_late ? 'rgba(245,158,11,0.04)' : 'transparent'}'}">
                    <td style="padding:16px 24px; font-size:0.85rem; color:#64748b; white-space:nowrap;">
                        ${e.expense_date ? new Date(e.expense_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}${lateBadge}
                    </td>
                    <td style="padding:16px 24px;">
                        <div style="font-weight:600; color:#1e293b; font-size:0.9rem;">${e.description || '-'}</div>
                    </td>
                    <td style="padding:16px 24px;">
                        <div style="display:inline-flex; align-items:center; gap:6px; background:var(--bg); padding:4px 10px; border-radius:100px; font-size:0.75rem; font-weight:600; color:#475569;">
                            ${e.category_name}
                            ${e.is_filial ? '<span style="color:#8b5cf6; font-weight:800;">\u2022 Filial</span>' : ''}
                        </div>
                    </td>
                    <td style="padding:16px 24px; text-align:right; font-weight:700; color:#1e293b; font-size:0.95rem;">
                        R$ ${parseFloat(e.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style="padding:16px 24px; text-align:center;">
                        <div style="display:flex;gap:6px;justify-content:center;">
                            <button class="btn-icon btn-edit-exp" data-id="${e.id}" data-amount="${e.amount}" data-desc="${e.description || ''}" data-date="${e.expense_date}" title="Editar" style="padding:6px;border-radius:8px;border:1px solid var(--line);background:white;color:var(--brand);cursor:pointer;">
                                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="btn-icon btn-del-exp" data-id="${e.id}" title="Excluir" style="padding:6px;border-radius:8px;border:1px solid var(--line);background:white;color:var(--red);cursor:pointer;">
                                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `}).join('');

            // Edit expense handler
            document.querySelectorAll('.btn-edit-exp').forEach(btn => {
                btn.addEventListener('click', () => {
                    const overlay = document.createElement('div');
                    overlay.className = 'modal-overlay';
                    overlay.innerHTML = `
                        <div class="modal" style="max-width:400px;">
                            <div class="modal-handle"></div>
                            <div class="modal-title">Editar Despesa</div>
                            <div class="gap-16">
                                <div class="form-group"><label class="form-label">Valor</label><input id="edit-amount" type="number" step="0.01" class="form-input" value="${btn.dataset.amount}"/></div>
                                <div class="form-group"><label class="form-label">Descri\u00e7\u00e3o</label><input id="edit-desc" type="text" class="form-input" value="${btn.dataset.desc}"/></div>
                                <div class="form-group"><label class="form-label">Data</label><input id="edit-date" type="date" class="form-input" value="${btn.dataset.date}"/></div>
                                <button class="btn btn-primary" id="btn-save-edit">Salvar Altera\u00e7\u00f5es</button>
                                <button class="btn btn-outline" id="btn-cancel-edit">Cancelar</button>
                            </div>
                        </div>`;
                    document.body.appendChild(overlay);
                    requestAnimationFrame(() => overlay.classList.add('show'));
                    document.getElementById('btn-save-edit').addEventListener('click', async () => {
                        try {
                            await api.put(`/counter/expenses/${btn.dataset.id}`, {
                                amount: document.getElementById('edit-amount').value,
                                description: document.getElementById('edit-desc').value,
                                expense_date: document.getElementById('edit-date').value
                            });
                            showToast('Despesa atualizada!', 'success');
                            overlay.remove();
                            loadIndividualExpenses();
                            loadReport();
                        } catch (e) { showToast(e.message, 'error'); }
                    });
                    document.getElementById('btn-cancel-edit').addEventListener('click', () => overlay.remove());
                    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });
                });
            });

            // Delete expense handler
            document.querySelectorAll('.btn-del-exp').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Tem certeza que deseja excluir esta despesa? A altera\u00e7\u00e3o ser\u00e1 refletida no app do usu\u00e1rio.')) return;
                    try {
                        await api.delete(`/counter/expenses/${btn.dataset.id}`);
                        showToast('Despesa removida!', 'success');
                        loadIndividualExpenses();
                        loadReport();
                    } catch (e) { showToast(e.message, 'error'); }
                });
            });

        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="5" style="padding:24px; color:var(--red); text-align:center;">${e.message}</td></tr>`;
        }
    }

    async function showSettingsModal() {
        try {
            const settings = await api.get('/counter/settings');
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            // Custom CSS only for the modal elements
            const innerStyles = `
                <style>
                    .set-toggle { width:48px; height:24px; background:#cbd5e1; border-radius:34px; position:relative; cursor:pointer; transition:0.3s; }
                    .set-toggle::after { content:''; position:absolute; width:20px; height:20px; border-radius:50%; background:white; top:2px; left:2px; transition:0.3s; box-shadow:0 2px 4px rgba(0,0,0,0.1); }
                    .set-toggle.on { background:var(--brand); }
                    .set-toggle.on::after { transform:translateX(24px); }
                </style>
            `;
            overlay.innerHTML = `
                ${innerStyles}
                <div class="modal animate-up" style="max-width:440px; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--line); box-shadow:var(--shadow-3);">
                    
                    <div style="background:linear-gradient(135deg, var(--bg), var(--bg)); padding:24px 32px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; border-radius:12px; background:var(--brand-soft); color:var(--brand); display:flex; align-items:center; justify-content:center;">
                                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <div>
                                <h2 style="font-size:1.15rem; font-weight:800; color:#1e293b; margin:0;">Regras & Lembretes</h2>
                                <p style="font-size:0.75rem; color:#64748b; margin:0; margin-top:2px;">Controle das automações de cobrança</p>
                            </div>
                        </div>
                        <button id="btn-close-modal" style="background:var(--bg); width:32px; height:32px; border-radius:50%; border:1px solid var(--line); cursor:pointer; color:#64748b; display:flex; align-items:center; justify-content:center; transition:var(--ease);"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
                    </div>
                    
                    <div style="padding:32px;">
                        <div class="gap-24">
                            
                            <!-- Toggle Automação -->
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:16px; background:var(--bg); border-radius:16px; border:1px solid var(--line);">
                                <div>
                                    <div style="font-weight:700; color:#1e293b; font-size:0.95rem;">Automação de WhatsApp</div>
                                    <div style="font-size:0.75rem; color:#64748b; max-width:200px; line-height:1.4; margin-top:4px;">Ative para disparar cobranças automaticamente aos clientes pendentes.</div>
                                </div>
                                <div id="set-enabled" class="set-toggle ${settings.reminder_enabled ? 'on' : ''}" data-checked="${settings.reminder_enabled}"></div>
                            </div>

                            <!-- Grupo Horário -->
                            <div class="form-group" style="margin-top:24px;">
                                <label class="form-label" style="font-size:0.75rem; display:flex; align-items:center; gap:6px;">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    Horário de Disparo
                                </label>
                                <div style="display:flex; gap:12px; align-items:center;">
                                    <input id="set-hour" type="number" class="form-input" min="0" max="23" value="${settings.reminder_whatsapp_hour}" style="font-weight:700; font-size:1.1rem; text-align:center; padding:12px; border-radius:12px;">
                                    <span style="font-weight:800; color:var(--ink-3); font-size:1.2rem;">:</span>
                                    <input id="set-min" type="number" class="form-input" min="0" max="59" value="${settings.reminder_whatsapp_minute}" style="font-weight:700; font-size:1.1rem; text-align:center; padding:12px; border-radius:12px;">
                                </div>
                            </div>

                            <!-- Limite de Dia Útil -->
                            <div class="form-group" style="margin-top:24px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <label class="form-label" style="margin:0; font-size:0.75rem; display:flex; align-items:center; gap:6px;">
                                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                        Limite do Mês (Dias Úteis)
                                    </label>
                                </div>
                                <div style="display:flex; align-items:center; position:relative;">
                                    <input id="set-day-limit" type="number" class="form-input" min="1" max="10" value="${settings.reminder_max_business_day || 3}" style="padding-right:60px; font-weight:800; font-size:1.05rem; border-radius:12px;">
                                    <div style="position:absolute; right:16px; font-size:0.75rem; font-weight:700; color:var(--brand); background:var(--brand-soft); padding:4px 8px; border-radius:6px; pointer-events:none;">º Dia</div>
                                </div>
                                <p style="font-size:0.75rem; color:#64748b; line-height:1.4; margin-top:8px;">Após este dia limite, o sistema para de enviar avisos neste mês.</p>
                            </div>

                            <button class="btn btn-primary" id="btn-save-settings" style="margin-top:32px; border-radius:14px; padding:14px; width:100%; font-size:1rem; box-shadow:0 8px 16px var(--brand-glow);">
                                Salvar Preferências
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));

            const toggleEl = document.getElementById('set-enabled');
            toggleEl.addEventListener('click', () => {
                const isChecked = toggleEl.dataset.checked === 'true';
                toggleEl.dataset.checked = !isChecked;
                toggleEl.classList.toggle('on', !isChecked);
            });

            document.getElementById('btn-save-settings').addEventListener('click', async () => {
                const hour = parseInt(document.getElementById('set-hour').value);
                const min = parseInt(document.getElementById('set-min').value);
                const dayLimit = parseInt(document.getElementById('set-day-limit').value);
                const enabled = document.getElementById('set-enabled').dataset.checked === 'true';

                try {
                    await api.put('/counter/settings', {
                        reminder_whatsapp_hour: hour,
                        reminder_whatsapp_minute: min,
                        reminder_enabled: enabled,
                        reminder_max_business_day: dayLimit
                    });
                    showToast('Configurações atualizadas!', 'success');
                    overlay.remove();
                } catch (e) { showToast(e.message, 'error'); }
            });

            document.getElementById('btn-close-modal').addEventListener('click', () => overlay.remove());
        } catch (e) { showToast(e.message, 'error'); }
    }

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('counter_token');
        renderLogin();
    });

    document.getElementById('btn-settings').addEventListener('click', showSettingsModal);

    // Bottom nav
    document.getElementById('bn-dashboard')?.addEventListener('click', () => {
        document.getElementById('dashboard-view').style.display = 'flex';
        document.getElementById('company-detail-view').style.display = 'none';
        selectedCompanyId = null;
        document.querySelectorAll('#counter-bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
        document.getElementById('bn-dashboard').classList.add('active');
    });
    document.getElementById('bn-settings')?.addEventListener('click', showSettingsModal);
    document.getElementById('bn-logout')?.addEventListener('click', () => {
        localStorage.removeItem('counter_token');
        renderLogin();
    });
    
    document.getElementById('sel-month').addEventListener('change', () => { loadReport(); loadIndividualExpenses(); });
    document.getElementById('sel-year').addEventListener('change', () => { loadReport(); loadIndividualExpenses(); });
    
    document.getElementById('btn-back-dashboard').addEventListener('click', closeCompanyDetail);


    document.getElementById('company-search').addEventListener('input', () => {
        renderCompanies();
    });

    const selMonth = document.getElementById('sel-month');
    const selYear = document.getElementById('sel-year');

    monthNames.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i + 1;
        opt.textContent = m;
        opt.selected = (i + 1 === now.getMonth() + 1);
        selMonth.appendChild(opt);
    });

    for (let y = now.getFullYear(); y >= 2024; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        opt.selected = (y === now.getFullYear());
        selYear.appendChild(opt);
    }

    // Dashboard Period Selectors
    const dashSelMonth = document.getElementById('dash-sel-month');
    const dashSelYear = document.getElementById('dash-sel-year');

    monthNames.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = i + 1;
        opt.textContent = m;
        opt.selected = (i + 1 === dashboardMonth);
        dashSelMonth.appendChild(opt);
    });

    for (let y = now.getFullYear(); y >= 2024; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        opt.selected = (y === dashboardYear);
        dashSelYear.appendChild(opt);
    }

    dashSelMonth.addEventListener('change', () => { 
        dashboardMonth = dashSelMonth.value;
        loadSummary();
        loadCompanies();
    });
    dashSelYear.addEventListener('change', () => { 
        dashboardYear = dashSelYear.value;
        loadSummary();
        loadCompanies();
    });

    loadSummary();
    loadCompanies();

    // Interaction Handlers
    document.querySelectorAll('.clickable-card').forEach(card => {
        card.addEventListener('click', () => {
            if (currentFilter === card.dataset.filter) return; // ignore double click
            
            currentFilter = card.dataset.filter;
            
            // Highlight selected card and clear others
            document.querySelectorAll('.clickable-card').forEach(c => {
                c.classList.remove('active-card');
                c.style.borderColor = 'transparent';
                c.style.boxShadow = 'none';
            });
            
            card.classList.add('active-card');
            const themeColor = card.dataset.color || 'var(--brand)';
            card.style.borderColor = themeColor;
            card.style.boxShadow = `0 8px 25px -5px ${themeColor}20, 0 8px 10px -6px ${themeColor}10`;
            
            renderCompanies();
        });
    });

    // Sidebar Toggle Logic
    const btnToggle = document.getElementById('btn-toggle-sidebar');
    const shell = document.querySelector('.app-shell');
    
    if(btnToggle) {
        btnToggle.addEventListener('click', () => {
            isSidebarCollapsed = !isSidebarCollapsed;
            shell.classList.toggle('sidebar-collapsed', isSidebarCollapsed);
            btnToggle.style.transform = isSidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
            
            // Sidebar alignment fixes for collapsed state
            const sidebar = document.getElementById('sidebar-main');
            sidebar.style.width = isSidebarCollapsed ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)';
            sidebar.style.padding = isSidebarCollapsed ? '32px 10px' : '32px 24px';
        });
    }

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
}

render();
