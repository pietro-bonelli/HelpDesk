const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db/connection');

/**
 * @route GET /api/users/me
 * @desc Restituisce informazioni sull'utente autenticato
 * @access authenticated
 */
router.get('/me', async (req, res) => {
    const userID = req.user.id;
    if(userID === undefined) {
        return res.status(404).json({
            success: false,
            message: "Utente non trovato."
        });
    }

    const connection = await db.getConnection();
    try {
        const query = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.created_at, r.name AS role_name, r.is_admin
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = ? AND u.is_active = 1
        `;

        const [result] = await connection.query(query, [userID]);
        if(result.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Utente non trovato."
            });
        }

        return res.json({
            success: true,
            message: "Profilo utente recuperato con successo.",
            user: result[0]
        });
    } catch(error) {
        console.error("Errore recupero profilo utente: " + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server"
        });
    } finally {
        connection.release();
    }
});


/**
 * @route PUT /api/users/me
 * @desc Aggiorna dati utente
 * @access authenticated
 */
router.put('/me', async (req, res) => {
    const userID = req.user.id;
    if(userID === undefined) {
        return res.status(404).json({
            success: false,
            message: "Utente non trovato"
        });
    }

    const { first_name, last_name, email } = req.body;
    if(!first_name && !last_name && !email) {
        return res.status(400).json({
            success: false,
            message: "Impossibile aggiornare il profilo: nessuna modifica specificata."
        });
    }

    if(email !== undefined && !email.includes('@')) {
        return res.status(400).json({
            success: false,
            message: "Impossibile aggiornare il profilo: formato email non valido."
        });
    }

    const connection = await db.getConnection();
    try {
        let query = `
            UPDATE users SET 
        `;

        const params = [];
        const setRecords = [];

        if(first_name !== undefined) {
            setRecords.push('first_name = ?');
            params.push(first_name);
        }
        if(last_name !== undefined) {
            setRecords.push('last_name = ?');
            params.push(last_name);
        } 
        if(email !== undefined) {
            setRecords.push('email = ?');
            params.push(email);
        }

        query += setRecords.join(', ');
        query += ' WHERE id = ? AND is_active = 1';
        params.push(userID);

        const [result] = await connection.query(query, params);
        if(result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Utente non trovato"
            });
        }

    } catch(error) {
        console.error("Errore aggiornamento profilo: " + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server"
        });
    } finally {
        connection.release();
    }

});


/**
 * @route PUT /api/users/me/password
 * @desc Modifica password personale
 * @access authenticated
 */
router.put('/me/password', async (req, res) => {
    const userID = req.user.id;
    const { old_password, new_password } = req.body;
    if(!old_password || !new_password) {
        return res.status(400).json({
            success: false,
            message: "Impossibile modificare la password: informazioni incomplete."
        });
    }

    if(old_password === new_password) {
        return res.status(400).json({
            success: false,
            message: "Impossibile modificare la password: la nuova password non può essere uguale a quella vecchia."
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [user] = await connection.query('SELECT password_hash FROM users WHERE id = ? AND is_active = 1', [userID]);

        if(user.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Impossibile modificare la password: utente non trovato"
            });
        }      
        
        const currentPasswordHash = user[0].password_hash;
        if(!(await bcrypt.compare(old_password, currentPasswordHash))) {
            await connection.rollback();
            return res.status(401).json({
                success: false,
                message: "Impossibile modificare la password: la password inserita non è corretta."
            });
        }

        const saltRounds = 10;
        const newPasswordHash = bcrypt.hash(new_password, saltRounds);

        await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userID]);
        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Password modificata con successo."
        });
    } catch(error) {
        await connection.rollback();
        console.error("Errore modifica password utente: " + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server"
        });
    } finally {
        connection.release();
    }
})


module.exports = router;