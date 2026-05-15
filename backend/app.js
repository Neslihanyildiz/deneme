require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // ← YENİ
const rateLimit = require('express-rate-limit');

const app = express();

// CORS — credentials:true cookie'lerin cross-origin gitmesine izin verir
// origin whitelist: frontend'in çalıştığı adres
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true, // ← cookie'lerin gönderilmesi için şart
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // ← req.cookies'i aktif eder

// ── Rate limiting ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'SecureShare API running' }));

app.use('/api/auth',  authLimiter, require('./routes/authRoutes'));
app.use('/api/files', apiLimiter,  require('./routes/fileRoutes'));
app.use('/api/admin', apiLimiter,  require('./routes/adminRoutes'));
app.use('/api/users', apiLimiter,  require('./routes/userRoutes'));

module.exports = app;