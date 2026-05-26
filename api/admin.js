const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * @route POST /api/admin/roles
 * @desc Crea un nuovo ruolo e associa categorie corrispondenti
 * @access authenticated & admin
 */
router.post('/roles', async (req, res) => {
    const { name, category_ids } = req.body;

    // Validazione input
    if(!name || name.trim() === '')
        res.status(400).json({
            success: false,
            message: 'Operazione fallita: Nome ruolo mancante.'
        });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const roleQuery = 'INSERT INTO roles (name) VALUES (?)';
        const [roleResult] = await connection.query(roleQuery, [name]);
        const newRoleID = roleResult.insertId;

        // Verifico Array categorie
        if(Array.isArray(category_ids) && category_ids.length > 0) {
            const records = category_ids.map(catId => [newRoleID, catId]);
            const query = 'INSERT INTO roles_categories (role_id, category_id) VALUES ?';
            await connection.query(query, [records]); // Insert Bulk di più oggetti contemporaneamente.
        }

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Ruolo ' + name + ' creato con successo.',
            role_id: newRoleID
        });
    } catch(error) {
        await connection.rollback();
        console.error('Errore creazione Ruolo: ' + error.stack);
        res.status(400).json({
            success: false,
            message: 'Errore interno al server.'
        });
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/admin/roles/:id
 * @desc Modifica un ruolo e le categorie associate
 * @access authenticated & admin
 */
router.put('/roles/:id', async (req, res) => {
    const roleID = req.params.id;
    const { name, category_ids } = req.body;

    if(!name || name.trim() === '')
        return res.status(400).json({success: false, message: 'Impossibile modificare il ruolo: nessun nome specificato.'});

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const updateRoleQuery = 'UPDATE roles SET name = ? WHERE id = ?';
        await connection.query(updateRoleQuery, [roleID, name]);

        // Elimino tutte le associazioni ruolo-categoria
        const deleteQuery = 'DELETE FROM role_categories WHERE role_id = ?';
        await connection.query(deleteQuery, [roleID]);

        if(Array.isArray(category_ids) && category_ids.length !== 0) {
            const records = category_ids.map(catID => [roleID, catID]);
            const insertQuery = 'INSERT INTO role_categories (role_id, category_id) VALUES ?';
            await connection.query(insertQuery, records);
        }

        connection.commit();
        res.status(200).json({
            success: true,
            message: 'Ruolo e categorie associate aggiornati con successo.'
        });
    } catch(error) {
        await connection.rollback();
        if(error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Impossibile aggiornare il ruolo: Esiste già un ruolo con lo stesso nome.'
            });
        }

        console.error('Impossibile aggiornare il ruolo: ' + error.stack);
        res.status(500).json({
            success: false,
            message: 'Errore interno al server'
        });
    } finally {
        connection.release();
    }
});


/**
 * @route DELETE /api/admin/roles/:id
 * @desc Elimina un ruolo dal sistema
 * @access authenticated & admin
 */
router.delete('/roles/:id', async (req, res) => {
    const roleID = req.params.id;
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Controllo se ci sono utenti associati al ruolo
        const [userCheck] = await connection.query('SELECT id FROM users WHERE role_id = ? LIMIT 1', [roleID]);
        if(userCheck.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Impossibile eliminare il ruolo: ci sono ancora utenti associati.'
            });
        }

        await connection.query('DELETE FROM role_categories WHERE role_id = ?', [roleID]);
        await connection.query('DELETE FROM roles WHERE role_id = ?', [roleID]);

        await connection.commit();
        return res.json({
            success: true,
            message: 'Ruolo eliminato con successo.'
        });

    } catch(error) {
        await connection.rollback();
        console.log('Errore cancellazione ruolo: ' + error.stack);
        return res.status(500).json({
            success: false,
            message: 'Errore interno al server'
        });
    } finally {
        connection.release();
    }
});





module.exports = (
    router
);