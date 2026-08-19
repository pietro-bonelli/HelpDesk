const express = require('express');
const path = require('path');
const db = require('./db/connection'); // importa il pool di connessione
const cookieParser = require('cookie-parser');
const { verifyAuthentication, authenticateToken, hasRole, isAdmin } = require('./middleware/auth');
const { loadCategories } = require('./services/categoryService');

const app = express();
const PORT = process.env.PORT || 3000; // fallback porta 3000

// Middleware GLOBALI
app.use(express.json());
app.use(cookieParser());

app.get('/login', verifyAuthentication, (req, res, next) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Espone la cartella public
app.use(express.static('public'));

// Espone cartelle private
app.get('/dashboard', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'client', 'dashboard.html'));
});

app.get('/ticket/:id', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'client', 'ticket.html'));
});

app.get('/operator', authenticateToken, hasRole('*'), (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'operator', 'operator_dashboard.html'));
});


app.get('/admin', authenticateToken, isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin', 'panel.html'));
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
app.use('/api/admin/report', isAdmin, require('./api/admin/report'));






async function startServer() {
    try {
        // Test connessione database
        const connection = await db.getConnection();
        console.log('✅ Connessione al database MySQL stabilita con successo!');
        connection.release();

        loadCategories();

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