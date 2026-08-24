const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { getCategoryIdsByRole } = require('../services/dbServices');
const { getCategoryPaths } = require('../services/categoryService');
const emailService = require('../services/emailService');
const presenceService = require('../services/presenceService');
const { sanitizeHTML } = require('../utils/sanitize');

/**
 * @route POST /api/tickets
 * @desc Creazione di un nuovo ticket
 * @access authenticated
 */
router.post('/', async (req, res) => {
    const { title, priority, category_id, message_text } = req.body;
    if (!title || !priority || !category_id || !message_text)
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
        if (checkCategory.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Categoria inesistente o non abilitata.'
            });
        }


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
        await connection.query(messageQuery, [ticketId, req.user.id, sanitizeHTML(message_text)]);

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Ticket creato con successo.',
            ticket_id: ticketId
        });
    } catch (error) {
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
    const { title, status, priority, category_id, operator_id } = req.body;

    if (title === undefined && status === undefined && priority === undefined && category_id === undefined && operator_id === undefined) {
        return res.status(400).json({
            success: false,
            message: "Impossibile modificare il ticket: nessun dato specificato."
        });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const selectQuery = `
            SELECT u.id AS client_id, u.first_name AS client_first_name, u.last_name AS client_last_name, u.email AS client_email, t.title AS ticket_title, t.status AS ticket_old_status
            FROM tickets t
            LEFT JOIN users u ON t.client_id = u.id
            WHERE t.id = ?
        `;
        const [selectRes] = await connection.query(selectQuery, [ticketID]);
        const selectResult = selectRes[0];

        let query = "UPDATE tickets SET ";
        const params = [];
        const setStatements = [];

        if (title !== undefined) {
            setStatements.push('title = ?');
            params.push(title);
        }
        if (status !== undefined && (req.user.roleName !== 'Client' || (status === 'resolved' || status === 'archived'))) {
            setStatements.push('status = ?');
            params.push(status);
        }
        if (priority !== undefined) {
            setStatements.push('priority = ?');
            params.push(priority);
        }
        if (category_id !== undefined) {
            setStatements.push('category_id = ?');
            params.push(category_id);
        }
        if (operator_id !== undefined && req.user.roleName !== 'Client') {
            setStatements.push('operator_id = ?');
            params.push(operator_id);
        }

        if (setStatements.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: "Impossibile modificare il ticket: nessun dato valido fornito o permessi insufficienti."
            });
        }

        query += setStatements.join(', ');
        query += " WHERE id = ?";
        params.push(ticketID);

        const [result] = await connection.query(query, params);
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Impossibile modificare il ticket: ticket non trovato."
            });
        }

        if (status && !presenceService.isOnline(selectResult.client_id) && selectResult.client_id !== req.user.id) {
            const ticketUrl = `http://${process.env.URL}:${process.env.PORT}/ticket/${ticketID}`;

            emailService.sendStatusChangeNotification(
                selectResult.client_email,
                selectResult.client_first_name,
                `${req.user.first_name} ${req.user.last_name}`,
                ticketID,
                selectResult.ticket_title,
                selectResult.ticket_old_status,
                status,
                ticketUrl
            );
        }

        await connection.commit();
        return res.json({
            success: true,
            message: "Ticket modificato con successo."
        });

    } catch (error) {
        await connection.rollback();

        if (error.code === "ER_NO_REFERENCED_ROW") {
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
 * @route GET /api/tickets/operator/stats
 * @desc Recupera statistiche sui ticket per un operatore
 * @access authenticated
 */
router.get('/operator/stats', async (req, res) => {
    if (req.user.roleName === 'Client')
        return res.status(403).json({ success: false, message: 'Accesso negato: area riservata agli operatori.' });

    const connection = await db.getConnection();
    try {
        const categories = await getCategoryIdsByRole(connection, req.user.roleName, req.user.isAdmin);
        const categoryIds = categories.map(cat => cat.category_id);

        if (categoryIds.length === 0)
            return res.json({ success: true, message: "Nessuna categoria abilitata.", stats: [] });

        const query = `
            SELECT status, COUNT(*) AS count
            FROM tickets
            WHERE category_id IN (?)
            GROUP BY status
        `;

        const [result] = await connection.query(query, [categoryIds]);

        return res.status(200).json({
            success: true,
            message: "Statistiche recuperate con successo.",
            stats: result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Si è verificato un errore interno al server."
        });
    } finally {
        connection.release();
    }
});

/**
 * @route GET /api/tickets/my/stats
 * @desc Recupera statistiche sui ticket di un utente
 * @access authenticated
 */
router.get('/my/stats', async (req, res) => {
    const query = 'SELECT status, COUNT(*) AS count FROM tickets WHERE client_id = ? GROUP BY status';

    const conn = await db.getConnection();
    try {
        const [result] = await conn.query(query, [req.user.id]);

        return res.status(200).json({
            success: true,
            message: "Statistiche recuperate con successo.",
            stats: result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Si è verificato un errore interno al server."
        });
    } finally {
        conn.release();
    }
});

/**
 * @route GET /api/tickets/my
 * @desc Recupera i ticket di un utente
 * @access authenticated
 */
router.get('/my', async (req, res) => {
    let { page, limit, status, sort, search } = req.query; // filtri/sorting opzionali
    // valori default
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    status = status ? status : 'all';
    sort = sort ? sort : 'desc';
    search = search ? search.trim() : '';

    const offset = limit * (page - 1);

    let filterQuery = ' WHERE t.client_id = ?';
    const filterParams = [req.user.id];

    if (status != 'all') {
        filterQuery += ' AND t.status = ?'
        filterParams.push(status);
    }

    if (search !== '') {
        filterQuery += ' AND t.title LIKE ?';
        filterParams.push(`%${search}%`);
    }

    const connection = await db.getConnection();
    try {
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM tickets t
            ${filterQuery}
        `;
        const [countResult] = await connection.query(countQuery, filterParams);
        const totalCount = countResult[0].total;

        let dataQuery = `
            SELECT t.id, t.title, t.status, t.priority, t.created_at, t.category_id, c.name AS category_name
            FROM tickets t
            JOIN categories c on c.id = t.category_id
            ${filterQuery}
        `;


        // Sorting
        switch (sort.toLowerCase()) {
            case 'asc':
                dataQuery += ' ORDER BY t.created_at ASC';
                break;
            case 'priority':
                dataQuery += ` ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`;
                break;
            default:
                dataQuery += ' ORDER BY t.created_at DESC';
                break;
        }
        dataQuery += ` LIMIT ? OFFSET ?`
        const dataParams = [...filterParams, limit, offset];

        const [tickets] = await connection.query(dataQuery, dataParams);
        for (const ticket of tickets) {
            const { category_ids, category_names } = getCategoryPaths(ticket.category_id);
            ticket.category_ids = category_ids;
            ticket.category_names = category_names;
        }

        return res.json({
            success: true,
            message: 'Ticket recuperati con successo.',
            tickets: tickets,
            totalCount: totalCount
        });
    } catch (error) {
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
    if (req.user.roleName === 'Client')
        return res.status(403).json({ success: false, message: 'Accesso negato: area riservata agli operatori.' });

    let { page, status, search } = req.query;
    page = (page ? parseInt(page) : 1);
    status = (status ? status : 'pending'); // di default si vedono solo i ticket in attesa
    search = search ? search.trim() : '';

    const limit = 15; // Carico 15 ticket alla volta
    const offset = limit * (page - 1);

    const connection = await db.getConnection();
    try {
        const categories = await getCategoryIdsByRole(connection, req.user.roleName, req.user.isAdmin);
        const categoryIds = categories.map(cat => cat.category_id);

        if (categoryIds.length === 0)
            return res.json({ success: true, message: "Nessuna categoria abilitata.", tickets: [] });

        let feedQuery = `
            SELECT t.id, t.title, t.status, t.priority, t.created_at, t.category_id, t.operator_id, c.name AS category_name, uc.first_name AS client_first_name, uc.last_name AS client_last_name, uo.first_name AS operator_first_name, uo.last_name AS operator_last_name
            FROM tickets t
            JOIN categories c ON t.category_id = c.id
            JOIN users uc ON t.client_id = uc.id
            LEFT JOIN users uo ON t.operator_id = uo.id
            WHERE t.category_id IN (?)
        `;

        const queryParams = [categoryIds];

        if (status !== 'all') {
            feedQuery += ' AND t.status = ?'
            queryParams.push(status);
        }

        if (search !== '') {
            feedQuery += ' AND t.title LIKE ?';
            queryParams.push(`%${search}%`);
        }

        feedQuery += `
            ORDER BY CASE WHEN t.status = 'pending' THEN 1 WHEN t.operator_id = ? THEN 2 ELSE 3 END, t.created_at DESC
            LIMIT ? OFFSET ?
        `;

        queryParams.push(req.user.id);
        queryParams.push(limit, offset);
        const [tickets] = await connection.query(feedQuery, queryParams);

        for (const ticket of tickets) {
            const { category_names } = getCategoryPaths(ticket.category_id);
            ticket.category_names = category_names;
        }

        return res.json({
            success: true,
            message: "Feed recuperato con successo.",
            tickets: tickets
        });
    } catch (error) {
        console.log("Errore caricamento feed operatore: " + error.stack);
        return res.status(500).json({ success: false, message: "Errore interno del server." });
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
        const [categories] = await connection.query("SELECT id, name, parent_id FROM categories WHERE is_active = 1");

        // Mappa base
        const categoryMap = {};
        for (const cat of categories) {
            categoryMap[cat.id] = {
                id: cat.id,
                name: cat.name,
                parent_id: cat.parent_id,
                children: []
            };
        }

        // Costruisco albero
        const rootCategories = [];
        for (const cat of categories) {
            const current = categoryMap[cat.id];
            if (current.parent_id === null) // è categoria padre
                rootCategories.push(current);
            else {
                const parent = categoryMap[cat.parent_id]; // Funziona grazie ai passaggi per riferimento
                if (parent) // Se il padre è disattivato, non mostro neanche i figli
                    parent.children.push(current);
            }
        }

        return res.json({
            success: true,
            message: "Categorie recuperate con successo",
            categories: rootCategories
        });
    } catch (error) {
        console.error("Errore recupero categorie: " + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server."
        });
    } finally {
        connection.release();
    }
});


/**
 * @route GET /api/tickets/:id
 * @desc Recupera le informazioni di un singolo ticket
 * @access authenticated
 */
router.get('/:id', async (req, res) => {
    const ticketId = req.params.id;
    const connection = await db.getConnection();

    try {
        const query = `
            SELECT t.id, t.title, t.status, t.priority, t.created_at, t.updated_at, t.category_id, t.client_id, uc.first_name AS client_first_name, uc.last_name AS client_last_name, t.operator_id, uo.first_name AS operator_first_name, uo.last_name AS operator_last_name, c.name AS category_name, r.stars AS rating_stars, r.comment AS rating_comment
            FROM tickets t
            JOIN categories c ON c.id = t.category_id
            JOIN users uc ON uc.id = t.client_id
            LEFT JOIN users uo ON uo.id = t.operator_id
            LEFT JOIN ratings r ON r.ticket_id = t.id
            WHERE t.id = ?
        `;
        const [tickets] = await connection.query(query, [ticketId]);

        if (tickets.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ticket non trovato.'
            });
        }

        const ticket = tickets[0];

        // Sicurezza: se l'utente è un Client, può vedere solo i suoi ticket
        if (req.user.roleName === 'Client') {
            if (ticket.client_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso negato: non sei autorizzato a visualizzare questo ticket.'
                });
            }
        } else if (!req.user.isAdmin) {
            // Operatore: controlliamo le sue categorie
            const operatorCats = await getCategoryIdsByRole(connection, req.user.roleName, req.user.isAdmin);
            const operatorCatIds = operatorCats.map(c => c.category_id);
            if (!operatorCatIds.includes(ticket.category_id)) {
                return res.status(403).json({
                    success: false,
                    message: 'Accesso negato: non sei autorizzato a visualizzare questo ticket.'
                });
            }
        }

        const { category_ids, category_names } = getCategoryPaths(ticket.category_id);
        ticket.category_ids = category_ids;
        ticket.category_names = category_names;

        return res.json({
            success: true,
            message: 'Ticket recuperato con successo.',
            ticket: ticket
        });
    } catch (error) {
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
 * @route POST /api/tickets/:id/rating
 * @desc Invia valutazione per un ticket
 * @access authenticated
 */
router.post('/:id/rating', async (req, res) => {
    const ticketId = req.params.id;
    if (!ticketId) {
        return res.status(400).json({
            success: false,
            message: 'Non è stato specificato nessun ticket.'
        });
    }
    const { stars, comment } = req.body;
    if (!stars) {
        return res.status(400).json({
            success: false,
            message: 'È necessario specificare le stelle'
        });
    }

    const conn = await db.getConnection();
    try {
        const query = `
            INSERT INTO ratings (ticket_id, stars, comment)
            VALUES (?, ?, ?)
        `;

        await conn.query(query, [ticketId, stars, comment === undefined ? null : comment]);

        return res.status(200).json({
            success: true,
            message: 'Valutazione inviata con successo.'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Hai già inviato una valutazione per questo ticket.'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Si è verificato un problema interno al server'
        });
    } finally {
        conn.release();
    }
});

module.exports = router;