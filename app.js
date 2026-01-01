const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const pg = require('pg');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

// إعداد الاتصال - مع إضافة أوقات انتظار (Timeout) لحل مشكلة الـ Host
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        },
        connectTimeout: 60000 // زيادة وقت المحاولة لضمان الاتصال
    },
    logging: false
});

// تعريف الموديل
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }
});

// الإعدادات
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'smart-planner-safe-2026',
    resave: false,
    saveUninitialized: true
}));

// تجربة الاتصال عند بدء التشغيل
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
        return sequelize.sync();
    })
    .catch(err => console.error('Unable to connect to the database:', err));

// المسارات
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
        res.render('login', { error: 'بيانات غير صحيحة' });
    } catch (err) {
        res.render('login', { error: 'مشكلة في الخادم، حاول مجدداً' });
    }
});

app.get('/months', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.render('months');
});

module.exports = app;
