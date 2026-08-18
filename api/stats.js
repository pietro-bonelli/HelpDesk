const express = require('express');
const router = express.Router();
const db = require('../db/connection');

// Implementazione logica cache per evitare di effettuare la query ogni richiesta
let statsCache = null;
let lastCacheTime = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 ore in millisecondi

/**
 * @route GET /api/stats/public
 * @desc Restituisce dati aggregati pubblici
 * @access public
 */
router.get('/public', async (req, res) => {
    const now = Date.now();
    if (statsCache && now < lastCacheTime + CACHE_TTL_MS) {
        res.setHeader('X-Cache', 'HIT'); // imposto header per informare che si tratta di dati cachati
        return res.status(200).json({
            success: true,
            message: "Statistiche recuperate con successo.",
            data: statsCache
        });
    }

    res.setHeader('X-Cache', 'MISS');
    const connection = await db.getConnection();
    try {
        // Totale utenti attivi
        const [userRows] = await connection.query('SELECT COUNT(*) AS total_users FROM users WHERE is_active = 1');

        // Totale ticket risolti
        const [closedTicketRows] = await connection.query("SELECT COUNT(*) AS resolved_tickets FROM tickets WHERE status = 'resolved'");

        // Valutazione media
        const [rateRows] = await connection.query('SELECT AVG(stars) AS average_rating FROM ratings');
        const stats = {
            total_users: userRows[0].total_users,
            resolved_tickets: closedTicketRows[0].resolved_tickets,
            average_rating: rateRows[0].average_rating,
            cached_at: new Date(now).toISOString()
        };

        statsCache = stats;
        lastCacheTime = now;

        return res.json({
            success: true,
            message: "Statistiche recuperate con successo.",
            data: statsCache
        });
    } catch (error) {
        console.error("Errore recupero statistiche: " + error.stack);
        return res.status(500).json({
            success: false,
            message: "Errore interno al server"
        });
    } finally {
        connection.release();
    }
});

module.exports = router;