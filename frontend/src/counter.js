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
            window.location.href = '/admin.html'; // Redirect to login in admin.html
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

// ---- Render ----
async function render() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin.html';
        return;
    }

    try {
        const me = await api.get('/auth/me');
        if (!me.office_id && !me.is_admin) {
            showToast('Acesso negado.', 'error');
            localStorage.removeItem('token');
            window.location.href = '/admin.html';
            return;
        }
        renderDashboard(me);
    } catch (e) {
        if (e.message) showToast(e.message, 'error');
        window.location.href = '/admin.html';
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
                <button class="nav-item-side" id="btn-logout" style="color:var(--danger);">
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
            <div id="dashboard-view" style="display:flex; flex-direction:column; gap:32px; transition:var(--transition);">
                <header style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h1 style="font-size:1.8rem; font-weight:800; color:#1e293b; margin-bottom:4px;">Olá, ${user.name.split(' ')[0]} 👋</h1>
                        <p style="color:#64748b;">Aqui está o resumo contábil do seu escritório.</p>
                    </div>
                    
                    <div id="dashboard-period-picker" style="display:flex; gap:12px; background:white; padding:12px 20px; border-radius:16px; box-shadow:var(--shadow-sm); border:1px solid var(--border); align-items:center;">
                        <span style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Período:</span>
                        <select id="dash-sel-month" class="form-input" style="width:auto; padding:4px 8px; border:none; background:transparent; font-weight:600; cursor:pointer;"></select>
                        <div style="width:1px; height:20px; background:var(--border);"></div>
                        <select id="dash-sel-year" class="form-input" style="width:auto; padding:4px 8px; border:none; background:transparent; font-weight:600; cursor:pointer;"></select>
                    </div>
                </header>

                <!-- Summary Cards Premium -->
            <div class="grid-stats" id="summary-container">
                <div class="summary-card-v2 animate-up glass clickable-card active-card" data-filter="all" data-color="var(--accent)" style="--delay:0ms; cursor:pointer; border-color: var(--accent);">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--accent-soft); color:var(--accent);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 21h18M3 7v14M21 7v14M12 3L2 7h20L12 3z"/></svg>
                        </div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Total de Empresas</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-total">-</div>
                    </div>
                </div>

                <div class="summary-card-v2 animate-up glass clickable-card" data-filter="delivered" data-color="var(--success)" style="--delay:100ms; cursor:pointer;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--success-soft); color:var(--success);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <div id="prog-delivered" style="font-size:0.75rem; font-weight:700; color:var(--success); background:var(--success-soft); padding:4px 10px; border-radius:100px;">0%</div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Entregues</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-delivered">-</div>
                    </div>
                </div>

                <div class="summary-card-v2 animate-up glass clickable-card" data-filter="in_progress" data-color="var(--accent-2)" style="--delay:200ms; cursor:pointer;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--accent-2-soft); color:var(--accent-2);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </div>
                        <div id="prog-in-progress" style="font-size:0.75rem; font-weight:700; color:var(--accent-2); background:var(--accent-2-soft); padding:4px 10px; border-radius:100px;">0%</div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Em Digitação</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-in-progress">-</div>
                    </div>
                </div>

                <div class="summary-card-v2 animate-up glass clickable-card" data-filter="pending" data-color="var(--danger)" style="--delay:300ms; cursor:pointer;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--danger-soft); color:var(--danger);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4M12 16h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z"/></svg>
                        </div>
                        <div id="prog-pending" style="font-size:0.75rem; font-weight:700; color:var(--danger); background:var(--danger-soft); padding:4px 10px; border-radius:100px;">0%</div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Pendente</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-pending">-</div>
                    </div>
                </div>
            </div>

            <!-- Content Grid Area -->
            <div class="grid-2" style="grid-template-columns: 380px 1fr; align-items: flex-start; gap:32px;">
                <!-- Company List Area -->
                <div class="card glass animate-up" style="--delay:300ms; padding:24px; display:flex; flex-direction:column; gap:20px;">
                    <div class="section-header" style="margin-bottom:0;">
                        <div>
                            <div class="section-title">Lista de Clientes</div>
                            <div class="text-xs text-muted" id="company-count">0 empresas</div>
                        </div>
                    </div>
                    <div class="search-box" style="position:relative;">
                        <input type="text" id="company-search" class="form-input" placeholder="Buscar empresa..." style="padding-left:40px; border-radius:12px; font-size:0.85rem;">
                        <svg width="18" height="18" fill="none" stroke="#64748b" stroke-width="2" viewBox="0 0 24 24" style="position:absolute; left:14px; top:50%; transform:translateY(-50%);"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    </div>
                    <div id="companies-container" class="gap-12" style="max-height:500px; overflow-y:auto; padding-right:8px; flex:1;">
                        <!-- Skeleton loader logic -->
                        <div class="skeleton" style="height:72px; border-radius:16px;"></div>
                        <div class="skeleton" style="height:72px; border-radius:16px;"></div>
                    </div>
                </div>

            </div>
            </div> <!-- Close dashboard-view -->
            
            <!-- VIEW: DETALHE COMPANHIA -->
            <div id="company-detail-view" style="display:none; flex-direction:column; gap:32px; transition:var(--transition);">
                <header style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:16px;">
                        <button id="btn-back-dashboard" style="width:40px; height:40px; border-radius:12px; border:1px solid var(--border); background:white; display:flex; align-items:center; justify-content:center; color:#64748b; cursor:pointer; transition:var(--transition);" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='white'">
                            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                        </button>
                        <div>
                            <h1 id="detail-company-name" style="font-size:1.6rem; font-weight:800; color:#1e293b; margin-bottom:0;">Carregando...</h1>
                            <p id="detail-company-cnpj" style="color:#64748b; font-size:0.85rem; margin:0;">--</p>
                        </div>
                    </div>
                    
                    <div id="report-period-picker" style="display:flex; gap:12px; background:white; padding:8px 16px; border-radius:100px; box-shadow:var(--shadow-sm); border:1px solid var(--border);">
                        <select id="sel-month" class="form-input" style="width:auto; padding:4px 8px; border:none; background:transparent; font-weight:600;"></select>
                        <div style="width:1px; height:20px; background:var(--border);"></div>
                        <select id="sel-year" class="form-input" style="width:auto; padding:4px 8px; border:none; background:transparent; font-weight:600;"></select>
                    </div>
                </header>

                <!-- Tabs Navigation -->
                <div style="display:flex; gap:8px; border-bottom:1px solid var(--border); padding-bottom:16px;">
                    <button class="detail-tab active" data-tab="summary" style="padding:10px 20px; font-weight:600; font-size:0.9rem; border-radius:10px; background:var(--accent-soft); color:var(--accent); border:none; cursor:pointer;">Análise Comparativa</button>
                    <button class="detail-tab" data-tab="list" style="padding:10px 20px; font-weight:600; font-size:0.9rem; border-radius:10px; background:transparent; color:#64748b; border:none; cursor:pointer; transition:var(--transition);">Transações Detalhadas</button>
                </div>

                <!-- Tab Content: Summary -->
                <div id="tab-summary-content" style="flex:1; display:flex; flex-direction:column;">
                    <div id="report-content-body" class="animate-up" style="flex:1;">
                        <div class="card glass" style="padding:48px; display:flex; flex-direction:column; align-items:center; gap:20px; border:2px dashed var(--border);">
                            <div class="skeleton" style="width:100%; height:400px; border-radius:24px;"></div>
                        </div>
                    </div>
                </div>

                <!-- Tab Content: List (Individual Expenses) -->
                <div id="tab-list-content" style="display:none;">
                    <div class="card glass" style="padding:0; overflow:hidden; border-radius:20px;">
                        <div style="padding:20px 24px; border-bottom:1px solid var(--border); background:var(--bg-secondary); display:flex; justify-content:space-between; align-items:center;">
                            <h3 style="font-size:0.95rem; font-weight:700; color:#1e293b; margin:0;">Extrato de Lançamentos</h3>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
                                <thead>
                                    <tr style="border-bottom:1px solid var(--border); background:rgba(241, 245, 249, 0.5);">
                                         <th style="padding:16px 24px; font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Data</th>
                                        <th style="padding:16px 24px; font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Descrição</th>
                                        <th style="padding:16px 24px; font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Categoria</th>
                                        <th style="padding:16px 24px; font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; text-align:right;">Valor (R$)</th>
                                        <th style="padding:16px 24px; font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; text-align:center;">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="expenses-list-tbody">
                                    <!-- Rendered dynamically -->
                                    <tr><td colspan="5" style="padding:40px; text-align:center;"><div class="skeleton" style="height:200px; border-radius:12px;"></div></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </main>
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
        
        // Filter by summary card selection
        if (currentFilter === 'delivered') filtered = companiesList.filter(c => c.is_locked);
        if (currentFilter === 'in_progress') filtered = companiesList.filter(c => c.has_expenses && !c.is_locked);
        if (currentFilter === 'pending') filtered = companiesList.filter(c => !c.has_expenses);

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.razao_social.toLowerCase().includes(searchTerm) || 
                c.cnpj.includes(searchTerm)
            );
        }

        document.getElementById('company-count').textContent = `${filtered.length} empresas`;
        
        container.style.transition = 'opacity 0.2s ease';
        container.style.opacity = '0';
        
        setTimeout(() => {
            if (filtered.length === 0) {
                container.innerHTML = `
                <div class="empty-state animate-fade" style="padding:40px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px;">
                    <div style="width:64px; height:64px; border-radius:50%; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; color:#94a3b8;">
                        <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    </div>
                    <div>
                        <div style="font-weight:700; color:#1e293b; font-size:1.1rem;">Nenhuma empresa</div>
                        <div style="font-size:0.85rem; color:#64748b; max-width:250px; margin:0 auto; margin-top:4px;">Não encontramos resultados para os filtros selecionados atuais.</div>
                    </div>
                </div>`;
                container.style.opacity = '1';
                return;
            }
            
        
        container.innerHTML = filtered.map(c => {
            const initials = c.razao_social.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const isActive = selectedCompanyId == c.id;
            
            let statusColor = '#e2e8f0';
            let statusLabel = 'Não Iniciado';
            if (c.is_locked) {
                statusColor = 'var(--success)';
                statusLabel = 'Entregue';
            } else if (c.has_expenses) {
                statusColor = 'var(--accent-2)';
                statusLabel = 'Em Digitação';
            }

            const lateCount = parseInt(c.late_expenses_count) || 0;
            const lateBadge = lateCount > 0 ? `
                <div style="display:flex;align-items:center;gap:4px;padding:2px 8px;background:rgba(245,158,11,0.12);border-radius:100px;margin-top:4px;">
                    <svg width="12" height="12" fill="none" stroke="var(--warning)" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span style="font-size:0.6rem;font-weight:700;color:var(--warning);">${lateCount} após envio</span>
                </div>` : '';

            return `
            <div class="expense-item clickable-company" data-id="${c.id}" style="display:flex; align-items:center; gap:16px; padding:16px; border-radius:16px; border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}; background:${isActive ? 'rgba(79, 156, 249, 0.05)' : 'white'}; cursor:pointer; transition:var(--transition); position:relative; overflow:hidden;">
                ${isActive ? '<div style="position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--accent);"></div>' : ''}
                <div style="width:44px; height:44px; background:#f1f5f9; color:#475569; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.9rem; flex-shrink:0;">${initials}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:700; color:#1e293b; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.razao_social}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${c.cnpj}</div>
                    ${lateBadge}
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                    <div style="width:8px; height:8px; border-radius:50%; background:${statusColor};" class="status-indicator"></div>
                    <span style="font-size:0.6rem; font-weight:700; color:${statusColor}; text-transform:uppercase;">${statusLabel}</span>
                </div>
            </div>
            `;
        }).join('');

        document.querySelectorAll('.clickable-company').forEach(el => {
                el.addEventListener('click', () => {
                    const companyData = companiesList.find(c => c.id === el.dataset.id);
                    openCompanyDetail(companyData);
                });
            });
            
            container.style.opacity = '1';
        }, 200);
    }
    
    // --- Navigation Master/Detail ---
    function openCompanyDetail(company) {
        selectedCompanyId = company.id;
        
        // Update Headers
        document.getElementById('detail-company-name').textContent = company.razao_social;
        document.getElementById('detail-company-cnpj').textContent = company.cnpj;
        
        // Hide dashboard, Show detail view
        const dashboard = document.getElementById('dashboard-view');
        const detailView = document.getElementById('company-detail-view');
        
        dashboard.style.display = 'none';
        detailView.style.display = 'flex';
        
        loadReport();
        loadIndividualExpenses();
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
        const month = document.getElementById('sel-month').value;
        const year = document.getElementById('sel-year').value;
        const container = document.getElementById('report-content-body');
        if(!container) return; // Prevent errors if DOM not ready
        
        container.innerHTML = '<div class="card glass animate-fade" style="padding:48px;"><div class="skeleton" style="height:400px; border-radius:24px;"></div></div>';

        try {
            const report = await api.get(`/reports/monthly?cnpj_id=${selectedCompanyId}&month=${month}&year=${year}`);
            
            if (report.categories.length === 0) {
                container.innerHTML = `
                    <div class="card glass animate-fade" style="padding:48px; text-align:center;">
                        <p class="text-muted">Sem movimentações para este período.</p>
                    </div>
                `;
                return;
            }

            let topCategory = { name: '-', total: 0 };
            if (report.categories.length > 0) {
                const sorted = [...report.categories].sort((a,b) => parseFloat(b.total) - parseFloat(a.total));
                topCategory = { name: sorted[0].category_name, total: parseFloat(sorted[0].total) };
            }

            container.innerHTML = `
                <div class="card glass animate-fade" style="padding:0; border-radius:24px; overflow:hidden;">
                    <!-- Report Header -->
                    <div style="background:linear-gradient(135deg, var(--bg-primary), var(--bg-secondary)); padding:32px 32px 24px; border-bottom:1px solid var(--border);">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <div style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                                    <svg width="14" height="14" fill="none" stroke="var(--accent)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 15v4a2 2 0 0 0 2 2h14v-4"/><path d="M3 15h18v-4H3v4z"/></svg>
                                    Total Despesas (${monthNames[document.getElementById('sel-month').value - 1]})
                                </div>
                                <div style="font-size:2rem; font-weight:800; color:#1e293b; letter-spacing:-0.5px;">R$ ${report.total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <button class="btn btn-outline" id="btn-download-pdf" style="width:auto; border-radius:12px; padding:10px 16px; font-size:0.85rem; border-color:var(--border); color:var(--text-secondary); background:white;">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Exportar
                            </button>
                        </div>
                        
                        <div style="margin-top:24px; display:flex; gap:16px;">
                            <div style="background:white; padding:12px 16px; border-radius:12px; border:1px solid var(--border); flex:1;">
                                <div style="font-size:0.7rem; color:#64748b; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Maior Despesa</div>
                                <div style="font-size:0.95rem; font-weight:700; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${topCategory.name}">${topCategory.name}</div>
                                <div style="font-size:0.85rem; color:var(--danger); font-weight:600; margin-top:2px;">R$ ${topCategory.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div style="background:white; padding:12px 16px; border-radius:12px; border:1px solid var(--border); width:140px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                                <div style="font-size:0.7rem; color:#64748b; font-weight:600; text-transform:uppercase; margin-bottom:4px;">Lançamentos</div>
                                <div style="font-size:1.4rem; font-weight:800; color:var(--accent);">${report.categories.reduce((acc, c) => acc + parseInt(c.lancamentos), 0)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Report List -->
                    <div style="background:white; padding:0;">
                         <div style="padding:24px 32px 16px; border-bottom:1px solid var(--border);">
                            <h3 style="font-size:0.85rem; font-weight:700; color:#64748b; text-transform:uppercase; margin:0;">Detalhamento por Categoria</h3>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
                                <thead>
                                    <tr style="border-bottom:1px solid var(--border); background:rgba(241, 245, 249, 0.5);">
                                        <th style="padding:16px 32px; font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Categoria</th>
                                        <th style="padding:16px 32px; font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; text-align:center;">Lançamentos</th>
                                        <th style="padding:16px 32px; font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase; text-align:right;">Valor (R$)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${report.categories.map(c => `
                                        <tr style="border-bottom:1px solid var(--border); transition:var(--transition);" onmouseover="this.style.background='rgba(241, 245, 249, 0.4)'" onmouseout="this.style.background='transparent'">
                                            <td style="padding:20px 32px;">
                                                <div style="display:flex; align-items:center; gap:12px;">
                                                    <div style="width:36px; height:36px; border-radius:10px; background:var(--bg-secondary); display:flex; align-items:center; justify-content:center; color:#64748b;">
                                                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                                                    </div>
                                                    <div>
                                                        <div style="display:flex; align-items:center; gap:8px;">
                                                            <span style="font-weight:700; color:#1e293b; font-size:0.9rem;">${c.category_name}</span>
                                                            ${c.is_filial ? '<span style="font-size:0.6rem; font-weight:700; background:var(--accent-2-soft); color:var(--accent-2); padding:2px 8px; border-radius:100px; text-transform:uppercase;">Filial</span>' : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style="padding:20px 32px; text-align:center;">
                                                <div style="font-size:0.9rem; font-weight:600; color:#475569;">${c.lancamentos} item(s)</div>
                                            </td>
                                            <td style="padding:20px 32px; text-align:right;">
                                                <div style="font-size:1rem; font-weight:800; color:#1e293b;">R$ ${parseFloat(c.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('btn-download-pdf').addEventListener('click', () => {
                showToast('Preparando download do PDF...', 'info');
            });

        } catch (e) { 
            container.innerHTML = `<div class="card glass" style="padding:32px; color:var(--danger);">${e.message}</div>`;
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
                const lateBadge = e.is_late ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--warning);margin-left:6px;" title="Adicionada após envio do relatório"></span>' : '';
                return `
                <tr style="border-bottom:1px solid var(--border); transition:var(--transition);${e.is_late ? 'background:rgba(245,158,11,0.04);' : ''}" onmouseover="this.style.background='rgba(241, 245, 249, 0.4)'" onmouseout="this.style.background='${e.is_late ? 'rgba(245,158,11,0.04)' : 'transparent'}'}">
                    <td style="padding:16px 24px; font-size:0.85rem; color:#64748b; white-space:nowrap;">
                        ${e.expense_date ? new Date(e.expense_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}${lateBadge}
                    </td>
                    <td style="padding:16px 24px;">
                        <div style="font-weight:600; color:#1e293b; font-size:0.9rem;">${e.description || '-'}</div>
                    </td>
                    <td style="padding:16px 24px;">
                        <div style="display:inline-flex; align-items:center; gap:6px; background:var(--bg-secondary); padding:4px 10px; border-radius:100px; font-size:0.75rem; font-weight:600; color:#475569;">
                            ${e.category_name}
                            ${e.is_filial ? '<span style="color:var(--accent-2); font-weight:800;">\u2022 Filial</span>' : ''}
                        </div>
                    </td>
                    <td style="padding:16px 24px; text-align:right; font-weight:700; color:#1e293b; font-size:0.95rem;">
                        R$ ${parseFloat(e.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style="padding:16px 24px; text-align:center;">
                        <div style="display:flex;gap:6px;justify-content:center;">
                            <button class="btn-icon btn-edit-exp" data-id="${e.id}" data-amount="${e.amount}" data-desc="${e.description || ''}" data-date="${e.expense_date}" title="Editar" style="padding:6px;border-radius:8px;border:1px solid var(--border);background:white;color:var(--accent);cursor:pointer;">
                                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="btn-icon btn-del-exp" data-id="${e.id}" title="Excluir" style="padding:6px;border-radius:8px;border:1px solid var(--border);background:white;color:var(--danger);cursor:pointer;">
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
            tbody.innerHTML = `<tr><td colspan="5" style="padding:24px; color:var(--danger); text-align:center;">${e.message}</td></tr>`;
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
                    .set-toggle.on { background:var(--accent); }
                    .set-toggle.on::after { transform:translateX(24px); }
                </style>
            `;
            overlay.innerHTML = `
                ${innerStyles}
                <div class="modal animate-up" style="max-width:440px; border-radius:24px; padding:0; overflow:hidden; border:1px solid var(--border); box-shadow:var(--shadow-lg);">
                    
                    <div style="background:linear-gradient(135deg, var(--bg-primary), var(--bg-secondary)); padding:24px 32px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; border-radius:12px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; justify-content:center;">
                                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <div>
                                <h2 style="font-size:1.15rem; font-weight:800; color:#1e293b; margin:0;">Regras & Lembretes</h2>
                                <p style="font-size:0.75rem; color:#64748b; margin:0; margin-top:2px;">Controle das automações de cobrança</p>
                            </div>
                        </div>
                        <button id="btn-close-modal" style="background:var(--bg-secondary); width:32px; height:32px; border-radius:50%; border:1px solid var(--border); cursor:pointer; color:#64748b; display:flex; align-items:center; justify-content:center; transition:var(--transition);"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
                    </div>
                    
                    <div style="padding:32px;">
                        <div class="gap-24">
                            
                            <!-- Toggle Automação -->
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:16px; background:var(--bg-secondary); border-radius:16px; border:1px solid var(--border);">
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
                                    <span style="font-weight:800; color:var(--text-muted); font-size:1.2rem;">:</span>
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
                                    <div style="position:absolute; right:16px; font-size:0.75rem; font-weight:700; color:var(--accent); background:var(--accent-soft); padding:4px 8px; border-radius:6px; pointer-events:none;">º Dia</div>
                                </div>
                                <p style="font-size:0.75rem; color:#64748b; line-height:1.4; margin-top:8px;">Após este dia limite, o sistema para de enviar avisos neste mês.</p>
                            </div>

                            <button class="btn btn-primary" id="btn-save-settings" style="margin-top:32px; border-radius:14px; padding:14px; width:100%; font-size:1rem; box-shadow:0 8px 16px var(--accent-glow);">
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
        localStorage.removeItem('token');
        window.location.href = '/admin.html';
    });

    document.getElementById('btn-settings').addEventListener('click', showSettingsModal);
    
    document.getElementById('sel-month').addEventListener('change', () => { loadReport(); loadIndividualExpenses(); });
    document.getElementById('sel-year').addEventListener('change', () => { loadReport(); loadIndividualExpenses(); });
    
    document.getElementById('btn-back-dashboard').addEventListener('click', closeCompanyDetail);

    // Tab Logic
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.detail-tab').forEach(t => {
                t.classList.remove('active');
                t.style.background = 'transparent';
                t.style.color = '#64748b';
            });
            const target = e.target;
            target.classList.add('active');
            target.style.background = 'var(--accent-soft)';
            target.style.color = 'var(--accent)';
            
            const tabId = target.dataset.tab;
            if (tabId === 'summary') {
                document.getElementById('tab-summary-content').style.display = 'block';
                document.getElementById('tab-list-content').style.display = 'none';
            } else {
                document.getElementById('tab-summary-content').style.display = 'none';
                document.getElementById('tab-list-content').style.display = 'block';
            }
        });
    });

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
            const themeColor = card.dataset.color || 'var(--accent)';
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
