const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

async function verifyCnpjOwner(cnpjId, userId) {
    const r = await pool.query(
        `SELECT c.id 
         FROM cnpjs c
         JOIN users u_owner ON u_owner.id = c.user_id
         JOIN users u_viewer ON u_viewer.id = $2
         WHERE c.id = $1 
           AND (c.user_id = $2 OR (u_viewer.office_id = u_owner.office_id AND u_viewer.office_id IS NOT NULL))
           AND c.is_active = true`,
        [cnpjId, userId]
    );
    return r.rows.length > 0;
}

// GET /reports/monthly?cnpj_id=&month=&year=
router.get('/monthly', auth, async (req, res) => {
    try {
        const { cnpj_id, month, year } = req.query;
        if (!cnpj_id || !month || !year) {
            return res.status(400).json({ error: 'cnpj_id, month e year são obrigatórios' });
        }
        if (!(await verifyCnpjOwner(cnpj_id, req.user.id))) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await pool.query(
            `SELECT
        ec.id AS category_id,
        ec.name AS category_name,
        ec.is_filial,
        COALESCE(SUM(e.amount), 0) AS total,
        COUNT(e.id) AS lancamentos
       FROM expense_categories ec
       LEFT JOIN expenses e
         ON e.category_id = ec.id
         AND e.cnpj_id = $1
         AND e.period_month = $2
         AND e.period_year = $3
       LEFT JOIN user_category_preferences ucp
         ON ucp.category_id = ec.id AND ucp.cnpj_id = $1
       WHERE (ec.is_default = true OR ec.created_by = $4)
         AND COALESCE(ucp.is_visible, true) = true
       GROUP BY ec.id, ec.name, ec.is_filial, ucp.sort_order
       ORDER BY COALESCE(ucp.sort_order, 999), ec.is_filial, ec.name`,
            [cnpj_id, parseInt(month), parseInt(year), req.user.id]
        );

        const total_geral = result.rows.reduce((sum, r) => sum + parseFloat(r.total), 0);

        // Check if report was already sent for this month
        const submission = await pool.query(
            'SELECT sent_at FROM report_submissions WHERE cnpj_id = $1 AND period_month = $2 AND period_year = $3',
            [cnpj_id, parseInt(month), parseInt(year)]
        );

        // Count late expenses (added after report was sent)
        let late_expenses_count = 0;
        if (submission.rows.length > 0) {
            const lateResult = await pool.query(
                `SELECT COUNT(*) as count FROM expenses 
                 WHERE cnpj_id = $1 AND period_month = $2 AND period_year = $3 
                 AND created_at > $4`,
                [cnpj_id, parseInt(month), parseInt(year), submission.rows[0].sent_at]
            );
            late_expenses_count = parseInt(lateResult.rows[0].count);
        }

        res.json({
            month: parseInt(month),
            year: parseInt(year),
            categories: result.rows,
            total_geral,
            report_sent_at: submission.rows.length > 0 ? submission.rows[0].sent_at : null,
            late_expenses_count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao gerar relatório mensal' });
    }
});

// GET /reports/daily?cnpj_id=&date=
router.get('/daily', auth, async (req, res) => {
    try {
        const { cnpj_id, date } = req.query;
        if (!cnpj_id || !date) {
            return res.status(400).json({ error: 'cnpj_id e date são obrigatórios' });
        }
        if (!(await verifyCnpjOwner(cnpj_id, req.user.id))) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await pool.query(
            `SELECT e.*, ec.name AS category_name, ec.is_filial
       FROM expenses e
       JOIN expense_categories ec ON ec.id = e.category_id
       WHERE e.cnpj_id = $1 AND e.expense_date = $2
       ORDER BY ec.name`,
            [cnpj_id, date]
        );

        const total = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
        res.json({ date, expenses: result.rows, total });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao gerar relatório diário' });
    }
});

// GET /reports/summary?cnpj_id=&year= — resumo anual por mês
router.get('/summary', auth, async (req, res) => {
    try {
        const { cnpj_id, year } = req.query;
        if (!cnpj_id || !year) return res.status(400).json({ error: 'cnpj_id e year são obrigatórios' });
        if (!(await verifyCnpjOwner(cnpj_id, req.user.id))) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await pool.query(
            `SELECT period_month AS month, SUM(amount) AS total
       FROM expenses
       WHERE cnpj_id = $1 AND period_year = $2
       GROUP BY period_month
       ORDER BY period_month`,
            [cnpj_id, parseInt(year)]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao gerar resumo anual' });
    }
});

// POST /reports/send — travar despesas do mês (enviar para o contador)
router.post('/send', auth, async (req, res) => {
    try {
        const { cnpj_id, month, year } = req.body;
        if (!cnpj_id || !month || !year) {
            return res.status(400).json({ error: 'cnpj_id, month e year são obrigatórios' });
        }
        if (!(await verifyCnpjOwner(cnpj_id, req.user.id))) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await pool.query(
            `UPDATE expenses 
             SET locked = true, updated_at = NOW()
             WHERE cnpj_id = $1 AND period_month = $2 AND period_year = $3
             RETURNING id`,
            [cnpj_id, parseInt(month), parseInt(year)]
        );

        // Record the submission timestamp
        await pool.query(
            `INSERT INTO report_submissions (cnpj_id, period_month, period_year, sent_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (cnpj_id, period_month, period_year) 
             DO UPDATE SET sent_at = NOW()`,
            [cnpj_id, parseInt(month), parseInt(year)]
        );

        res.json({ message: 'Relatório enviado e despesas bloqueadas', count: result.rows.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao enviar relatório' });
    }
});

module.exports = router;
