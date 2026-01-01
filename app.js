const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const pg = require('pg'); // استدعاء يدوي للمكتبة
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

// --- إعداد الاتصال بـ Supabase ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg, // حل مشكلة الـ Manual Install
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

// --- تعريف الموديل ---
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }
});

// --- الإعدادات (Middleware) ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key-2026',
    resave: false,
    saveUninitialized: true
}));

// مزامنة قاعدة البيانات تلقائياً
sequelize.sync();

// --- المسارات (Routes) ---
app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username, password } });
        if (user) {
            req.session.userId = user.id;
            return res.redirect('/months');
        }
        res.render('login', { error: 'بيانات الدخول غير صحيحة' });
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'عذراً، فشل الاتصال بقاعدة البيانات' });
    }
});

app.get('/months', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.render('months');
});

// --- التصدير لـ Vercel ---
module.exports = app;
