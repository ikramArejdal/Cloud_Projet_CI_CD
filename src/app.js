require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
require('./models');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globaux ──
app.use(cors({
  origin: process.env.CLIENT_URL || `http://localhost:${PORT}`,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Fichiers statiques (frontend) ──
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Routes API ──
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// ── Route racine (health check) ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test route OK' });
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// ── Gestion des erreurs ──
app.use(errorHandler);

// ── Démarrage ──
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Serveur démarré sur http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Impossible de se connecter à la base de données :', err.message);
    process.exit(1);
  });

module.exports = app;