const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const presenceService = require('../services/presenceService');
const emailService = require('../services/emailService');

/**
 * @route GET /api/messages/ticket/:id
 * @desc Recupera la cronologia dei messaggi pubblici di un ticket
 * @access authenticated
 */
router.get('/ticket/:id', async (req, res) => {
    const ticketId = req.params.id;
    if (!ticketId)
        return res.status(400).json({
            success: false,
            message: "ID ticket mancante"
        });

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const minMessageId = parseInt(req.query.min_id) || 0;

    const connection = await db.getConnection();
    try {
        // Controllo diritti utente
        const checkQuery = 'SELECT client_id, operator_id FROM tickets WHERE id = ?';
        const [tickets] = await connection.query(checkQuery, [ticketId]);

        if (tickets.length === 0)
            return res.status(404).json({ success: false, message: "Ticket non trovato." });

        // Controllo che sia il proprietario (se è l'utente a richiederlo)
        if (req.user.roleName === 'Client' && tickets[0].client_id !== req.user.id)
            return res.status(403).json({ success: false, message: 'Non sei autorizzato a visualizzare questo ticket' });


        // Aggiorno LAST SEEN
        presenceService.updateLastSeen(req.user.id);

        let messagesQuery = `
            SELECT * FROM (
                SELECT tm.id, tm.message_text, tm.message_type, tm.created_at, tm.sender_id,
                       u.first_name, u.last_name, r.name AS role_name, r.id AS role_id
                FROM ticket_messages tm
                JOIN users u ON tm.sender_id = u.id
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE tm.ticket_id = ? AND tm.message_type != 'private' AND tm.id >= ?
        `;

        const queryParams = [ticketId, minMessageId];

        // Logica di sort e limitazione risultati
        messagesQuery += `
                ORDER BY tm.created_at DESC
                LIMIT ? OFFSET ?
            ) AS subquery
            ORDER BY created_at ASC;
        `;

        queryParams.push(limit, offset);

        const [messages] = await connection.query(messagesQuery, queryParams);

        return res.json({
            success: true,
            message: "Messaggi recuperati con successo",
            limit: limit,
            offset: offset,
            messages: messages
        });

    } catch (error) {
        console.error("Errore durante recupero messaggi: " + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server"
        });
    } finally {
        connection.release();
    }
});


/**
 * @route GET /api/messages/ticket/:id/private
 * @desc Recupera le note private di un ticket
 * @access authenticated
 */
router.get('/ticket/:id/private', async (req, res) => {
    const ticketId = req.params.id;
    if (!ticketId)
        return res.status(400).json({
            success: false,
            message: "ID ticket mancante"
        });

    // Controllo che l'utente non sia un Client
    if (req.user.roleName === 'Client')
        return res.status(403).json({ success: false, message: 'Non sei autorizzato a visualizzare le note private.' });

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const minMessageId = parseInt(req.query.min_id) || 0;

    const connection = await db.getConnection();
    try {
        // Controllo esistenza ticket
        const checkQuery = 'SELECT id FROM tickets WHERE id = ?';
        const [tickets] = await connection.query(checkQuery, [ticketId]);

        if (tickets.length === 0)
            return res.status(404).json({ success: false, message: "Ticket non trovato." });

        const messagesQuery = `
            SELECT * FROM (
                SELECT tm.id, tm.message_text, tm.message_type, tm.created_at, tm.sender_id,
                       u.first_name, u.last_name, r.name AS role_name, r.id AS role_id
                FROM ticket_messages tm
                JOIN users u ON tm.sender_id = u.id
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE tm.ticket_id = ? AND tm.message_type = 'private' AND tm.id >= ?
                ORDER BY tm.created_at DESC
                LIMIT ? OFFSET ?
            ) AS subquery
            ORDER BY created_at ASC;
        `;

        const queryParams = [ticketId, minMessageId, limit, offset];

        const [messages] = await connection.query(messagesQuery, queryParams);

        return res.json({
            success: true,
            message: "Note private recuperate con successo",
            limit: limit,
            offset: offset,
            messages: messages
        });

    } catch (error) {
        console.error("Errore durante recupero note private: " + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server"
        });
    } finally {
        connection.release();
    }
});


/**
 * @route POST /api/messages/ticket/:id
 * @desc Aggiunge un nuovo messaggio ad una chat
 * @access authenticated
 */
router.post('/ticket/:id', async (req, res) => {
    const ticketId = req.params.id;
    let { message_text, message_type } = req.body;

    if (!message_text || message_text.trim() === '')
        return res.status(400).json({ success: false, message: 'Il testo del messaggio non può essere vuoto.' });

    if (!message_type || req.user.roleName == 'Client')
        message_type = 'default';

    const connection = await db.getConnection();
    try {
        // Controllo stato ticket
        const query = `
            SELECT t.status, t.client_id, u.first_name AS client_first_name, u.email AS client_email, t.title
            FROM tickets t
            LEFT JOIN users u ON u.id = t.client_id
            WHERE t.id = ?    
        `
        const [tickets] = await connection.query(query, [ticketId]);
        if (tickets.length == 0)
            return res.status(400).json({ success: false, message: 'Ticket inesistente.' });
        if (tickets[0].status === 'archived' || tickets[0].status === 'resolved')
            return res.status(400).json({ success: false, message: 'Impossibile rispondere: questo ticket è chiuso.' });

        // verifico che sia il proprietario
        if (req.user.roleName === 'Client' && tickets[0].client_id != req.user.id)
            return res.status(403).json({ success: false, message: 'Impossibile rispondere: non sei autorizzato ad accedere a questo ticket.' });

        const insertQuery = `
            INSERT INTO ticket_messages (ticket_id, sender_id, message_text, message_type)
            VALUES (?, ?, ?, ?)
        ` ;
        const [result] = await connection.query(insertQuery, [ticketId, req.user.id, message_text, message_type]);
        // Invio mail solo se messaggio non privato e ad inviare il messaggio non è il proprietario del ticket
        if (message_type !== 'private' && tickets[0].client_id !== req.user.id) {
            if (!presenceService.isOnline(tickets[0].client_id)) { // Invio solo se l'utente non è "online" (non sta guardando attivamente il ticket)
                const ticketUrl = `http://${process.env.URL}:${process.env.PORT}/ticket/${ticketId}`;
                emailService.sendNewMessageNotification(
                    tickets[0].client_email,
                    tickets[0].client_first_name,
                    `${req.user.first_name} ${req.user.last_name}`,
                    ticketId,
                    tickets[0].title,
                    message_text,
                    new Date(),
                    ticketUrl
                )
            }
        }

        return res.status(201).json({
            success: true,
            message: (message_type != 'private' ? 'Messaggio inviato con successo.' : 'Nota privata aggiunta con successo.'),
            message_id: result.insertId
        });
    } catch (error) {
        console.error("Errore durante l'invio del messaggio: " + error.stack);
        return res.status(500).json({
            success: false,
            message: 'Errore interno del server.'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;