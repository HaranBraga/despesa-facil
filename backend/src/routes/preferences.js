const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// Verifica se o CNPJ pertence ao usuário autenticado
async function verifyCnpjOwner(cnpjId, userId) {
    const result = await pool.query(
        'SELECT id FROM cnpjs WHERE id = $1 AND user_id = $2 AND is_active = true',
        [cnpjId, userId]
    );
    return result.rows.length > 0;
}

// GET /preferences/:cnpjId — preferências de categoria para um CNPJ
router.get('/:cnpjId', auth, async (req, res) => {
    try {
        const { cnpjId } = req.params;
        if (!(await verifyCnpjOwner(cnpjId, req.user.id))) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        // Busca categorias com preferências já configuradas, ou padrão
        const result = await pool.query(
            `SELECT
        ec.id AS category_id,
        ec.name,
        ec.is_filial,
        ec.is_default,
        COALESCE(ucp.tipo, ec.tipo) AS tipo,
        COALESCE(ucp.sort_order, 999) AS sort_order,
        COALESCE(ucp.is_visible, true) AS is_visible
       FROM expense_categories ec
       LEFT JOIN user_category_preferences ucp
         ON ucp.category_id = ec.id AND ucp.cnpj_id = $1
       WHERE (ec.is_default = true OR ec.created_by = $2)
         AND ec.is_filial = false
       ORDER BY sort_order, ec.name`,
            [cnpjId, req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar preferências' });
    }
});

// PUT /preferences/:cnpjId — salvar preferências (ordem + visibilidade + tipo)
router.put('/:cnpjId', auth, async (req, res) => {
    try {
        const { cnpjId } = req.params;
        const { preferences } = req.body; // Array: [{category_id, sort_order, is_visible, tipo}]

        if (!(await verifyCnpjOwner(cnpjId, req.user.id))) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (!Array.isArray(preferences)) {
            return res.status(400).json({ error: 'preferences deve ser um array' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const pref of preferences) {
                await client.query(
                    `INSERT INTO user_category_preferences (id, cnpj_id, category_id, sort_order, is_visible, tipo)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (cnpj_id, category_id)
           DO UPDATE SET sort_order = $4, is_visible = $5, tipo = $6`,
                    [uuidv4(), cnpjId, pref.category_id, pref.sort_order, pref.is_visible, pref.tipo || 'ambos']
                );
            }
            await client.query('COMMIT');
            res.json({ message: 'Preferências salvas com sucesso' });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao salvar preferências' });
    }
});

module.exports = router;
