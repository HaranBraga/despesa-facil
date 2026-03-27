const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token inválido' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Backfill type for tokens issued before the counters table migration
        if (!decoded.type) {
            if (decoded.is_admin) decoded.type = 'admin';
            else if (decoded.is_counter) decoded.type = 'counter';
            else decoded.type = 'user';
        }

        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Token expirado ou inválido' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.type !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    next();
}

function requireCounter(req, res, next) {
    if (req.user.type !== 'counter' || !req.user.office_id) {
        return res.status(403).json({ error: 'Acesso restrito a contadores vinculados a um escritório' });
    }
    next();
}

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.requireCounter = requireCounter;
