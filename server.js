const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. НАСТРОЙКИ СЕРВЕРА (MIDDLEWARE)
// ==========================================
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Прослойка (Middleware) для защиты админских маршрутов
const checkAdmin = (req, res, next) => {
    if (req.cookies.username === 'admin') next();
    else res.status(403).json({ message: 'Доступ запрещен. Только для администратора.' });
};

// ==========================================
// 2. БАЗА ДАННЫХ (SQLITE)
// ==========================================
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('❌ Ошибка подключения к БД:', err.message);
    else console.log('✅ Успешно подключились к базе данных SQLite.');
});

const initDatabase = async () => {
    db.serialize(() => {
        // Таблица бронирований
        db.run(`CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, phone TEXT, date TEXT, time TEXT, guests INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        // Таблица обратной связи (НОВОЕ)
        db.run(`CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT, phone TEXT, question TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Таблица пользователей
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT UNIQUE, password TEXT, bonus_points INTEGER DEFAULT 0
        )`, async () => {
            const hashedAdminPassword = await bcrypt.hash('123', 10);
            db.run(`INSERT OR IGNORE INTO users (login, password, bonus_points) VALUES ('admin', ?, 150)`, [hashedAdminPassword]);
        });

        // Таблица контента
        db.run(`CREATE TABLE IF NOT EXISTS site_content (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            hero_title TEXT, hero_desc TEXT, menu_data TEXT, team_data TEXT
        )`, () => {
            const initialMenu = '[{"title":"Капучино","desc":"Идеальный баланс эспрессо и нежной молочной пены.","price":"250 ₽","img":"https://images.unsplash.com/photo-1534778101976-62847782c213?q=80&w=500&auto=format&fit=crop"},{"title":"Латте","desc":"Мягкий кофейный напиток с большим количеством молока.","price":"270 ₽","img":"https://images.unsplash.com/photo-1599398054066-846f28917f38?q=80&w=500&auto=format&fit=crop"},{"title":"Эспрессо","desc":"Чистый и насыщенный вкус для истинных ценителей.","price":"150 ₽","img":"https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=500&auto=format&fit=crop"},{"title":"Раф","desc":"Сливочный, сладкий и невероятно мягкий кофейный десерт.","price":"320 ₽","img":"https://images.unsplash.com/photo-1585494156145-1c60a4fe952b?q=80&w=500&auto=format&fit=crop"}]';
            const initialTeam = '[{"name":"Анна","role":"Шеф-бариста","year":"2018","img":"https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop"},{"name":"Максим","role":"Ростермейстер","year":"2019","img":"https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop"},{"name":"Мария","role":"Кондитер","year":"2021","img":"https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop"},{"name":"Алексей","role":"Управляющий","year":"2020","img":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop"}]';
            
            db.run(`INSERT OR IGNORE INTO site_content (id, hero_title, hero_desc, menu_data, team_data) 
                    VALUES (1, 'Лучший кофе в твоём районе', 'Свежая обжарка каждый день. Зарядись с первого глотка.', ?, ?)`, 
                    [initialMenu, initialTeam]);
        });
    });
};
initDatabase();

// ==========================================
// 3. МАРШРУТЫ СТРАНИЦ
// ==========================================
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ==========================================
// 4. API: КОНТЕНТ САЙТА
// ==========================================
app.get('/api/content', (req, res) => {
    db.get('SELECT * FROM site_content WHERE id = 1', (err, row) => {
        if (err) return res.status(500).json({ message: 'Ошибка БД' });
        res.json(row);
    });
});

app.post('/api/content', checkAdmin, (req, res) => {
    const { hero_title, hero_desc, menu_data, team_data } = req.body;
    db.run(`UPDATE site_content SET hero_title = ?, hero_desc = ?, menu_data = ?, team_data = ? WHERE id = 1`, 
        [hero_title, hero_desc, JSON.stringify(menu_data), JSON.stringify(team_data)], function(err) {
        if (err) return res.status(500).json({ message: 'Ошибка сохранения контента' });
        res.status(200).json({ message: 'Изменения успешно сохранены!' });
    });
});

// ==========================================
// 5. API: АВТОРИЗАЦИЯ
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        db.run('INSERT INTO users (login, password) VALUES (?, ?)', [req.body.login, hashedPassword], function(err) {
            if (err?.message.includes('UNIQUE')) return res.status(400).json({ message: 'Логин уже занят' });
            if (err) return res.status(500).json({ message: 'Ошибка сервера' });
            res.status(201).json({ message: 'Регистрация успешна!' });
        });
    } catch (error) { res.status(500).json({ message: 'Ошибка шифрования' }); }
});

app.post('/api/login', (req, res) => {
    db.get('SELECT * FROM users WHERE login = ?', [req.body.login], async (err, row) => {
        if (!row || !(await bcrypt.compare(req.body.password, row.password))) {
            return res.status(401).json({ message: 'Неверный логин или пароль' });
        }
        res.cookie('username', row.login, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
        res.json({ message: 'Авторизация успешна', user: { login: row.login, bonus_points: row.bonus_points } });
    });
});

app.get('/api/check-auth', (req, res) => {
    const username = req.cookies.username;
    if (!username) return res.json({ loggedIn: false });
    db.get('SELECT login, bonus_points FROM users WHERE login = ?', [username], (err, row) => {
        res.json(row ? { loggedIn: true, user: row } : { loggedIn: false });
    });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('username');
    res.json({ message: 'Успешный выход' });
});

// ==========================================
// 6. API: БРОНИРОВАНИЕ
// ==========================================
app.post('/api/reserve', (req, res) => {
    const { name, phone, date, time, guests } = req.body;
    db.run('INSERT INTO reservations (name, phone, date, time, guests) VALUES (?, ?, ?, ?, ?)', 
        [name, phone, date, time, guests], function(err) {
        if (err) return res.status(500).json({ message: 'Ошибка при сохранении' });
        res.status(201).json({ message: 'Столик успешно забронирован!' });
    });
});

app.listen(PORT, () => console.log(`🚀 Сервер запущен на http://localhost:${PORT}`));
// ==========================================
// 7. API: ОБРАТНАЯ СВЯЗЬ
// ==========================================
app.post('/api/feedback', (req, res) => {
    const { name, phone, question } = req.body;
    db.run('INSERT INTO feedback (name, phone, question) VALUES (?, ?, ?)', 
        [name, phone, question], function(err) {
        if (err) return res.status(500).json({ message: 'Ошибка при сохранении' });
        res.status(201).json({ message: 'Заявка отправлена!' });
    });
});