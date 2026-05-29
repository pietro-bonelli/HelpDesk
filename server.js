const express = require('express');
const path = require('path');
const db = require('./db/connection'); // importa il pool di connessione
const cookieParser = require('cookie-parser');
const { verifyAuthentication, authenticateToken, hasRole, isAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000; // fallback porta 3000

// Middleware GLOBALI
app.use(express.json());
app.use(cookieParser());

// Espone la cartella public
app.use(express.static('public'));

app.get('/login.html', verifyAuthentication, (req, res, next) => {
    next();
});

app.get('/dashboard', authenticateToken, (req, res) => {
    res.sendFile('private/dashboard.html');
});


/**
 * API PUBBLICHE
 */
app.use('/api/auth', require('./api/auth'));
app.use('/api/stats', require('./api/stats'));

/**
 * API PRIVATE (UTENTE)
 */
// Controllo autenticazione
app.use('/api', authenticateToken);

app.use('/api/tickets', require('./api/tickets'));
app.use('/api/messages', require('./api/messages'));
app.use('/api/users', require('./api/users'));


app.use('/api/admin/roles', isAdmin, require('./api/admin/roles'));
app.use('/api/admin/categories', isAdmin, require('./api/admin/categories'));
app.use('/api/admin/users', isAdmin, require('./api/admin/users'));






async function startServer() {
    try {
        // Test connessione database
        const connection = await db.getConnection();
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