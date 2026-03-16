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
    put: (path, body) => api.request('PUT', path, body)
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
    document.getElementById('app').innerHTML = `
    <div class="app-shell" style="max-width: 100%; margin: 0; display: grid; grid-template-columns: 280px 1fr; height: 100vh; overflow: hidden; background: #f8fafc;">
        <!-- Sidebar Premium -->
        <aside style="background: #0f172a; color: white; padding: 32px 24px; display: flex; flex-direction: column; gap: 32px;">
            <div class="logo" style="display:flex; align-items:center; gap:12px;">
                <div style="width:40px; height:40px; background:var(--accent); border-radius:12px; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 20px var(--accent-glow);">
                    <svg width="24" height="24" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                </div>
                <div>
                    <div style="font-weight:800; font-size:1.1rem; line-height:1;">Despesa Fácil</div>
                    <div style="font-size:0.7rem; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:1px; margin-top:4px;">Contador</div>
                </div>
            </div>

            <nav style="display:flex; flex-direction:column; gap:8px; flex:1;">
                <button class="nav-item active" style="background:rgba(255,255,255,0.1); border:none; color:white; padding:12px 16px; border-radius:12px; display:flex; align-items:center; gap:12px; width:100%; cursor:pointer;">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                    Dashboard
                </button>
            </nav>

            <div style="margin-top:auto; padding-top:20px; border-top:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                    <div style="width:36px; height:36px; background:var(--accent-2); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700;">${user.name.charAt(0)}</div>
                    <div style="min-width:0;">
                        <div style="font-weight:600; font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${user.name}</div>
                        <div style="font-size:0.7rem; color:rgba(255,255,255,0.5);">Escritório Ativo</div>
                    </div>
                </div>
                <button class="btn btn-outline btn-sm" id="btn-settings" style="width:100%; justify-content:flex-start; border-color:rgba(255,255,255,0.2); color:white;">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
                    Ajustes de Lembrete
                </button>
                <button class="btn btn-sm" id="btn-logout" style="width:100%; margin-top:8px; background:rgba(239,68,68,0.1); color:#f87171; border:none; justify-content:flex-start;">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Sair do Painel
                </button>
            </div>
        </aside>

        <!-- Main Content -->
        <main style="overflow-y:auto; padding:40px; display:flex; flex-direction:column; gap:32px;">
            <header style="display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <h1 style="font-size:1.8rem; font-weight:800; color:#1e293b; margin-bottom:4px;">Olá, ${user.name.split(' ')[0]} 👋</h1>
                    <p style="color:#64748b;">Aqui está o resumo contábil do seu escritório hoje.</p>
                </div>
                <div id="report-period-picker" style="display:none; gap:12px; background:white; padding:8px 16px; border-radius:100px; box-shadow:var(--shadow-sm); border:1px solid var(--border);">
                    <select id="sel-month" class="form-input" style="width:auto; padding:4px 8px; border:none; background:transparent; font-weight:600;"></select>
                    <div style="width:1px; height:20px; background:var(--border);"></div>
                    <select id="sel-year" class="form-input" style="width:auto; padding:4px 8px; border:none; background:transparent; font-weight:600;"></select>
                </div>
            </header>

            <!-- Summary Cards Premium -->
            <div class="grid-3" id="summary-container">
                <div class="summary-card-v2 animate-up glass" style="--delay:0ms;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--accent-soft); color:var(--accent);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 21h18M3 7v14M21 7v14M12 3L2 7h20L12 3z"/></svg>
                        </div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Empresas sob Gestão</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-total">-</div>
                    </div>
                </div>

                <div class="summary-card-v2 animate-up glass" style="--delay:100ms;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--success-soft); color:var(--success);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <div id="prog-completed" style="font-size:0.75rem; font-weight:700; color:var(--success); background:var(--success-soft); padding:4px 10px; border-radius:100px;">0%</div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Contabilidade Concluída</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-completed">-</div>
                    </div>
                </div>

                <div class="summary-card-v2 animate-up glass" style="--delay:200ms;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div class="summary-icon-box" style="background:var(--danger-soft); color:var(--danger);">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4M12 16h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z"/></svg>
                        </div>
                        <div id="prog-pending" style="font-size:0.75rem; font-weight:700; color:var(--danger); background:var(--danger-soft); padding:4px 10px; border-radius:100px;">0%</div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; color:#64748b; font-weight:600;">Pendências de Envio</div>
                        <div style="font-size:1.8rem; font-weight:800; color:#1e293b;" id="summ-pending">-</div>
                    </div>
                </div>
            </div>

            <!-- Content Grid Area -->
            <div class="grid-2" style="grid-template-columns: 380px 1fr; align-items: flex-start; gap:32px;">
                <!-- Company List Area -->
                <div class="card glass animate-up" style="--delay:300ms; padding:24px;">
                    <div class="section-header" style="margin-bottom:24px;">
                        <div class="section-title">Lista de Clientes</div>
                        <div class="text-xs text-muted" id="company-count">0 empresas</div>
                    </div>
                    <div id="companies-container" class="gap-12" style="max-height:500px; overflow-y:auto; padding-right:8px;">
                        <!-- Skeleton loader logic -->
                        <div class="skeleton" style="height:72px; border-radius:16px;"></div>
                        <div class="skeleton" style="height:72px; border-radius:16px;"></div>
                    </div>
                </div>

                <!-- Report Detail Area -->
                <div id="report-container" class="animate-up" style="--delay:400ms;">
                    <div class="card glass" style="padding:48px; display:flex; flex-direction:column; align-items:center; gap:20px; border:2px dashed var(--border);">
                        <div style="width:80px; height:80px; background:var(--bg-secondary); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
                            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 17h6M9 13h6M9 9h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>
                        </div>
                        <div style="text-align:center;">
                            <h3 style="font-weight:700; color:#1e293b; margin-bottom:4px;">Relatório Consolidado</h3>
                            <p style="color:#64748b; font-size:0.9rem;">Selecione um cliente ao lado para visualizar os detalhes financeiros.</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
    `;

    async function loadSummary() {
        try {
            const summ = await api.get('/counter/dashboard-summary');
            document.getElementById('summ-total').textContent = summ.total;
            document.getElementById('summ-completed').textContent = summ.completed;
            document.getElementById('summ-pending').textContent = summ.pending;
            
            const pctComp = Math.round((summ.completed / summ.total) * 100) || 0;
            const pctPend = Math.round((summ.pending / summ.total) * 100) || 0;
            
            document.getElementById('prog-completed').textContent = `${pctComp}%`;
            document.getElementById('prog-pending').textContent = `${pctPend}%`;
        } catch (e) { console.error('Erro ao carregar resumo:', e); }
    }

    async function loadCompanies() {
        try {
            const companies = await api.get('/counter/companies');
            const container = document.getElementById('companies-container');
            document.getElementById('company-count').textContent = `${companies.length} empresas`;
            
            if (companies.length === 0) {
                container.innerHTML = '<div class="empty-state">Sua carteira está vazia.</div>';
                return;
            }
            
            container.innerHTML = companies.map(c => {
                const initials = c.razao_social.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return `
                <div class="expense-item clickable-company" data-id="${c.id}" style="display:flex; align-items:center; gap:16px; padding:16px; border-radius:16px; border:1px solid var(--border); background:white; cursor:pointer; transition:var(--transition);">
                    <div style="width:44px; height:44px; background:#f1f5f9; color:#475569; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.9rem; flex-shrink:0;">${initials}</div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:700; color:#1e293b; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.razao_social}</div>
                        <div style="font-size:0.75rem; color:#64748b;">${c.cnpj}</div>
                    </div>
                    <div style="width:8px; height:8px; border-radius:50%; background:#e2e8f0;" class="status-indicator"></div>
                </div>
                `;
            }).join('');

            document.querySelectorAll('.clickable-company').forEach(el => {
                el.addEventListener('click', () => {
                    document.querySelectorAll('.clickable-company').forEach(i => {
                        i.style.borderColor = 'var(--border)';
                        i.style.background = 'white';
                        i.querySelector('.status-indicator').style.background = '#e2e8f0';
                    });
                    el.style.borderColor = 'var(--accent)';
                    el.style.background = 'rgba(79, 156, 249, 0.05)';
                    el.querySelector('.status-indicator').style.background = 'var(--accent)';
                    selectedCompanyId = el.dataset.id;
                    document.getElementById('report-period-picker').style.display = 'flex';
                    loadReport();
                });
            });
        } catch (e) { showToast(e.message, 'error'); }
    }

    async function loadReport() {
        if (!selectedCompanyId) return;
        const month = document.getElementById('sel-month').value;
        const year = document.getElementById('sel-year').value;
        const container = document.getElementById('report-container');
        container.innerHTML = '<div class="skeleton" style="height:400px; border-radius:24px;"></div>';

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

            container.innerHTML = `
                <div class="card glass animate-fade" style="padding:32px; border-radius:24px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px;">
                        <div>
                            <div style="font-size:0.85rem; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Fechamento Mensal</div>
                            <div style="font-size:1.8rem; font-weight:800; color:#1e293b;">R$ ${report.total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <button class="btn btn-primary" id="btn-download-pdf" style="width:auto; border-radius:12px; padding:10px 20px;">
                            <svg width="18" height="18" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Exportar PDF
                        </button>
                    </div>

                    <div style="background:#f8fafc; border-radius:20px; border:1px solid var(--border); overflow:hidden;">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="background:rgba(0,0,0,0.02);">
                                    <th style="padding:16px 24px; text-align:left; font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Categoria</th>
                                    <th style="padding:16px 24px; text-align:center; font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Qtd</th>
                                    <th style="padding:16px 24px; text-align:right; font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">Valor Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.categories.map(c => `
                                    <tr style="border-bottom:1px solid rgba(0,0,0,0.04);">
                                        <td style="padding:16px 24px; font-weight:600; color:#334155;">
                                            <div style="display:flex; align-items:center; gap:8px;">
                                                <div style="width:8px; height:8px; border-radius:50%; background:var(--accent);"></div>
                                                ${c.category_name}
                                            </div>
                                        </td>
                                        <td style="padding:16px 24px; text-align:center; color:#64748b; font-weight:500;">${c.lancamentos}</td>
                                        <td style="padding:16px 24px; text-align:right; font-weight:700; color:#1e293b;">R$ ${parseFloat(c.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
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

    async function showSettingsModal() {
        try {
            const settings = await api.get('/counter/settings');
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal animate-up" style="max-width:500px; border-radius:28px; padding:32px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px;">
                        <h2 style="font-size:1.4rem; font-weight:800; color:#1e293b;">Configurações</h2>
                        <button id="btn-close-modal" style="background:none; border:none; cursor:pointer; color:#64748b;"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"></path></svg></button>
                    </div>
                    
                    <div class="gap-24">
                        <div class="form-group">
                            <label class="form-label" style="font-size:0.75rem;">Horário do Lembrete Diário</label>
                            <div style="display:flex; gap:12px; align-items:center;">
                                <input id="set-hour" type="number" class="form-input" min="0" max="23" value="${settings.reminder_whatsapp_hour}" style="font-weight:700; font-size:1.1rem; text-align:center;">
                                <span style="font-weight:700; color:var(--text-muted);">:</span>
                                <input id="set-min" type="number" class="form-input" min="0" max="59" value="${settings.reminder_whatsapp_minute}" style="font-weight:700; font-size:1.1rem; text-align:center;">
                            </div>
                        </div>

                        <div class="form-group" style="background:#f1f5f9; padding:20px; border-radius:20px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <label class="form-label" style="margin:0; font-size:0.75rem;">Limite de Envio (Dia Útil)</label>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <input id="set-day-limit" type="number" class="form-input" min="1" max="10" value="${settings.reminder_max_business_day || 3}" style="width:70px; text-align:center; font-weight:800; border-color:var(--accent);">
                                    <span style="font-weight:700; color:var(--accent);">º Dia</span>
                                </div>
                            </div>
                            <p style="font-size:0.75rem; color:#64748b; line-height:1.4;">Os lembretes via WhatsApp para seus clientes serão disparados somente até este dia útil de cada mês.</p>
                        </div>

                        <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0;">
                            <div>
                                <div style="font-weight:700; color:#1e293b; font-size:0.95rem;">Automação Ativa</div>
                                <div style="font-size:0.75rem; color:#64748b;">Disparar lembretes automaticamente</div>
                            </div>
                            <label class="switch" style="position:relative; display:inline-block; width:48px; height:24px;">
                                <input id="set-enabled" type="checkbox" ${settings.reminder_enabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#e2e8f0; transition:.4s; border-radius:34px;"></span>
                            </label>
                        </div>

                        <button class="btn btn-primary" id="btn-save-settings" style="margin-top:12px; border-radius:16px; padding:16px;">Aplicar Alterações</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => {
                overlay.classList.add('show');
                const sw = overlay.querySelector('input#set-enabled + span');
                if (settings.reminder_enabled) sw.style.backgroundColor = 'var(--accent)';
            });

            document.getElementById('set-enabled').addEventListener('change', (e) => {
                overlay.querySelector('input#set-enabled + span').style.backgroundColor = e.target.checked ? 'var(--accent)' : '#e2e8f0';
            });

            document.getElementById('btn-save-settings').addEventListener('click', async () => {
                const hour = parseInt(document.getElementById('set-hour').value);
                const min = parseInt(document.getElementById('set-min').value);
                const dayLimit = parseInt(document.getElementById('set-day-limit').value);
                const enabled = document.getElementById('set-enabled').checked;

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
    
    document.getElementById('sel-month').addEventListener('change', loadReport);
    document.getElementById('sel-year').addEventListener('change', loadReport);

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const now = new Date();
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

    loadSummary();
    loadCompanies();
}

render();
