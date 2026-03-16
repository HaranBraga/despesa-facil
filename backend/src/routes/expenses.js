const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

async function verifyCnpjOwner(cnpjId, userId) {
    const r = await pool.query(
        'SELECT id FROM cnpjs WHERE id = $1 AND user_id = $2 AND is_active = true',
        [cnpjId, userId]
    );
    return r.rows.length > 0;
}

// GET /expenses?cnpj_id=&date=&month=&year=&tipo=
router.get('/', auth, async (req, res) => {
    try {
        const { cnpj_id, date, month, year, tipo } = req.query;
        if (!cnpj_id) return res.status(400).json({ error: 'cnpj_id é obrigatório' });
        if (!(await verifyCnpjOwner(cnpj_id, req.user.id))) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        let query = `
      SELECT e.*, ec.name AS category_name, ec.is_filial
      FROM expenses e
      JOIN expense_categories ec ON ec.id = e.category_id
      WHERE e.cnpj_id = $1
    `;
        const params = [cnpj_id];

        if (date) {
            params.push(date);
            query += ` AND e.expense_date = $${params.length}`;
        } else if (month && year) {
            params.push(parseInt(month), parseInt(year));
            query += ` AND e.period_month = $${params.length - 1} AND e.period_year = $${params.length}`;
        }

        if (tipo) {
            params.push(tipo);
            query += ` AND e.tipo = $${params.length}`;
        }

        query += ' ORDER BY e.expense_date DESC, ec.name';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar despesas' });
    }
});

// POST /expenses — lançar despesa única (diária)
router.post('/', auth, async (req, res) => {
    try {
        const { cnpj_id, category_id, amount, expense_date, description, tipo = 'diario' } = req.body;
        if (!cnpj_id || !category_id || amount === undefined || !expense_date) {
            return res.status(400).json({ error: 'cnpj_id, category_id, amount e expense_date são obrigatórios' });
        }
        if (!(await verifyCnpjOwner(cnpj_id, req.user.id))) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const dateObj = new Date(expense_date);
        const period_month = dateObj.getUTCMonth() + 1;
        const period_year = dateObj.getUTCFullYear();

        const result = await pool.query(
            `INSERT INTO expenses (id, cnpj_id, category_id, amount, expense_date, period_month, period_year, tipo, description, locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [uuidv4(), cnpj_id, category_id, parseFloat(amount), expense_date, period_month, period_year, tipo, description || null, false]
        );

        const expense = result.rows[0];
        const cat = await pool.query('SELECT name FROM expense_categories WHERE id = $1', [category_id]);
        res.status(201).json({ ...expense, category_name: cat.rows[0]?.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao lançar despesa' });
    }
});

// POST /expenses/bulk — lançar múltiplas despesas de uma vez (diário ou mensal)
router.post('/bulk', auth, async (req, res) => {
    try {
        const { cnpj_id, items, period_month, period_year, tipo = 'mensal', expense_date } = req.body;
        if (!cnpj_id || !Array.isArray(items) || !period_month || !period_year) {
            return res.status(400).json({ error: 'cnpj_id, items, period_month e period_year são obrigatórios' });
        }
        if (!(await verifyCnpjOwner(cnpj_id, req.user.id))) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const validItems = items.filter(i => i.amount && parseFloat(i.amount) > 0 && i.category_id);
        if (validItems.length === 0) {
            return res.status(400).json({ error: 'Nenhum valor preenchido' });
        }

        // Usa data especificada ou dia 1 do mês selecionado
        const final_date = expense_date || `${period_year}-${String(period_month).padStart(2, '0')}-01`;

        const client = await pool.connect();
        const inserted = [];
        try {
            await client.query('BEGIN');
            for (const item of validItems) {
                const r = await client.query(
                    `INSERT INTO expenses (id, cnpj_id, category_id, amount, expense_date, period_month, period_year, tipo, description, locked)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
                    [uuidv4(), cnpj_id, item.category_id, parseFloat(item.amount), final_date, parseInt(period_month), parseInt(period_year), tipo, item.description || null, false]
                );
                inserted.push(r.rows[0]);
            }
            await client.query('COMMIT');
            res.status(201).json({ inserted: inserted.length, expenses: inserted });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao lançar despesas mensais' });
    }
});

// PUT /expenses/:id — editar despesa
router.put('/:id', auth, async (req, res) => {
    try {
        const { amount, expense_date, description, category_id } = req.body;
        const check = await pool.query(
            `SELECT e.id, e.locked FROM expenses e JOIN cnpjs c ON c.id = e.cnpj_id WHERE e.id = $1 AND c.user_id = $2`,
            [req.params.id, req.user.id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Despesa não encontrada' });
        if (check.rows[0].locked) return res.status(403).json({ error: 'Despesa travada não pode ser editada' });

        const dateObj = new Date(expense_date);
        const period_month = dateObj.getUTCMonth() + 1;
        const period_year = dateObj.getUTCFullYear();

        const result = await pool.query(
            `UPDATE expenses SET amount=$1, expense_date=$2, period_month=$3, period_year=$4, description=$5, category_id=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
            [parseFloat(amount), expense_date, period_month, period_year, description || null, category_id, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao editar despesa' });
    }
});

// DELETE /expenses/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        const check = await pool.query(
            `SELECT e.id, e.locked FROM expenses e JOIN cnpjs c ON c.id = e.cnpj_id WHERE e.id = $1 AND c.user_id = $2`,
            [req.params.id, req.user.id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Despesa não encontrada' });
        if (check.rows[0].locked) return res.status(403).json({ error: 'Despesa travada não pode ser removida' });

        await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
        res.json({ message: 'Despesa removida' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover despesa' });
    }
});

module.exports = router;
