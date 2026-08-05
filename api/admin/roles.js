const express = require('express');
const router = express.Router();
const db = require('../../db/connection');
const { parse } = require('node:path');

/**
 * @route POST /api/admin/roles
 * @desc Crea un nuovo ruolo e associa categorie corrispondenti
 * @access authenticated & admin
 */
router.post('/', async (req, res) => {
    const { name, description, category_ids, is_admin } = req.body;

    // Validazione input
    if (!name || name.trim() === '')
        return res.status(400).json({
            success: false,
            message: 'Operazione fallita: Nome ruolo mancante.'
        });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const roleQuery = 'INSERT INTO roles (name, description, is_admin) VALUES (?, ?, ?)';
        const isAdmin = is_admin === true ? true : false;
        const [roleResult] = await connection.query(roleQuery, [name, description, isAdmin]);
        const newRoleID = roleResult.insertId;

        // Verifico Array categorie
        if (Array.isArray(category_ids) && category_ids.length > 0) {
            const records = category_ids.map(catId => [newRoleID, catId]);
            const query = 'INSERT INTO role_categories (role_id, category_id) VALUES ?';
            await connection.query(query, [records]); // Insert Bulk di più oggetti contemporaneamente.
        }

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Ruolo ' + name + ' creato con successo.',
            role_id: newRoleID
        });
    } catch (error) {
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
router.put('/:id', async (req, res) => {
    const roleID = req.params.id;
    const { name, description, category_ids, is_admin } = req.body;

    if (!name || name.trim() === '' || !description || description.trim() === '')
        return res.status(400).json({ success: false, message: 'Impossibile modificare il ruolo: nessun nome o descrizione specificati.' });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const params = [name, description];
        let updateRoleQuery = 'UPDATE roles SET name = ?, description = ?';
        if (is_admin === true || is_admin === false) {
            updateRoleQuery += ", is_admin = ?";
            params.push(is_admin);
        }
        updateRoleQuery += " WHERE id = ?";
        params.push(roleID);
        await connection.query(updateRoleQuery, params);

        // Elimino tutte le associazioni ruolo-categoria
        const deleteQuery = 'DELETE FROM role_categories WHERE role_id = ?';
        await connection.query(deleteQuery, [roleID]);

        if (Array.isArray(category_ids) && category_ids.length !== 0) {
            const records = category_ids.map(catID => [roleID, catID]);
            const insertQuery = 'INSERT INTO role_categories (role_id, category_id) VALUES ?';
            await connection.query(insertQuery, [records]);
        }

        connection.commit();
        res.status(200).json({
            success: true,
            message: 'Ruolo e categorie associate aggiornati con successo.'
        });
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
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
router.delete('/:id', async (req, res) => {
    const roleID = req.params.id;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query('DELETE FROM role_categories WHERE role_id = ?', [roleID]);
        await connection.query('DELETE FROM roles WHERE id = ?', [roleID]);

        await connection.commit();
        return res.json({
            success: true,
            message: 'Ruolo eliminato con successo.'
        });

    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_ROW_IS_REFERENCED_2') { // ci sono utenti associati al ruolo
            return res.status(409).json({
                success: false,
                message: 'Impossibile eliminare il ruolo: ci sono ancora utenti associati.'
            });
        }
        console.log('Errore cancellazione ruolo: ' + error.stack);
        return res.status(500).json({
            success: false,
            message: 'Errore interno al server'
        });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/admin/roles
 * @desc Restituisce informazioni su tutti i ruoli
 * @access authenticated & admin
 */
router.get('/', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const rolesQuery = `
            SELECT r.id AS role_id, r.name AS role_name, r.description AS role_description, r.is_admin, c.id AS category_id, c.name AS category_name
            FROM roles r
            LEFT JOIN role_categories rc ON r.id = rc.role_id
            LEFT JOIN categories c ON rc.category_id = c.id
        `;
        const [rows] = await connection.query(rolesQuery);

        const rolesMap = {};
        for (const row of rows) {
            if (!rolesMap[row.role_id]) {
                rolesMap[row.role_id] = {
                    id: row.role_id,
                    name: row.role_name,
                    description: row.role_description,
                    is_admin: row.is_admin,
                    categories: []
                };
            }
            if (row.category_id !== null) {
                rolesMap[row.role_id].categories.push({
                    id: row.category_id,
                    name: row.category_name,
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Ruoli recuperati con successo.",
            roles: Object.values(rolesMap) // trasormazione Mappa -> Array
        });
    } catch (error) {
        console.log('Errore recupero ruoli: ' + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server"
        });
    } finally {
        connection.release();
    }
});

module.exports = router;