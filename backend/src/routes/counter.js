const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// Middleware: Verify if user is associated with an office
async function verifyIsCounter(req, res, next) {
    if (!req.user.office_id) {
        return res.status(403).json({ error: 'Acesso restrito a contadores vinculados a um escritório' });
    }
    next();
}

// GET /api/counter/companies — List companies associated with the office with current month status
router.get('/companies', auth, verifyIsCounter, async (req, res) => {
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const result = await pool.query(
            `SELECT 
                c.id, 
                c.cnpj, 
                c.razao_social, 
                u.name as owner_name, 
                u.email as owner_email,
                EXISTS (
                    SELECT 1 FROM expenses e 
                    WHERE e.cnpj_id = c.id 
                    AND e.period_month = $2 
                    AND e.period_year = $3
                ) as has_expenses,
                EXISTS (
                    SELECT 1 FROM expenses e 
                    WHERE e.cnpj_id = c.id 
                    AND e.period_month = $2 
                    AND e.period_year = $3
                    AND e.locked = true
                ) as is_locked
             FROM cnpjs c
             JOIN users u ON u.id = c.user_id
             WHERE u.office_id = $1 AND c.is_active = true
             ORDER BY c.razao_social`,
            [req.user.office_id, month, year]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar empresas' });
    }
});

// GET /api/counter/dashboard-summary — Resumo para o dashboard do contador
router.get('/dashboard-summary', auth, verifyIsCounter, async (req, res) => {
    try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const result = await pool.query(
            `WITH company_stats AS (
                SELECT 
                    c.id,
                    EXISTS (
                        SELECT 1 FROM expenses e 
                        WHERE e.cnpj_id = c.id 
                        AND e.period_month = $2 
                        AND e.period_year = $3
                    ) as has_expenses,
                    EXISTS (
                        SELECT 1 FROM expenses e 
                        WHERE e.cnpj_id = c.id 
                        AND e.period_month = $2 
                        AND e.period_year = $3
                        AND e.locked = true
                    ) as is_locked
                FROM cnpjs c
                JOIN users u ON u.id = c.user_id
                WHERE u.office_id = $1 AND c.is_active = true
            )
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_locked) as delivered,
                COUNT(*) FILTER (WHERE has_expenses AND NOT is_locked) as in_progress,
                COUNT(*) FILTER (WHERE NOT has_expenses) as pending
            FROM company_stats`,
            [req.user.office_id, month, year]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar resumo' });
    }
});

// GET /api/counter/settings — Get WhatsApp reminder settings for the office
router.get('/settings', auth, verifyIsCounter, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM accounting_office_settings WHERE office_id = $1',
            [req.user.office_id]
        );
        if (result.rows.length === 0) {
            // Return defaults if not set
            return res.json({
                office_id: req.user.office_id,
                reminder_whatsapp_hour: 9,
                reminder_whatsapp_minute: 0,
                reminder_enabled: true,
                reminder_max_business_day: 3
            });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

// PUT /api/counter/settings — Update WhatsApp reminder settings
router.put('/settings', auth, verifyIsCounter, async (req, res) => {
    try {
        const { reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled, reminder_max_business_day } = req.body;
        
        const result = await pool.query(
            `INSERT INTO accounting_office_settings (office_id, reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled, reminder_max_business_day, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (office_id) DO UPDATE SET
                reminder_whatsapp_hour = EXCLUDED.reminder_whatsapp_hour,
                reminder_whatsapp_minute = EXCLUDED.reminder_whatsapp_minute,
                reminder_enabled = EXCLUDED.reminder_enabled,
                reminder_max_business_day = EXCLUDED.reminder_max_business_day,
                updated_at = NOW()
             RETURNING *`,
            [req.user.office_id, reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled, reminder_max_business_day]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});

module.exports = router;
