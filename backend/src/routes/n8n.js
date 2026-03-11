const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

const router = express.Router();

// Middleware: autenticação por API Key (header x-api-key)
async function apiKeyAuth(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!key) return res.status(401).json({ error: 'API Key não fornecida' });

    try {
        // Busca todas as keys ativas e compara via bcrypt
        const result = await pool.query(
            'SELECT id, key_hash, office_id FROM api_keys WHERE is_active = true'
        );
        let matched = null;
        for (const row of result.rows) {
            if (await bcrypt.compare(key, row.key_hash)) {
                matched = row;
                break;
            }
        }
        if (!matched) return res.status(401).json({ error: 'API Key inválida' });
        req.apiKey = matched;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao validar API Key' });
    }
}

// Helper: monta o guest link de um CNPJ
function buildGuestLink(token) {
    let base = process.env.APP_URL || process.env.FRONTEND_URL || 'https://app.despesafacil.com.br';
    if (base.endsWith('/')) base = base.slice(0, -1);
    return `${base}/lancamento?token=${token}`;
}

// Helper: resolve o número de WhatsApp efetivo (CNPJ ou usuário como fallback)
function resolveWhatsapp(cnpjNumber, userNumber) {
    return cnpjNumber || userNumber || null;
}

/**
 * GET /api/n8n/missing-today
 * Lista CNPJs que NÃO enviaram nenhuma despesa diária hoje.
 * Requer header: x-api-key
 * Opcional: ?office_id=UUID para filtrar por escritório específico
 */
router.get('/missing-today', apiKeyAuth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const officeFilter = req.query.office_id || req.apiKey.office_id;

        let query = `
            SELECT
                c.id AS cnpj_id,
                c.cnpj,
                c.razao_social,
                c.whatsapp_token,
                c.whatsapp_number AS cnpj_whatsapp,
                u.whatsapp_number AS user_whatsapp,
                u.name AS user_name,
                u.id AS user_id
            FROM cnpjs c
            JOIN users u ON u.id = c.user_id
            WHERE c.is_active = true
              AND u.is_active = true
              AND c.id NOT IN (
                  SELECT DISTINCT cnpj_id
                  FROM expenses
                  WHERE expense_date = $1
                    AND tipo = 'diario'
              )
        `;
        const params = [today];

        if (officeFilter) {
            params.push(officeFilter);
            query += ` AND u.office_id = $${params.length}`;
        }

        query += ' ORDER BY u.name, c.razao_social';

        const result = await pool.query(query, params);

        const rows = result.rows.map(r => ({
            cnpj_id: r.cnpj_id,
            cnpj: r.cnpj,
            razao_social: r.razao_social,
            user_id: r.user_id,
            user_name: r.user_name,
            whatsapp: resolveWhatsapp(r.cnpj_whatsapp, r.user_whatsapp),
            guest_link: buildGuestLink(r.whatsapp_token)
        }));

        res.json({ date: today, total: rows.length, cnpjs: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar CNPJs sem despesa hoje' });
    }
});

/**
 * GET /api/n8n/missing-monthly?month=3&year=2026
 * Lista CNPJs que NÃO enviaram nenhuma despesa mensal no mês/ano indicado.
 * Requer header: x-api-key
 */
router.get('/missing-monthly', apiKeyAuth, async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ error: 'month e year são obrigatórios' });
        }
        const m = parseInt(month);
        const y = parseInt(year);
        const officeFilter = req.query.office_id || req.apiKey.office_id;

        let query = `
            SELECT
                c.id AS cnpj_id,
                c.cnpj,
                c.razao_social,
                c.whatsapp_token,
                c.whatsapp_number AS cnpj_whatsapp,
                u.whatsapp_number AS user_whatsapp,
                u.name AS user_name,
                u.id AS user_id
            FROM cnpjs c
            JOIN users u ON u.id = c.user_id
            WHERE c.is_active = true
              AND u.is_active = true
              AND c.id NOT IN (
                  SELECT DISTINCT cnpj_id
                  FROM expenses
                  WHERE period_month = $1
                    AND period_year = $2
                    AND tipo = 'mensal'
              )
        `;
        const params = [m, y];

        if (officeFilter) {
            params.push(officeFilter);
            query += ` AND u.office_id = $${params.length}`;
        }

        query += ' ORDER BY u.name, c.razao_social';

        const result = await pool.query(query, params);

        const rows = result.rows.map(r => ({
            cnpj_id: r.cnpj_id,
            cnpj: r.cnpj,
            razao_social: r.razao_social,
            user_id: r.user_id,
            user_name: r.user_name,
            whatsapp: resolveWhatsapp(r.cnpj_whatsapp, r.user_whatsapp),
            guest_link: buildGuestLink(r.whatsapp_token)
        }));

        res.json({ month: m, year: y, total: rows.length, cnpjs: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar CNPJs sem despesa mensal' });
    }
});

/**
 * GET /api/n8n/last-expense?cnpj_id=UUID
 * Retorna a última despesa (qualquer tipo) de um CNPJ específico.
 * Requer header: x-api-key
 */
router.get('/last-expense', apiKeyAuth, async (req, res) => {
    try {
        const { cnpj_id } = req.query;
        if (!cnpj_id) return res.status(400).json({ error: 'cnpj_id é obrigatório' });

        const result = await pool.query(
            `SELECT e.*, ec.name AS category_name
             FROM expenses e
             JOIN expense_categories ec ON ec.id = e.category_id
             WHERE e.cnpj_id = $1
             ORDER BY e.expense_date DESC, e.created_at DESC
             LIMIT 1`,
            [cnpj_id]
        );

        if (result.rows.length === 0) {
            return res.json({ cnpj_id, last_expense: null });
        }

        res.json({ cnpj_id, last_expense: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar última despesa' });
    }
});

/**
 * POST /api/n8n/api-keys
 * Gera uma nova API Key para um escritório. Requer x-api-key master ou auth admin.
 * Body: { description, office_id }
 * Retorna: { key } — salvo apenas uma vez, armazena o hash.
 */
router.post('/api-keys', apiKeyAuth, async (req, res) => {
    try {
        const { description, office_id } = req.body;

        // Gera key aleatória segura
        const rawKey = require('crypto').randomBytes(32).toString('hex');
        const hash = await bcrypt.hash(rawKey, 10);

        await pool.query(
            'INSERT INTO api_keys (key_hash, description, office_id) VALUES ($1, $2, $3)',
            [hash, description || 'API Key', office_id || req.apiKey.office_id]
        );

        res.status(201).json({
            message: 'API Key criada. Guarde-a agora — não será exibida novamente.',
            key: rawKey
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar API Key' });
    }
});

module.exports = router;
