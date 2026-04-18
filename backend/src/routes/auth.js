const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const router = express.Router();

function buildToken(user, type) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            type,
            office_id: user.office_id || null,
            // mantidos por compatibilidade com tokens antigos ainda em circulação
            is_admin: type === 'admin',
            is_counter: type === 'counter'
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
}

function buildUserResponse(user, type) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        type,
        office_id: user.office_id || null,
        is_admin: type === 'admin',
        is_counter: type === 'counter'
    };
}

// POST /auth/register — Cria conta de cliente (usuário do app)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, office_id } = req.body;
        if (!name || !email || !password || !office_id) {
            return res.status(400).json({ error: 'Nome, email, senha e escritório são obrigatórios' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
        }

        // Verifica email único em ambas as tabelas
        const existing = await pool.query(
            `SELECT id FROM users WHERE email = $1
             UNION SELECT id FROM counters WHERE email = $1`,
            [email.toLowerCase()]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'E-mail já cadastrado' });
        }

        const existingOffice = await pool.query('SELECT id FROM accounting_offices WHERE id = $1', [office_id]);
        if (existingOffice.rows.length === 0) {
            return res.status(400).json({ error: 'Escritório selecionado não existe' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (id, name, email, password_hash, office_id, is_admin) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, office_id',
            [uuidv4(), name, email.toLowerCase(), hash, office_id, false]
        );

        const user = result.rows[0];
        const token = buildToken(user, 'user');
        res.status(201).json({ user: buildUserResponse(user, 'user'), token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /auth/login — Login unificado para users, counters e admins
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Usuário/email e senha são obrigatórios' });
        }

        // Tenta na tabela users por email ou username
        let actor = null;
        let actorType = null;

        const userRow = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $1',
            [email.toLowerCase()]
        );
        if (userRow.rows.length > 0) {
            actor = userRow.rows[0];
            actorType = actor.is_admin ? 'admin' : 'user';
        }

        // Se não encontrou, tenta na tabela counters
        if (!actor) {
            const counterRow = await pool.query('SELECT * FROM counters WHERE email = $1', [email.toLowerCase()]);
            if (counterRow.rows.length > 0) {
                actor = counterRow.rows[0];
                actorType = 'counter';
            }
        }

        if (!actor) return res.status(401).json({ error: 'Credenciais inválidas' });

        const valid = await bcrypt.compare(password, actor.password_hash);
        if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

        const token = buildToken(actor, actorType);
        res.json({ user: buildUserResponse(actor, actorType), token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /auth/me — Retorna dados do usuário logado
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        if (req.user.type === 'counter') {
            const result = await pool.query(
                'SELECT id, name, email, office_id, whatsapp_number, is_active, created_at FROM counters WHERE id = $1',
                [req.user.id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Contador não encontrado' });
            const c = result.rows[0];
            return res.json({ ...c, type: 'counter', is_counter: true, is_admin: false });
        }

        const result = await pool.query(
            'SELECT id, name, email, is_admin, office_id, whatsapp_number, is_active, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        const u = result.rows[0];
        const type = u.is_admin ? 'admin' : 'user';
        res.json({ ...u, type, is_counter: false });
    } catch (err) {
        res.status(500).json({ error: 'Erro interno' });
    }
});

module.exports = router;
