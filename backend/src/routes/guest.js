const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const router = express.Router();

// Helper: resolve CNPJ pelo token
async function cnpjByToken(token) {
    const result = await pool.query(
        `SELECT c.id, c.cnpj, c.razao_social, c.user_id
         FROM cnpjs c
         JOIN users u ON u.id = c.user_id
         WHERE c.whatsapp_token = $1
           AND c.is_active = true
           AND u.is_active = true`,
        [token]
    );
    return result.rows[0] || null;
}

/**
 * GET /api/guest/cnpj?token=UUID
 * Retorna dados do CNPJ e categorias disponíveis para o formulário guest.
 * Não requer autenticação — token é o identificador.
 */
router.get('/cnpj', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token não fornecido' });

        const cnpj = await cnpjByToken(token);
        if (!cnpj) return res.status(404).json({ error: 'Link inválido ou expirado' });

        // Busca categorias visíveis para este CNPJ
        const catResult = await pool.query(
            `SELECT ec.id, ec.name, ec.tipo, ec.is_filial,
                    COALESCE(ucp.sort_order, 999) AS sort_order,
                    COALESCE(ucp.is_visible, true) AS is_visible
             FROM expense_categories ec
             LEFT JOIN user_category_preferences ucp
                    ON ucp.category_id = ec.id AND ucp.cnpj_id = $1
             WHERE (ec.is_default = true OR ec.created_by = $2)
               AND COALESCE(ucp.is_visible, true) = true
             ORDER BY sort_order, ec.name`,
            [cnpj.id, cnpj.user_id]
        );

        res.json({
            cnpj_id: cnpj.id,
            cnpj: cnpj.cnpj,
            razao_social: cnpj.razao_social,
            categories: catResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar dados do CNPJ' });
    }
});

/**
 * POST /api/guest/expenses?token=UUID
 * Lança uma despesa única (diária) sem autenticação JWT.
 * Body: { category_id, amount, expense_date, description }
 */
router.post('/expenses', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token não fornecido' });

        const cnpj = await cnpjByToken(token);
        if (!cnpj) return res.status(404).json({ error: 'Link inválido ou expirado' });

        const { category_id, amount, expense_date, description, tipo = 'diario' } = req.body;
        if (!category_id || amount === undefined || !expense_date) {
            return res.status(400).json({ error: 'category_id, amount e expense_date são obrigatórios' });
        }

        // Valida que a categoria pertence ao sistema ou ao usuário dono do CNPJ
        const catCheck = await pool.query(
            `SELECT id FROM expense_categories
             WHERE id = $1 AND (is_default = true OR created_by = $2)`,
            [category_id, cnpj.user_id]
        );
        if (catCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Categoria inválida' });
        }

        const dateObj = new Date(expense_date);
        const period_month = dateObj.getUTCMonth() + 1;
        const period_year = dateObj.getUTCFullYear();

        const result = await pool.query(
            `INSERT INTO expenses (id, cnpj_id, category_id, amount, expense_date, period_month, period_year, tipo, description)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            [uuidv4(), cnpj.id, category_id, parseFloat(amount), expense_date, period_month, period_year, tipo, description || null]
        );

        const expense = result.rows[0];
        const cat = await pool.query('SELECT name FROM expense_categories WHERE id = $1', [category_id]);
        res.status(201).json({ ...expense, category_name: cat.rows[0]?.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao lançar despesa' });
    }
});

/**
 * POST /api/guest/expenses/bulk?token=UUID
 * Lança múltiplas despesas de uma vez (diário ou mensal) sem autenticação JWT.
 * Body: { items: [{ category_id, amount, description }], period_month, period_year, tipo, expense_date }
 */
router.post('/expenses/bulk', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Token não fornecido' });

        const cnpj = await cnpjByToken(token);
        if (!cnpj) return res.status(404).json({ error: 'Link inválido ou expirado' });

        const { items, period_month, period_year, tipo = 'mensal', expense_date } = req.body;
        if (!Array.isArray(items) || !period_month || !period_year) {
            return res.status(400).json({ error: 'items, period_month e period_year são obrigatórios' });
        }

        const validItems = items.filter(i => i.amount && parseFloat(i.amount) > 0 && i.category_id);
        if (validItems.length === 0) {
            return res.status(400).json({ error: 'Nenhum valor preenchido' });
        }

        const final_date = expense_date || `${period_year}-${String(period_month).padStart(2, '0')}-01`;

        const client = await pool.connect();
        const inserted = [];
        try {
            await client.query('BEGIN');
            for (const item of validItems) {
                const r = await client.query(
                    `INSERT INTO expenses (id, cnpj_id, category_id, amount, expense_date, period_month, period_year, tipo, description)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
                    [uuidv4(), cnpj.id, item.category_id, parseFloat(item.amount), final_date,
                     parseInt(period_month), parseInt(period_year), tipo, item.description || null]
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
        res.status(500).json({ error: 'Erro ao lançar despesas' });
    }
});

module.exports = router;
