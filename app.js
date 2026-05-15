require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// ১. রাউট ফাইলসমূহ ইমপোর্ট করা
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const driveRoutes = require('./routes/driveRoutes'); 

const app = express();

// ২. ডাটাবেস কানেকশন ইনিশিয়ালাইজ করা
connectDB();

// ৩. গ্লোবাল মিডলওয়্যার সেটআপ
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

// ৪. API রাউটসমূহ যুক্ত করা (স্ট্যাটিক ফাইলের আগে)
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/drive', driveRoutes); 

// ৫. ফ্রন্টএন্ডের জন্য স্ট্যাটিক ফোল্ডার সার্ভ করা
app.use(express.static(path.join(__dirname, 'public')));

// ক্লিন URL রাউটসমূহ — .html ছাড়া পেজ লোড করার জন্য
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/all-students', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'all-students.html'));
});

app.get('/running-students', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'running-students.html'));
});

app.get('/alumni', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'alumni.html'));
});

app.get('/next-batch', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'next-batch.html'));
});

app.get('/student-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student-profile.html'));
});

app.get('/add-student', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'add-student.html'));
});

app.get('/edit-student', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit-student.html'));
});

// .html রিডাইরেক্ট মিডলওয়্যার: কেউ .html লিখলে ক্লিন ইউআরএল-এ রিডাইরেক্ট
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const newPath = req.path.slice(0, -5);
        // query string preserve করুন
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        return res.redirect(301, newPath + query);
    }
    next();
});

// বেসিক হেলথ-চেক রাউট
app.get('/api/status', (req, res) => {
    res.json({ status: "success", message: "Careerlift API is running smoothly!" });
});

// ৬. SPA Fallback: অন্য যেকোনো রিকোয়েস্টে index.html সার্ভ করা
// API রাউট এবং স্পেসিফিক পেজ রাউট ছাড়া
app.use((req, res) => {
    // যদি API রাউট না হয়
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// ── GLOBAL ERROR HANDLER ──
app.use((err, req, res, next) => {
    console.error('🔥 [Global Error Handler]', err.message);
    if (err.stack) {
        console.error('   Stack:', err.stack.split('\n').slice(0, 3).join('\n'));
    }

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ৭. সার্ভার লিসেনিং
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`[+] Server is running in DEV mode on http://localhost:${PORT}`);

    try {
        const { initAutoBackup } = require('./utils/autoBackup');
        initAutoBackup();
    } catch (err) {
        console.warn('⚠️ [App] Auto-backup initialization failed:', err.message);
        console.warn('   Server will continue running without auto-backup.');
    }
});

// ── GRACEFUL SHUTDOWN ──
process.on('uncaughtException', (err) => {
    console.error('💥 [Uncaught Exception]', err.message);
    console.error(err.stack);
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 [Unhandled Rejection] at:', promise, 'reason:', reason);
});