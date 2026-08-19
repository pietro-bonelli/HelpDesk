const express = require('express');
const router = express.Router();
const db = require('../../db/connection');
const { Worker } = require('worker_threads');
const path = require('path');

/**
 * @route POST /api/tickets
 * @desc Creazione di un nuovo ticket
 * @access admin
 */
router.get('/', (req, res) => {
    const worker = new Worker(path.join(__dirname, 'reportWorker.js'));

    // Nel caso in cui il client interrompa la connessione
    req.on('close', () => {
        worker.terminate();
    });


    worker.on('message', (result) => {
        return res.status(200).json({
            success: true,
            message: "Report generato con successo",
            report: result
        })
    });

    worker.on('error', err => {
        console.error('Errore nel worker: ' + err);
        return res.status(500).json({
            success: false,
            message: 'Si è verificato un errore durante la generazione del report.'
        });
    });
});

module.exports = router;