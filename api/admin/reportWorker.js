const { parentPort, workerData } = require('worker_threads');
const db = require('../../db/connection');

generateReport();


async function generateReport() {
    const connection = await db.getConnection();
    const [ratingMean, resolutionTimeMean, ticketCategories] = await Promise.all([
        getRatingMean(connection),
        getResolutionTimeMean(connection),
        getTicketCategories(connection)
    ]);

    // Formatting per Google Charts API (accetta solo array di array, non oggetti)
    const ratingData = [
        ['Operatore', 'Media Stelle', { role: 'tooltip', type: 'string', p: { html: true } }], // Intestazione
        ...ratingMean.map(row => [
            row.operator,
            Number(row.media_stelle),
            `<div class='chart-tooltip'>
                <b>${row.operator}</b><br><br>
                <b>Media</b>: ${row.media_stelle} <i class='fa-solid fa-star'></i><br>
                <b>Valutazioni Totali</b>: ${row.totale_valutazioni}
            </div>`
        ]) // Dati
    ];

    const resolutionTimeData = [
        ['Mese', 'Tempo Risoluzione', { role: 'tooltip', type: 'string', p: { html: true } }], // Intestazione
        ...resolutionTimeMean.map(row => [
            row.mese, Number(row.ore_medie_risoluzione),
            `<div class='chart-tooltip'>
                <i class="fa-solid fa-hourglass-start"></i> <b>${row.mese}</b><br><br>
                <b>Tempo Medio Risoluzione</b>: ${row.ore_medie_risoluzione} H</i>
            </div>`
        ]) // Dati
    ];

    const ticketCategoriesData = [
        ['Categoria', 'Qt. Ticket'], // Intestazione
        ...ticketCategories.map(row => [row.category, row.numero_ticket]) // Dati
    ];

    parentPort.postMessage({
        ratingData,
        resolutionTimeData,
        ticketCategoriesData
    });

    connection.release();
}

async function getRatingMean(connection) {
    try {
        const query = `
            SELECT CONCAT(u.first_name, ' ', u.last_name) AS operator, ROUND(AVG(r.stars), 1) AS media_stelle, COUNT(r.id) AS totale_valutazioni
            FROM ratings r
            JOIN tickets t ON r.ticket_id = t.id
            JOIN users u ON u.id = t.operator_id
            GROUP BY u.id
        `;
        const [res] = await connection.query(query);
        return res;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getResolutionTimeMean(connection) {
    try {
        // DATE_FORMAT(created_at, '%Y-%m') formatta il TIMESTAMP di created_at in formato yyyy-mm
        // ROUND approssima
        // AVG fa la media
        // TIMESTAMPDIFF calcola la differenza in ORE (HOUR) tra created_at e updated_at
        // Per calcolare la differenza controlla appunto la differenza tra momento di creazione e ultimo aggiornamento (ammettendo che sia il passaggio a stato risolto)
        const query = `
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS mese, ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)), 1) AS ore_medie_risoluzione
            FROM tickets
            WHERE status = 'resolved'
            GROUP BY mese
            ORDER BY mese ASC
        `;
        const [res] = await connection.query(query);
        return res;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getTicketCategories(connection) {
    try {
        const query = `
            SELECT c.name AS category, COUNT(t.id) AS numero_ticket
            FROM tickets t
            JOIN categories c ON c.id = t.category_id
            GROUP BY c.name
        `;
        const [res] = await connection.query(query);
        return res;
    } catch (error) {
        console.error(error);
        return null;
    }
}