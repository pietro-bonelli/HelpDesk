const express = require('express');
const router = express.Router();
const db = require('../../db/connection');
const { parse } = require('node:path');

/**
 * @route POST /api/admin/categories
 * @desc Crea una nuova categoria
 * @access authenticated & admin
 */
router.post('/', async (req, res) => {
    let { name, parent_id, is_active } = req.body;
    if(!name || name.trim() === '')
        return res.status(400).json({success: false, message: "Impossibile creare la categoria: nome mancante"});

    const parentIdValue = parent_id ? parseInt(parent_id) : null;
    if(is_active === undefined)
        is_active = true;

    const connection = await db.getConnection();
    try {
        const query = "INSERT INTO categories (name, is_active, parent_id) VALUES (?, ?, ?)";
        const result = await connection.query(query, [name, is_active, parentIdValue]);
        
        return res.status(201).json({
            success: true,
            message: "Categoria creata con successo.",
            category_id: result.insertId
        });
    } catch(error) {
        if(error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "Impossibile creare la categoria: esiste già una categoria con lo stesso nome."
            });
        } else if(error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: "Impossibile creare la categoria: categoria padre inesistente."
            });
        } else {
            console.log("Errore creazione categoria: " + error.stack);
            res.status(500).json({
                success: false,
                message: "Errore interno al server."
            });
        }
    } finally {
        connection.release();
    }
});

/**
 * @route PUT /api/admin/categories/:id
 * @desc Modifica una categoria esistente
 * @access authenticated & admin
 */
router.put('/:id', async (req, res) => {
    const categoryID = req.params.id;
    let { name, parent_id, is_active } = req.body;

    if(!name || name.trim() === '')
        return res.status(400).json({success: false, message: "Impossibile modificare la categoria: nessun nome specificato."});

    const parentIdValue = parent_id ? parseInt(parent_id) : null;
    is_active = is_active === undefined ? true : is_active;

    if(parseInt(categoryID) === parentIdValue) {
        return res.status(400).json({
            success: false,
            message: "Impossibile modificare la categoria: una categoria non può essere padre di se stessa."
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.query('UPDATE categories SET name = ?, parent_id = ?, is_active = ? WHERE id = ?', [name, parentIdValue, is_active, categoryID]);

        res.json({
            success: true,
            message: "Categoria modificata con successo."
        });
    } catch(error) {
        if(error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: "Impossibile modificare la categoria: esiste già una categoria con lo stesso nome."
            });
        } else if(error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: "Impossibile modificare la categoria: categoria padre inesistente."
            });
        } else {
            console.log("Errore modifica categoria: " + error.stack);
            console.log("Errore modifica categoria: " + error.stack);
            res.status(500).json({
                success: false,
                message: "Errore interno al server."
            });
        }
    } finally {
        connection.release();
    }
});


/**
 * @route DELETE /api/admin/categories/:id
 * @desc Elimina una categoria dal sistema
 * @access authenticated & admin
 */
router.delete('/:id', async (req, res) => {
    const categoryID = req.params.id;
    
    const connection = await db.getConnection();
    try {
        connection.beginTransaction();
        
        await connection.query('DELETE FROM categories WHERE id = ?', [categoryID]);
        await connection.query('DELETE FROM role_categories WHERE category_id = ?', [categoryID]);

        connection.commit();

        return res.json({
            success: true,
            message: 'Categoria eliminata con successo.'
        });

    } catch(error) {
        connection.rollback();
        if(error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                success: false,
                message: 'Impossibile eliminare la categoria: ci sono ancora ticket o categorie associati.'
            });
        }
        console.log('Errore cancellazione categoria: ' + error.stack);
        return res.status(500).json({
            success: false,
            message: 'Errore interno al server'
        });
    } finally {
        connection.release();
    }
});


/**
 * @route GET /api/admin/categories
 * @desc Recupera la lista delle categorie organizzata ad albero
 * @access authenticated & admin
 */
router.get('/', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const [categories] = await connection.query("SELECT id, name, parent_id, is_active FROM categories");
        
        // Mappa base
        const categoryMap = {};
        for(const cat of categories) {
            categoryMap[cat.id] = {
                id: cat.id,
                name: cat.name,
                is_active: cat.is_active,
                parent_id: cat.parent_id,
                children: []
            };
        }

        // Costruisco albero
        const rootCategories = [];
        for(const cat of categories) {
            const current = categoryMap[cat.id];
            if(current.parent_id === null) // è categoria padre
                rootCategories.push(current);
            else {
                const parent = categoryMap[cat.parent_id]; // Funziona grazie ai passaggi per riferimento
                if(parent)
                    parent.children.push(current);
            }
        }

        return res.json({
            success: true,
            message: "Categorie recuperate con successo.",
            categories: rootCategories
        });
    } catch(error) {
        console.log("Errore recupero categorie:" + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server."
        });
    } finally {
        connection.release();
    }
});

module.exports = router;