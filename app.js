const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const pg = require('pg');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

// --- 1. إعدادات قاعدة البيانات (الحل النهائي لمشكلة pg) ---
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg, // حل مشكلة "Please install pg package manually"
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false // ضروري جداً للاتصال بـ Supabase
        }
    },
    logging: false // لتقليل الزحمة في الـ Logs
});

// --- 2. تعريف الموديل (User) ---
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }
});

// --- 3. الإعدادات الوسيطة (Middleware) ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'smart-planner-secret',
    resave: false,
    saveUninitialized: true
}));

// مزامنة قاعدة البيانات
sequelize.sync();

// --- 4. المسارات (Routes) ---

// الصفحة الرئيسية (تحويل للوجين)
app.get('/', (req, res) => {
    res.redirect('/login');
});

// صفحة تسجيل الدخول
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// معالجة الدخول
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { username, password } });
        if (user) {
            req.session.userId = user.id;
            return res.redirect('/months');
        }
        res.render('login', { error: 'بيانات غير صحيحة' });
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'حدث خطأ في السيرفر' });
    }
});

// صفحة الشهور (مثال)
app.get('/months', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.render('months');
});

// تسجيل الخروج
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// --- 5. التصدير لـ Vercel (مهم جداً) ---
module.exports = app;

// للتشغيل المحلي فقط
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
