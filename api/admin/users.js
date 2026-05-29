const express = require('express');
const router = express.Router();
const db = require('../../db/connection');
const bcrypt = require('bcrypt');


/**
 * @route POST /api/admin/users
 * @desc Crea un nuovo utente
 * @access authenticated & admin
 */
router.post('/', async (req, res) => {
    const { first_name, last_name, email, password, role_id, is_active } = req.body;

    if(!first_name || !last_name || !email || !password || !role_id) {
        return res.status(400).json({
            success: false,
            message: "Impossibile creare l'utente: i campi nome, cognome, email, password e ruolo sono obbligatori."
        });
    }

    const activeStatus = is_active !== undefined ? is_active : true;

    const connection = await db.getConnection();
    try {

        // Hash pasword
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const insertQuery = `
            INSERT INTO users (first_name, last_name, email, password, role_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(insertQuery, [first_name, last_name, email, hashedPassword, role_id, activeStatus]);

        return res.status(201).json({
            success: true,
            message: "Utente creato con successo",
            user_id: result.insertId
        });
    } catch(error) {
        if(error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "Impossibile creare l'utente: esiste già un utente con questa email."
            });
        } else if(error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: "Impossibile creare l'utente: ruolo inesistente."
            });
        }
        console.error("Errore creazione utente: " + error.stack);
        res.status(500).json({
            success: false,
            message: "Errore interno al server."
        });
    } finally {
        connection.release();
    }
});


/**
 * @route PUT /api/admin/users/:id
 * @desc Modifica i dati di un utente esistente
 * @access authenticated & admin
 */
router.put('/:id', async (req, res) => {
    const userID = req.params.id;
    const { first_name, last_name, email, password, role_id, is_active } = req.body;

    if(!first_name || !last_name || !email || !role_id) {
        return res.status(400).json({
            success: false,
            message: "Impossibile modificare l'utente: i campi nome, cognome, email e ruolo sono obbligatori."
        });
    }

    if(is_active === false && userID === req.user.id) {
        return res.status(400).json({
            success: false,
            message: "Impossibile modificare l'utente: non puoi disabilitare il tuo stesso utente"
        });
    }

    const connection = await db.getConnection();
    try {
        
        let query = `
            UPDATE users
            SET first_name = ?, last_name = ?, email = ?, role_id = ?
        `;
        const params = [first_name, last_name, email, role_id];
        

        if(password && password.trim() != '') {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        if(is_active !== undefined) {
            query += ', is_active = ?';
            params.push(is_active);
        }

        query += ' WHERE id = ?';
        params.push(userID);

        await connection.query(query, params);

        return res.json({
            success: true,
            message: "Utente modificato con successo."
        });
    } catch(error) {
        if(error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "Impossibile modificare l'utente: esiste già un utente con questa email."
            });
        } else if(error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: "Impossibile modificare l'utente: ruolo inesistente."
            });
        }
        console.error("Errore modifica utente: " + error.stack);
        res.status(500).json({
            success: false,
            message: "Errore interno al server."
        });
    } finally {
        connection.release();
    }
});


/**
 * @route DELETE /api/admin/users/id
 * @desc Elimina un utente dal sistema
 * @access authenticated & admin
 */
router.delete('/:id', async (req, res) => {
    const userID = req.params.id;

    if(userID === req.user.id) {
        return res.status(400).json({
            success: false,
            message: "Impossibile eliminare l'utente: non puoi eliminare il tuo stesso utente."
        });
    }
    
    const connection = await db.getConnection();
    try {
        const [result] = await connection.query('DELETE FROM users WHERE id = ?', [userID]);
        if(result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Impossibile eliminare l'utente: utente inesistente."
            });
        }

        return res.json({
            success: true,
            message: 'Utente eliminato con successo.'
        });
    } catch(error) {
        if(error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                success: false,
                message: "Impossibile eliminare l'utente: sono presenti ticket associati. Procedere con la disabilitazione dell'utente."
            });
        }
        console.log('Errore cancellazione utente: ' + error.stack);
        return res.status(500).json({
            success: false,
            message: 'Errore interno al server'
        });
    } finally {
        connection.release();
    }
});


/**
 * @route GET /api/admin/users
 * @desc Recupera la lista di tutti gli utenti
 * @access authenticated & admin 
*/
router.get('/', async (req, res) => {
    let { page, search } = req.query;
    page = page ? parseInt(page) : 1;

    const limit = 10; // limitato a 10 utenti alla volta
    const offset = (page - 1) * limit;

    const connection = await db.getConnection();
    try {

        let query = `
            SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at, r.name AS role_name
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
        `;
        const params = [];

        if(search && search.trim() !== '') { // search bar
            query += " WHERE u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?";
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const [users] = await connection.query(query, params);

        return res.json({
            success: true,
            message: "Lista utenti recuperata con successo.",
            page: page,
            count: users.length,
            users: users
        });
    } catch(error) {
        console.error("Errore recupero utenti: " + error.stack);
        res.status(500).json({
            success: false,
            message: "Errore interno al server."
        });
    } finally {
        connection.release();
    }
});

module.exports = router;