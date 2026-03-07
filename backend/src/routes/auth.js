const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, office_id } = req.body;
        if (!name || !email || !password || !office_id) {
            return res.status(400).json({ error: 'Nome, email, senha e escritório são obrigatórios' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
        }

        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'E-mail já cadastrado' });
        }

        const existingOffice = await pool.query('SELECT id FROM accounting_offices WHERE id = $1', [office_id]);
        if (existingOffice.rows.length === 0) {
            return res.status(400).json({ error: 'Escritório selecionado não existe' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (id, name, email, password_hash, office_id, is_admin) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, office_id, is_admin, created_at',
            [uuidv4(), name, email.toLowerCase(), hash, office_id, false]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin, office_id: user.office_id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin, office_id: user.office_id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin, office_id: user.office_id },
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, is_admin, office_id, created_at FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

module.exports = router;
