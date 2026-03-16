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

// --- MANAGEMENT OF COUNTERS (ACCOUNTANTS) ---

// GET /offices/:id/counters — Listar contadores de um escritório
router.get('/:id/counters', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { id } = req.params;
        const result = await pool.query(
            'SELECT id, name, email, created_at FROM users WHERE office_id = $1 AND is_admin = false ORDER BY name ASC',
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar contadores' });
    }
});

// POST /offices/:id/counters — Criar um novo contador para o escritório
router.post('/:id/counters', auth, async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { id: officeId } = req.params;
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'E-mail já cadastrado' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (id, name, email, password_hash, office_id, is_admin) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email',
            [uuidv4(), name, email.toLowerCase(), hash, officeId, false]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar contador' });
    }
});

// DELETE /offices/counters/:id — Deletar um contador
router.delete('/counters/:id', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        const { id } = req.params;
        // Impedindo deletar a si mesmo ou outro admin por esta rota
        const check = await pool.query('SELECT is_admin FROM users WHERE id = $1', [id]);
        if (check.rows.length > 0 && check.rows[0].is_admin) {
            return res.status(403).json({ error: 'Não é possível deletar um administrador por esta rota' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Contador excluído com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir contador' });
    }
});

module.exports = router;
