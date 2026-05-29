const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db/connection');
const jwt = require('jsonwebtoken');

/** 
 * @route POST /api/auth/register
 * @desc Registrazione utente
 * @access public
 */
router.post('/register', async (req, res) => {
    const { first_name, last_name, email, password } = req.body;
    // Controllo base dati in input
    if(!first_name || !last_name || !email || !password)
        return res.status(400).json({
            success: false,
            message: "Tutti i campi sono obligatori."
        });

    // Controllo base email
    if(!email.includes('@'))
        return res.status(400).json({
            success: false,
            message: "Indirizzo email non valido."
        });
    
    
    // Controllo base password
    if(password.length < 8)
        return res.status(400).json({
            success: false,
            message: 'Password troppo semplice.'
        });
    
    try {
        // Cifratura password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const query = 'INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)';
        await db.query(query, [first_name, last_name, email, passwordHash]);

        return res.status(201).json({
            success: true,
            message: 'Registrazione effettuata con successo.'
        });
    } catch(error) {
        if(error.code == 'ER_DUP_ENTRY') { // duplicate entry
            return res.status(400).json({
                success: false,
                message: 'Questo indirizzo email è già registrato.'
            });
        } 

        console.error('Errore registrazione utente: ' + error.stack);
        // fallback errore
        return res.status(500).json({
            success: false,
            message: 'Errore interno al server.'
        });
    }
});

/**
 * @route POST /api/auth/login
 * @desc Autenticazione utente, verifica password e generazione JWT
 * @access public
 */
router.post('/login', async (req, res) => {
    const {email, password} = req.body;
    if(!email || !password)
        return res.status(400).json({
            success: false,
            message: 'Dati di accesso incompleti'
        });
    
    try {
        const query = `
            SELECT u.id, u.first_name, u.last_name, u.password_hash, r.name AS role_name, r.is_admin AS is_admin
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.email = ? AND u.is_active = 1
        `;

        const [users] = await db.query(query, [email]);
        // Se array vuoto utente non trovato
        if(users.length == 0)
            return res.status(400).json({
                success: false,
                message: 'Credenziali non valide.'
            });
        
        const user = users[0];
        const matches = await bcrypt.compare(password, user.password_hash);
        if(!matches) // password errata
            return res.status(400).json({
                success: false,
                message: 'Credenziali non valide.'
            });

        // Generazione token JWT
        const payload = {
            id: user.id,
            roleName: user.role_name || 'Client',
            isAdmin: Boolean(user.is_admin)
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.cookie('token', token, {
            httpOnly: true, // impedisce al client di leggere il token, per sicurezza
            secure: false, // funziona solo in HTTPS (false per ora)
            maxAge: 1000 * 60 * 60 * 2 // durata di 2 ore
        });

        return res.json({
            success: true,
            message: 'Login effettuato con successo.',
            user: {
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role_name
            }
        });
    } catch(error) {
        console.log('Errore durante il login: ', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Errore interno del server.'
        });
    }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout utente, cancellazione token (cookie)
 * @access authenticated
 */
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({
        success: true,
        message: 'Logout effettuato con successo.'
    });
});

module.exports = router;