const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { getCategoryIdsByRole } = require('../services/dbServices');

/**
 * @route POST /api/tickets
 * @desc Creazione di un nuovo ticket
 * @access authenticated
 */
router.post('/', async (req, res) => {
    const { title, priority, category_id, message_text } = req.body;
    if(!title || !priority || !category_id || !message_text)
        return res.status(400).json({
            success: false,
            message: 'Campi mancanti.'
        });
    
    // Ottiene connessione dedicata dal pool
    const connection = await db.getConnection();
    try {
        // faccio una transazione per essere sicuro che tutto venga eseguito (o tutto venga rigettato)
        await connection.beginTransaction();

        const [checkCategory] = await connection.query('SELECT id FROM categories WHERE id = ? AND is_active = 1', [category_id]);
        if(checkCategory.length === 0)
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Categoria inesistente o non abilitata.'
            });


        const ticketQuery = `
            INSERT INTO tickets (title, priority, client_id, category_id)
            VALUES (?, ?, ?, ?)
        `;
        const [result] = await connection.query(ticketQuery, [title, priority, req.user.id, category_id]);
        const ticketId = result.insertId;

        const messageQuery = `
            INSERT INTO ticket_messages (ticket_id, sender_id, message_text)
            VALUES (?, ?, ?)
        `;
        await connection.query(messageQuery, [ticketId, req.user.id, message_text]);

        await connection.commit();
        
        return res.status(201).json({
            success: true,
            message: 'Ticket creato con successo.',
            ticket_id: ticketId
        });
    } catch(error) {
        // Errore -> faccio rollback
        await connection.rollback();
        console.error('Errore creazione ticket:' + error.stack);
        return res.status(500).json({
            success: false,
            message: 'Errore interno al server.'
        });
    } finally {
        // Libero la connessione sia che vada bene sia che vada male.
        connection.release();
    }
});


/**
 * @route PUT /api/tickets/:id
 * @desc Modifica un ticket esistente
 * @access authenticated
 */
router.put('/:id', async (req, res) => {
    const ticketID = req.params.id;
    const { status, priority, category_id } = req.body;

    if(status === undefined && priority === undefined && category_id === undefined) {
        return res.status(400).json({
            success: false,
            message: "Impossibile modificare il ticket: nessun dato specificato."
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let query = "UPDATE tickets SET ";
        const params = [];
        const setStatements = [];

        if(status !== undefined) {
            setStatements.push('status = ?');
            params.push(status);
        }
        if(priority !== undefined) {
            setStatements.push('priority = ?');
            params.push(priority);
        }
        if(category_id !== undefined) {
            setStatements.push('category_id = ?');
            params.push(category_id);
        }

        query += setStatements.join(', ');
        query += " WHERE id = ?";
        params.push(ticketID);

        const [result] = await connection.query(query, params);
        if(result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Impossibile modificare il ticket: ticket non trovato."
            });
        }

        return res.json({
            success: true,
            message: "Ticket modificato con successo."
        });

    } catch(error) {
        if(error.code === "ER_NO_REFERENCED_ROW") {
            return res.status(400).json({
                success: false,
                message: "Impossibile modificare il ticket: categoria inesistente."
            });
        }

        console.error("Errore modifica ticket: " + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server."
        
        });
    } finally {
        connection.release();
    }
});


/**
 * @route GET /api/tickets/my
 * @desc Recupera i ticket di un utente
 * @access authenticated
 */
router.get('/my', async (req, res) => {
    let { page, status, sort } = req.query; // filtri/sorting opzionali
    // valori default
    page = (page ? page : 1);
    status = (status ? status : 'all');
    sort = (sort ? sort : 'desc');

    const limit = 10; // 10 elementi per pagina
    const offset = limit * (page - 1);
    let query = `
        SELECT t.id, t.title, t.status, t.priority, t.created_at, c.name AS category_name
        FROM tickets t
        JOIN categories c on c.id = t.category_id
        WHERE t.client_id = ?
    `;

    const queryParams = [req.user.id];

    if(status != 'all') {
        query += ' AND t.status = ?'
        queryParams.push(status);
    }

    // Sorting
    switch(sort.toLowerCase()) {
        case 'asc':
            query += ' ORDER BY t.created_at ASC';
            break;
        case 'priority':
            query += ` ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`;
            break;
        default:
            query += ' ORDER BY t.created_at DESC';
            break;
    }

    query += ` LIMIT ? OFFSET ?`
    queryParams.push(limit, offset);

    const connection = await db.getConnection();
    try {
        const [tickets] = await connection.query(query, queryParams);
        return res.json({
            success: true,
            message: 'Ticket recuperati con successo.',
            tickets: tickets,
            count: tickets.length
        });
    } catch(error) {
        console.error('Errore recupero ticket: ' + error.stack);
        return res.status(500).json({
            success: false,
            message: 'Errore interno del server.'
        });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/tickets/feed
 * @desc Ottiene lista tickets destinati a operatori in base alle loro categorie abilitate
 * @access authenticated & authorized
 */
router.get('/feed', async (req, res) => {
    if(req.user.roleName === 'Client') 
        return res.status(403).json({success: false, message: 'Accesso negato: area riservata agli operatori.'});

    let { page, status } = req.query;
    page = (page ? page : 1);
    status = (status ? status : 'pending'); // di default si vedono solo i ticket in attesa

    const limit = 15; // Carico 15 ticket alla volta
    const offset = limit * (page - 1);

    const connection = await db.getConnection();
    try {
        const categories = await getCategoryIdsByRole(connection, req.user.roleName, req.user.isAdmin);
        const categoryIds = categories.map(cat => cat.category_id);

        if(categoryIds.length === 0)
            return res.json({success: true, message: "Nessuna categoria abilitata.", tickets:[]});

        let feedQuery = `
            SELECT t.id, t.title, t.status, t.priority, t.created_at, c.name AS category_name, u.first_name, u.last_name
            FROM tickets t
            JOIN categories c ON t.category_id = c.id
            JOIN users u ON t.client_id = u.id
            WHERE t.category_id IN (?)
        `;

        const queryParams = [categoryIds];

        if(status !== 'all') {
            feedQuery += ' AND t.status = ?'
            queryParams.push(status);
        }

        feedQuery += `
            ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
            t.created_at DESC
            LIMIT ? OFFSET ?
        `;

        queryParams.push(limit, offset);
        const [tickets] = await connection.query(feedQuery, queryParams);

        return res.json({
            success: true,
            page: page,
            count: tickets.length,
            tickets: tickets
        });
    } catch(error) {
        console.log("Errore caricamento feed operatore: " + error.stack);
        return res.status(500).json({success: false, message: "Errore interno del server."});
    } finally {
        connection.release();
    }
});


/**
 * @route GET /api/tickets/categories
 * @desc Restituisce la lista delle categorie attive organizzate ad albero
 * @access authenticated 
 */
router.get('/categories', async (req, res) => {
    const connection = await db.getConnection();
    try {
        const [categories] = await connection.query("SELECT id, name FROM categories WHERE is_active = 1");
        
        // Mappa base
        const categoryMap = {};
        for(const cat of categories) {
            categoryMap[cat.id] = {
                id: cat.id,
                name: cat.name,
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
                if(parent) // Se il padre è disattivato, non mostro neanche i figli
                    parent.children.push(current);
            }
        }

        return res.json({
            success: true,
            message: "Categorie recuperate con successo",
            categories: rootCategories
        });
    } catch(error) {
        console.error("Errore recupero categorie: " + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server."
        });
    } finally {
        connection.release();
    }
});


module.exports = router;