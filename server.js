const express = require('express');
const path = require('path');
const db = require('./db/connection'); // importa il pool di connessione
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000; // fallback porta 3000

app.use(express.json());
app.use(cookieParser());

// Espone la cartella public
app.use(express.static('public'));




async function startServer() {
    try {
        // Test connessione database
        const connection = await db.promise().getConnection();
        console.log('✅ Connessione al database MySQL stabilita con successo!');
        connection.release();

        // Accendo server express
        app.listen(PORT, () => {
            console.log(`🚀 Server in esecuzione: http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ ERRORE: Impossibile connettersi al database: ' + error.message);
        process.exit(1); 
    }
}

startServer();