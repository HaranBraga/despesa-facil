require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { migrate } = require('./db/migrate');
const { seed } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Despesa Fácil API', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/offices', require('./routes/offices'));
app.use('/api/cnpjs', require('./routes/cnpjs'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/preferences', require('./routes/preferences'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/account', require('./routes/account'));
app.use('/api/n8n', require('./routes/n8n'));
app.use('/api/guest', require('./routes/guest'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/counter', require('./routes/counter'));

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

async function ensureAdmin() {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const pool = require('./db/pool');
    const username = 'admin';
    const password = '415263';
    const existing = await pool.query('SELECT id FROM users WHERE username = $1 AND is_admin = true', [username]);
    if (existing.rows.length === 0) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (id, name, username, password_hash, is_admin) VALUES ($1, $2, $3, $4, true) ON CONFLICT (username) DO UPDATE SET is_admin = true, password_hash = $4',
            [uuidv4(), 'Admin', username, hash]
        );
        console.log('✅ Admin criado — usuário: admin / senha: 415263');
    }
}

async function start() {
    try {
        await migrate();
        await seed();
        await ensureAdmin();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Despesa Fácil API rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error('Falha ao iniciar servidor:', err);
        process.exit(1);
    }
}

start();
