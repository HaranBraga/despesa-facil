const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const XLSX = require('xlsx');

const router = express.Router();

// Middleware: Verify if user is associated with an office
async function verifyIsCounter(req, res, next) {
    if (!req.user.office_id) {
        return res.status(403).json({ error: 'Acesso restrito a contadores vinculados a um escritório' });
    }
    next();
}

// Helper: verify cnpj belongs to counter's office
async function verifyCnpjInOffice(cnpjId, officeId) {
    const r = await pool.query(
        `SELECT c.id FROM cnpjs c
         JOIN users u ON u.id = c.user_id
         WHERE c.id = $1 AND u.office_id = $2 AND c.is_active = true`,
        [cnpjId, officeId]
    );
    return r.rows.length > 0;
}

// GET /api/counter/companies — List companies associated with the office with current month status
router.get('/companies', auth, verifyIsCounter, async (req, res) => {
    try {
        const now = new Date();
        const month = req.query.month ? parseInt(req.query.month) : (now.getMonth() + 1);
        const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

        const result = await pool.query(
            `SELECT 
                c.id, 
                c.cnpj, 
                c.razao_social, 
                u.name as owner_name, 
                u.email as owner_email,
                EXISTS (
                    SELECT 1 FROM expenses e 
                    WHERE e.cnpj_id = c.id 
                    AND e.period_month = $2 
                    AND e.period_year = $3
                ) as has_expenses,
                EXISTS (
                    SELECT 1 FROM expenses e 
                    WHERE e.cnpj_id = c.id 
                    AND e.period_month = $2 
                    AND e.period_year = $3
                    AND e.locked = true
                ) as is_locked,
                rs.sent_at as report_sent_at,
                (
                    SELECT COUNT(*) FROM expenses e 
                    WHERE e.cnpj_id = c.id 
                    AND e.period_month = $2 
                    AND e.period_year = $3
                    AND rs.sent_at IS NOT NULL
                    AND e.created_at > rs.sent_at
                ) as late_expenses_count
             FROM cnpjs c
             JOIN users u ON u.id = c.user_id
             LEFT JOIN report_submissions rs ON rs.cnpj_id = c.id AND rs.period_month = $2 AND rs.period_year = $3
             WHERE u.office_id = $1 AND c.is_active = true
             ORDER BY c.razao_social`,
            [req.user.office_id, month, year]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar empresas' });
    }
});

// GET /api/counter/dashboard-summary — Resumo para o dashboard do contador
router.get('/dashboard-summary', auth, verifyIsCounter, async (req, res) => {
    try {
        const now = new Date();
        const month = req.query.month ? parseInt(req.query.month) : (now.getMonth() + 1);
        const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

        const result = await pool.query(
            `WITH company_stats AS (
                SELECT 
                    c.id,
                    EXISTS (
                        SELECT 1 FROM expenses e 
                        WHERE e.cnpj_id = c.id 
                        AND e.period_month = $2 
                        AND e.period_year = $3
                    ) as has_expenses,
                    EXISTS (
                        SELECT 1 FROM expenses e 
                        WHERE e.cnpj_id = c.id 
                        AND e.period_month = $2 
                        AND e.period_year = $3
                        AND e.locked = true
                    ) as is_locked
                FROM cnpjs c
                JOIN users u ON u.id = c.user_id
                WHERE u.office_id = $1 AND c.is_active = true
            )
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_locked) as delivered,
                COUNT(*) FILTER (WHERE has_expenses AND NOT is_locked) as in_progress,
                COUNT(*) FILTER (WHERE NOT has_expenses) as pending
            FROM company_stats`,
            [req.user.office_id, month, year]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar resumo' });
    }
});

// GET /api/counter/expense-comparison?cnpj_id=&year= — Monthly spending comparison
router.get('/expense-comparison', auth, verifyIsCounter, async (req, res) => {
    try {
        const { cnpj_id, year } = req.query;
        if (!cnpj_id || !year) {
            return res.status(400).json({ error: 'cnpj_id e year são obrigatórios' });
        }
        if (!(await verifyCnpjInOffice(cnpj_id, req.user.office_id))) {
            return res.status(403).json({ error: 'Acesso negado à empresa' });
        }

        // Get monthly totals for the current year
        const current = await pool.query(
            `SELECT period_month AS month, COALESCE(SUM(amount), 0) AS total
             FROM expenses
             WHERE cnpj_id = $1 AND period_year = $2
             GROUP BY period_month
             ORDER BY period_month`,
            [cnpj_id, parseInt(year)]
        );

        // Get monthly totals for the previous year
        const previous = await pool.query(
            `SELECT period_month AS month, COALESCE(SUM(amount), 0) AS total
             FROM expenses
             WHERE cnpj_id = $1 AND period_year = $2
             GROUP BY period_month
             ORDER BY period_month`,
            [cnpj_id, parseInt(year) - 1]
        );

        // Get top 5 categories for the year
        const topCategories = await pool.query(
            `SELECT ec.name, SUM(e.amount) AS total
             FROM expenses e
             JOIN expense_categories ec ON ec.id = e.category_id
             WHERE e.cnpj_id = $1 AND e.period_year = $2
             GROUP BY ec.name
             ORDER BY total DESC
             LIMIT 5`,
            [cnpj_id, parseInt(year)]
        );

        res.json({
            current_year: parseInt(year),
            current_data: current.rows,
            previous_data: previous.rows,
            top_categories: topCategories.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar comparação' });
    }
});

// GET /api/counter/settings — Get WhatsApp reminder settings for the office
router.get('/settings', auth, verifyIsCounter, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM accounting_office_settings WHERE office_id = $1',
            [req.user.office_id]
        );
        if (result.rows.length === 0) {
            return res.json({
                office_id: req.user.office_id,
                reminder_whatsapp_hour: 9,
                reminder_whatsapp_minute: 0,
                reminder_enabled: true,
                reminder_max_business_day: 3,
                webhook_url: null
            });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// PUT /api/counter/settings — Update WhatsApp reminder settings
router.put('/settings', auth, verifyIsCounter, async (req, res) => {
    try {
        const { reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled, reminder_max_business_day, webhook_url } = req.body;
        
        const result = await pool.query(
            `INSERT INTO accounting_office_settings (office_id, reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled, reminder_max_business_day, webhook_url, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (office_id) DO UPDATE SET
                reminder_whatsapp_hour = EXCLUDED.reminder_whatsapp_hour,
                reminder_whatsapp_minute = EXCLUDED.reminder_whatsapp_minute,
                reminder_enabled = EXCLUDED.reminder_enabled,
                reminder_max_business_day = EXCLUDED.reminder_max_business_day,
                webhook_url = EXCLUDED.webhook_url,
                updated_at = NOW()
             RETURNING *`,
            [req.user.office_id, reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled, reminder_max_business_day, webhook_url || null]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});

// GET /api/counter/expenses — List individual expenses for a company
router.get('/expenses', auth, verifyIsCounter, async (req, res) => {
    try {
        const { cnpj_id, month, year } = req.query;
        if (!cnpj_id || !month || !year) {
            return res.status(400).json({ error: 'cnpj_id, month e year são obrigatórios' });
        }

        if (!(await verifyCnpjInOffice(cnpj_id, req.user.office_id))) {
            return res.status(403).json({ error: 'Acesso negado à empresa' });
        }

        // Also get the report sent_at to know which expenses are "late"
        const submission = await pool.query(
            'SELECT sent_at FROM report_submissions WHERE cnpj_id = $1 AND period_month = $2 AND period_year = $3',
            [cnpj_id, parseInt(month), parseInt(year)]
        );
        const sentAt = submission.rows.length > 0 ? submission.rows[0].sent_at : null;

        const result = await pool.query(
            `SELECT e.id, e.amount, e.expense_date, e.description, e.locked, e.created_at,
                    ec.name AS category_name, ec.is_filial, e.category_id
             FROM expenses e
             JOIN expense_categories ec ON ec.id = e.category_id
             WHERE e.cnpj_id = $1 AND e.period_month = $2 AND e.period_year = $3
             ORDER BY e.expense_date DESC, e.created_at DESC`,
            [cnpj_id, parseInt(month), parseInt(year)]
        );

        // Mark late expenses
        const expenses = result.rows.map(e => ({
            ...e,
            is_late: sentAt ? new Date(e.created_at) > new Date(sentAt) : false
        }));

        res.json(expenses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar lista de despesas' });
    }
});

// PUT /api/counter/expenses/:id — Counter edits an expense
router.put('/expenses/:id', auth, verifyIsCounter, async (req, res) => {
    try {
        const { amount, expense_date, description, category_id } = req.body;
        
        // Verify the expense belongs to a company in this counter's office
        const check = await pool.query(
            `SELECT e.id FROM expenses e
             JOIN cnpjs c ON c.id = e.cnpj_id
             JOIN users u ON u.id = c.user_id
             WHERE e.id = $1 AND u.office_id = $2`,
            [req.params.id, req.user.office_id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Despesa não encontrada' });

        const updates = [];
        const values = [];
        let idx = 1;

        if (amount !== undefined) { updates.push(`amount = $${idx}`); values.push(parseFloat(amount)); idx++; }
        if (expense_date) {
            const dateObj = new Date(expense_date);
            updates.push(`expense_date = $${idx}`); values.push(expense_date); idx++;
            updates.push(`period_month = $${idx}`); values.push(dateObj.getUTCMonth() + 1); idx++;
            updates.push(`period_year = $${idx}`); values.push(dateObj.getUTCFullYear()); idx++;
        }
        if (description !== undefined) { updates.push(`description = $${idx}`); values.push(description || null); idx++; }
        if (category_id) { updates.push(`category_id = $${idx}`); values.push(category_id); idx++; }

        updates.push(`updated_at = NOW()`);
        values.push(req.params.id);

        const result = await pool.query(
            `UPDATE expenses SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao editar despesa' });
    }
});

// DELETE /api/counter/expenses/:id — Counter deletes an expense
router.delete('/expenses/:id', auth, verifyIsCounter, async (req, res) => {
    try {
        const check = await pool.query(
            `SELECT e.id FROM expenses e
             JOIN cnpjs c ON c.id = e.cnpj_id
             JOIN users u ON u.id = c.user_id
             WHERE e.id = $1 AND u.office_id = $2`,
            [req.params.id, req.user.office_id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Despesa não encontrada' });

        await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
        res.json({ message: 'Despesa removida pelo contador' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao remover despesa' });
    }
});

// GET /api/counter/cnpj/:id — Dados da conta responsável pelo CNPJ
router.get('/cnpj/:id', auth, verifyIsCounter, async (req, res) => {
    try {
        const belongs = await verifyCnpjInOffice(req.params.id, req.user.office_id);
        if (!belongs) return res.status(404).json({ error: 'CNPJ não encontrado' });

        const r = await pool.query(
            `SELECT c.id, c.cnpj, c.razao_social, c.whatsapp_number as cnpj_whatsapp,
                    u.id as user_id, u.name as owner_name, u.email as owner_email,
                    u.whatsapp_number as account_whatsapp
             FROM cnpjs c
             JOIN users u ON u.id = c.user_id
             WHERE c.id = $1`,
            [req.params.id]
        );
        res.json(r.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar dados do CNPJ' });
    }
});

// PUT /api/counter/cnpj/:id/whatsapp — Contador atualiza whatsapp de notificação do CNPJ
router.put('/cnpj/:id/whatsapp', auth, verifyIsCounter, async (req, res) => {
    try {
        const belongs = await verifyCnpjInOffice(req.params.id, req.user.office_id);
        if (!belongs) return res.status(404).json({ error: 'CNPJ não encontrado' });

        const { whatsapp_number } = req.body;
        await pool.query(
            `UPDATE cnpjs SET whatsapp_number = $1, updated_at = NOW() WHERE id = $2`,
            [whatsapp_number || null, req.params.id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar WhatsApp' });
    }
});

// GET /api/counter/export?cnpj_id=&month=&year= — Exportar relatório em XLSX
router.get('/export', auth, verifyIsCounter, async (req, res) => {
    try {
        const { cnpj_id, month, year } = req.query;
        if (!cnpj_id || !month || !year) return res.status(400).json({ error: 'cnpj_id, month e year são obrigatórios' });

        const belongs = await verifyCnpjInOffice(cnpj_id, req.user.office_id);
        if (!belongs) return res.status(404).json({ error: 'CNPJ não encontrado' });

        const cnpjRow = await pool.query('SELECT razao_social, cnpj FROM cnpjs WHERE id = $1', [cnpj_id]);
        const empresa = cnpjRow.rows[0];

        const expenses = await pool.query(
            `SELECT e.expense_date, e.description, ec.name as category_name, e.amount
             FROM expenses e
             JOIN expense_categories ec ON ec.id = e.category_id
             WHERE e.cnpj_id = $1 AND e.period_month = $2 AND e.period_year = $3
             ORDER BY e.expense_date, ec.name`,
            [cnpj_id, parseInt(month), parseInt(year)]
        );

        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const rows = expenses.rows.map(e => ({
            'Data': e.expense_date ? new Date(e.expense_date).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '',
            'Categoria': e.category_name,
            'Descrição': e.description || '',
            'Valor (R$)': parseFloat(e.amount)
        }));

        const total = rows.reduce((s, r) => s + r['Valor (R$)'], 0);
        rows.push({ 'Data': '', 'Categoria': '', 'Descrição': 'TOTAL', 'Valor (R$)': total });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${monthNames[parseInt(month)-1]} ${year}`);

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = `${empresa.razao_social.replace(/[^a-zA-Z0-9]/g, '_')}_${month}_${year}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao exportar relatório' });
    }
});

module.exports = router;
