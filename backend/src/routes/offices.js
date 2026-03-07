const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /offices — listar todos os escritórios disponíveis (aberto para o formulário de registro, ou protegido mas retornamos apenas ID e Nome)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name FROM accounting_offices ORDER BY name ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar escritórios' });
    }
});

// POST /offices — Criar um novo escritório (Protegido, idealmente apenas Admins)
router.post('/', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Nome do escritório é obrigatório' });

        const newId = uuidv4();
        await pool.query(
            'INSERT INTO accounting_offices (id, name) VALUES ($1, $2)',
            [newId, name]
        );

        res.status(201).json({ message: 'Escritório criado com sucesso', id: newId, name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar escritório' });
    }
});

// DELETE /offices/:id — Deletar um escritório (Apenas Admins)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        const { id } = req.params;
        await pool.query('DELETE FROM accounting_offices WHERE id = $1', [id]);
        res.json({ message: 'Escritório excluído com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir escritório' });
    }
});

module.exports = router;
