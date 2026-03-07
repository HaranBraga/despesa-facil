require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { migrate } = require('./db/migrate');
const { seed } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Despesa Fácil API', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/offices', require('./routes/offices'));
app.use('/cnpjs', require('./routes/cnpjs'));
app.use('/categories', require('./routes/categories'));
app.use('/preferences', require('./routes/preferences'));
app.use('/expenses', require('./routes/expenses'));
app.use('/reports', require('./routes/reports'));

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

async function start() {
    try {
        await migrate();
        await seed();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Despesa Fácil API rodando na porta ${PORT}`);
        });
    } catch (err) {
        console.error('Falha ao iniciar servidor:', err);
        process.exit(1);
    }
}

start();
