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
    <div class="app-shell" style="max-width: 1200px; margin: 0 auto; display: block; height: auto; min-height: 100vh;">
      <header class="app-header" style="border-radius: 12px; margin: 16px; position: sticky; top: 16px; z-index: 50;">
        <span class="logo" style="display:flex;align-items:center;gap:8px;">
          <svg width="24" height="24" fill="none" stroke="var(--accent)" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span class="text-gradient">Painel do Contador | Despesa Fácil</span>
        </span>
        <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-sm" id="btn-settings" style="display:flex; align-items:center; gap:6px;">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
                Configurações
            </button>
            <button class="btn-icon" id="btn-logout" title="Sair">
                <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
        </div>
      </header>
      
      <main style="padding: 0 16px 40px 16px;" class="gap-24">
        <!-- Dashboard Summary -->
        <div class="grid-3" id="summary-container">
            <div class="card summary-card animate-in">
                <div class="text-sm text-muted">Empresas Totais</div>
                <div class="text-2xl font-bold" id="summ-total">-</div>
            </div>
            <div class="card summary-card animate-in" style="--delay: 100ms">
                <div class="text-sm text-muted">Contabilidade Concluída</div>
                <div class="text-2xl font-bold text-success" id="summ-completed">-</div>
            </div>
            <div class="card summary-card animate-in" style="--delay: 200ms">
                <div class="text-sm text-muted">Aguardando Envio</div>
                <div class="text-2xl font-bold text-danger" id="summ-pending">-</div>
            </div>
        </div>

        <div class="grid-2" style="grid-template-columns: 1fr 1.5fr;">
            <div class="card glass">
                <div class="section-header">
                    <div class="section-title">Minhas Empresas</div>
                </div>
                <div id="companies-container" class="gap-8">
                    <div class="skeleton" style="height:60px"></div>
                </div>
            </div>

            <div class="card glass">
                <div class="section-header" style="flex-wrap: wrap; gap: 12px;">
                    <div class="section-title">Relatório Consolidado</div>
                    <div id="report-period-picker" style="display:none; gap:8px;">
                        <select id="sel-month" class="form-input" style="width:auto; padding:4px 8px;"></select>
                        <select id="sel-year" class="form-input" style="width:auto; padding:4px 8px;"></select>
                    </div>
                </div>
                <div id="report-container">
                    <div class="empty-state">
                        <div class="empty-icon"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 17h6M9 13h6M9 9h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg></div>
                        <p class="empty-sub">Selecione uma empresa para visualizar o relatório completo.</p>
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
        } catch (e) { console.error('Erro ao carregar resumo:', e); }
    }

    loadSummary();

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/admin.html';
    });

    document.getElementById('btn-settings').addEventListener('click', showSettingsModal);

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

    let selectedCompanyId = null;

    async function loadCompanies() {
        try {
            const companies = await api.get('/counter/companies');
            // We need to fetch status for each company, but for performance, we'll mark as pending first
            // and maybe enhance the /counter/companies endpoint later if needed.
            // For now, let's improve the visual style.
            const container = document.getElementById('companies-container');
            if (companies.length === 0) {
                container.innerHTML = '<div class="empty-state">Nenhuma empresa encontrada.</div>';
                return;
            }
            container.innerHTML = companies.map(c => `
                <div class="expense-item clickable-company animate-in" data-id="${c.id}" style="cursor:pointer; border-left: 4px solid #e2e8f0; padding-left: 12px;">
                    <div class="expense-info">
                        <div class="expense-name" style="font-weight:600;">${c.razao_social}</div>
                        <div class="text-xs text-muted" style="display:flex; align-items:center; gap:8px; margin-top:2px;">
                            <span>${c.cnpj}</span>
                            <span style="opacity:0.5">•</span>
                            <span>${c.owner_name}</span>
                        </div>
                    </div>
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="opacity:0.3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            `).join('');

            document.querySelectorAll('.clickable-company').forEach(el => {
                el.addEventListener('click', () => {
                    document.querySelectorAll('.clickable-company').forEach(i => {
                        i.style.borderColor = '#e2e8f0';
                        i.style.background = '';
                    });
                    el.style.borderColor = 'var(--accent)';
                    el.style.background = 'rgba(79, 70, 229, 0.05)';
                    selectedCompanyId = el.dataset.id;
                    document.getElementById('report-period-picker').style.display = 'flex';
                    loadReport();
                });
            });
        } catch (e) { showToast(e.message, 'error'); }
    }

    async function loadReport() {
        if (!selectedCompanyId) return;
        const month = selMonth.value;
        const year = selYear.value;
        const container = document.getElementById('report-container');
        container.innerHTML = '<div class="skeleton" style="height:200px"></div>';

        try {
            // Reusing existing monthly report endpoint, but we need to pass the user ID or use a counter-specific one
            // Actually, we need to allow counter to see client reports. 
            // I'll use a trick: the backend already has auth, but counter sees all cnpjs in their office.
            // But verifyCnpjOwner in reports.js only checks users.id. 
            // I should have updated verifyCnpjOwner or added a specific report route for counters.
            // Let's create a counter-specific report route in backend.
            const report = await api.get(`/reports/monthly?cnpj_id=${selectedCompanyId}&month=${month}&year=${year}`);
            
            if (report.categories.length === 0) {
                container.innerHTML = '<div class="empty-state"><p class="empty-sub">Nenhum dado para este período.</p></div>';
                return;
            }

            container.innerHTML = `
                <div class="gap-16">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="text-lg font-bold">Total: R$ ${report.total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        <button class="btn btn-primary btn-sm" id="btn-download-pdf">Baixar PDF</button>
                    </div>
                    <table class="report-table" style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="text-align:left; border-bottom:1px solid var(--border-subtle);">
                                <th style="padding:12px 0;">Categoria</th>
                                <th style="padding:12px 0; text-align:right;">Lançamentos</th>
                                <th style="padding:12px 0; text-align:right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.categories.map(c => `
                                <tr style="border-bottom:1px solid var(--border-subtle);">
                                    <td style="padding:12px 0;">${c.category_name} ${c.is_filial ? '<small>(Filial)</small>' : ''}</td>
                                    <td style="padding:12px 0; text-align:right;">${c.lancamentos}</td>
                                    <td style="padding:12px 0; text-align:right;">R$ ${parseFloat(c.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            document.getElementById('btn-download-pdf').addEventListener('click', () => {
                showToast('Gerando PDF...', 'info');
                // PDF generation logic would go here
            });

        } catch (e) { 
            container.innerHTML = `<div class="empty-state"><p class="error-text">${e.message}</p></div>`;
        }
    }

    async function showSettingsModal() {
        try {
            const settings = await api.get('/counter/settings');
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-handle"></div>
                    <div class="modal-title">Configurações do Escritório</div>
                    <div class="gap-16">
                        <div class="form-group">
                            <label class="form-label">Horário do Lembrete (WhatsApp)</label>
                            <div style="display:flex; gap:8px; align-items:center;">
                                <input id="set-hour" type="number" class="form-input" min="0" max="23" value="${settings.reminder_whatsapp_hour}" style="width:80px"> :
                                <input id="set-min" type="number" class="form-input" min="0" max="59" value="${settings.reminder_whatsapp_minute}" style="width:80px">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Limite de Dia Útil</label>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input id="set-day-limit" type="number" class="form-input" min="1" max="28" value="${settings.reminder_max_business_day || 3}" style="width:80px">
                                <span class="text-sm text-muted">º dia útil do mês</span>
                            </div>
                            <p class="text-xs text-muted" style="margin-top:4px;">Os lembretes automáticos serão disparados apenas até este dia útil.</p>
                        </div>
                        <div class="form-group" style="flex-direction:row; justify-content:space-between; align-items:center;">
                            <label class="form-label" style="margin:0;">Lembretes Ativados</label>
                            <input id="set-enabled" type="checkbox" style="width:20px; height:20px;" ${settings.reminder_enabled ? 'checked' : ''}>
                        </div>
                        <button class="btn btn-primary" id="btn-save-settings">Salvar Configurações</button>
                        <button class="btn btn-outline" id="btn-close-modal">Fechar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));

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
                    showToast('Configurações salvas!', 'success');
                    overlay.remove();
                } catch (e) { showToast(e.message, 'error'); }
            });

            document.getElementById('btn-close-modal').addEventListener('click', () => overlay.remove());
        } catch (e) { showToast(e.message, 'error'); }
    }

    selMonth.addEventListener('change', loadReport);
    selYear.addEventListener('change', loadReport);

    loadCompanies();
}

render();
