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

// GET /api/counter/companies — List companies associated with the office
router.get('/companies', auth, verifyIsCounter, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.id, c.cnpj, c.razao_social, u.name as owner_name, u.email as owner_email
             FROM cnpjs c
             JOIN users u ON u.id = c.user_id
             WHERE u.office_id = $1 AND c.is_active = true
             ORDER BY c.razao_social`,
            [req.user.office_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar empresas' });
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
                reminder_enabled: true
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
        const { reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled } = req.body;
        
        const result = await pool.query(
            `INSERT INTO accounting_office_settings (office_id, reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (office_id) DO UPDATE SET
                reminder_whatsapp_hour = EXCLUDED.reminder_whatsapp_hour,
                reminder_whatsapp_minute = EXCLUDED.reminder_whatsapp_minute,
                reminder_enabled = EXCLUDED.reminder_enabled,
                updated_at = NOW()
             RETURNING *`,
            [req.user.office_id, reminder_whatsapp_hour, reminder_whatsapp_minute, reminder_enabled]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});

module.exports = router;
