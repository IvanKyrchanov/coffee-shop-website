const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt'); // НОВОЕ: Подключаем библиотеку безопасности

const app = express();
const PORT = 3000;

// ==========================================
// 1. НАСТРОЙКИ СЕРВЕРА (MIDDLEWARE)
// ==========================================
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. БАЗА ДАННЫХ (SQLITE)
// ==========================================
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('❌ Ошибка подключения к БД:', err.message);
    else console.log('✅ Успешно подключились к базе данных SQLite.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, phone TEXT, date TEXT, time TEXT, guests INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE, password TEXT, bonus_points INTEGER DEFAULT 0
    )`, async () => {
        // ИЗМЕНЕНИЕ: Хешируем пароль тестового админа перед записью
        const hashedAdminPassword = await bcrypt.hash('123', 10);
        db.run(`INSERT OR IGNORE INTO users (login, password, bonus_points) VALUES ('admin', ?, 150)`, [hashedAdminPassword]);
    });
});

// ==========================================
// 3. МАРШРУТЫ СТРАНИЦ
// ==========================================
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));

// ==========================================
// 4. API: АВТОРИЗАЦИЯ И БЕЗОПАСНОСТЬ
// ==========================================
app.post('/api/register', async (req, res) => {
    const { login, password } = req.body;
    
    try {
        // ИЗМЕНЕНИЕ: Превращаем пароль в секьюрный хеш (например: $2b$10$w...x)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (login, password) VALUES (?, ?)', [login, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ message: 'Логин уже занят' });
                return res.status(500).json({ message: 'Ошибка сервера' });
            }
            res.status(201).json({ message: 'Регистрация успешна!' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка шифрования' });
    }
});

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    
    // Ищем пользователя только по логину
    db.get('SELECT * FROM users WHERE login = ?', [login], async (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка сервера' });
        if (!row) return res.status(401).json({ message: 'Неверный логин или пароль' });
        
        // ИЗМЕНЕНИЕ: Сравниваем введенный пароль с сохраненным хешем
        const isPasswordValid = await bcrypt.compare(password, row.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Неверный логин или пароль' });
        
        res.cookie('username', row.login, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
        res.status(200).json({ message: 'Авторизация успешна', user: { login: row.login, bonus_points: row.bonus_points } });
    });
});

app.get('/api/check-auth', (req, res) => {
    const username = req.cookies.username;
    if (!username) return res.status(401).json({ loggedIn: false });

    db.get('SELECT login, bonus_points FROM users WHERE login = ?', [username], (err, row) => {
        if (row) res.status(200).json({ loggedIn: true, user: row });
        else res.status(401).json({ loggedIn: false });
    });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('username');
    res.status(200).json({ message: 'Успешный выход' });
});

app.get('/api/users', (req, res) => {
    db.all('SELECT id, login, bonus_points FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==========================================
// 5. API: БРОНИРОВАНИЕ
// ==========================================
app.post('/api/reserve', (req, res) => {
    const { name, phone, date, time, guests } = req.body;
    db.run('INSERT INTO reservations (name, phone, date, time, guests) VALUES (?, ?, ?, ?, ?)', 
        [name, phone, date, time, guests], function(err) {
        if (err) return res.status(500).json({ message: 'Ошибка при сохранении' });
        res.status(201).json({ message: 'Столик успешно забронирован!' });
    });
});

app.get('/api/reservations', (req, res) => {
    db.all('SELECT * FROM reservations', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => console.log(`🚀 Сервер запущен на http://localhost:${PORT}`));