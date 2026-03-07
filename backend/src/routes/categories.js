const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /categories — todas as categorias globais + criadas pelo usuário
router.get('/', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM expense_categories
       WHERE is_default = true OR created_by = $1
       ORDER BY is_filial, name`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// POST /categories — criar categoria personalizada
router.post('/', auth, async (req, res) => {
    try {
        const { name, tipo = 'ambos' } = req.body;
        if (!name) return res.status(400).json({ error: 'Nome da categoria é obrigatório' });

        const result = await pool.query(
            `INSERT INTO expense_categories (id, name, is_filial, is_default, tipo, created_by)
       VALUES ($1,$2,false,false,$3,$4) RETURNING *`,
            [uuidv4(), name.trim(), tipo, req.user.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});

// DELETE /categories/:id — deletar categoria personalizada (somente do próprio usuário)
router.delete('/:id', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM expense_categories WHERE id = $1 AND created_by = $2 RETURNING id',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Categoria não encontrada ou não pode ser removida' });
        res.json({ message: 'Categoria removida' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover categoria' });
    }
});

module.exports = router;
