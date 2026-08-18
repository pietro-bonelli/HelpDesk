require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 
 * @param {request} req 
 * @param {response} res 
 * @param {import('express').NextFunction} next 
 * @returns 
 */
function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        if (req.originalUrl.startsWith('/api'))
            return res.status(401).json({ success: false, message: 'Token mancante, accesso non autorizzato.' }); // risponde JSON se richiesta API
        else
            return res.redirect(302, '/login'); // renderizza a homepage altrimenti.
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next(); // Token valido, continua l'esecuzione
    } catch (error) { // se token non valido
        res.clearCookie('token');
        if (req.path.startsWith('/api'))
            return res.status(401).json({ success: false, message: "Token non valido." });
        else
            return res.redirect(302, '/login.html');
    }
}

// reindirizza chi è autorizzato direttamente alla dashboard (invece che alla pagina di login)
function verifyAuthentication(req, res, next) {
    const token = req.cookies.token;
    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            return res.redirect(302, '/dashboard');
        } catch (error) {
            res.clearCookie('token'); // se non valido pulisco il cookie "token"
        }
    }
    next();
}

/**
 * Controllo ruolo
 * @param {Array<string>} allowedRoles 
 */
function hasRole(allowedRoles) {
    return (req, res, next) => {
        // Verifica che sia passato per authenticateToken
        if (!req.user || !req.user.roleName) {
            return res.status(401).json({ success: false, message: 'Autenticazione mancante.' });
        }

        if (req.user.isAdmin || allowedRoles.includes(req.user.roleName))
            return next();

        return res.status(403).json({
            success: false,
            message: 'Accesso negato: permessi insufficienti.'
        });
    }
}

function isAdmin(req, res, next) {
    const responseType = req.accepts(['html', 'json']);


    if (!req.user) {
        if (responseType === 'html')
            return res.redirect(302, '/index.html');
        return res.status(401).json({ success: false, message: 'Autenticazione mancante.' });
    }

    if (req.user.isAdmin)
        return next();

    if (responseType === 'html')
        return res.redirect(302, '/index.html');
    return res.status(403).json({
        success: false,
        message: 'Accesso negato: permessi insufficienti.'
    });
}

module.exports = {
    authenticateToken,
    verifyAuthentication,
    hasRole,
    isAdmin
}
