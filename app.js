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

// .html রিডাইরেক্ট মিডলওয়্যার: কেউ .html লিখলে অটোমেটিক ক্লিন ইউআরএল-এ রিডাইরেক্ট করবে
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const newPath = req.path.slice(0, -5);
        return res.redirect(301, newPath);
    }
    next();
});

// ৪. API রাউটসমূহ যুক্ত করা
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/drive', driveRoutes); 

// ৫. ফ্রন্টএন্ডের জন্য স্ট্যাটিক ফোল্ডার সার্ভ করা
// clean URLs করার জন্য extensions অপশন যোগ করা হলো
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html', 'htm']
}));

// বেসিক হেলথ-চেক রাউট
app.get('/api/status', (req, res) => {
    res.json({ status: "success", message: "Careerlift API is running smoothly!" });
});

// ৬. SPA Fallback: অন্য যেকোনো রিকোয়েস্টে index.html সার্ভ করা
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── GLOBAL ERROR HANDLER ──
// This catches any error that wasn't handled by route-specific try/catch
app.use((err, req, res, next) => {
    console.error('🔥 [Global Error Handler]', err.message);
    if (err.stack) {
        // Fixed: Properly using '\n' for splitting and joining the stack trace
        console.error('   Stack:', err.stack.split('\n').slice(0, 3).join('\n'));
    }

    // Don't send response if headers already sent
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

    // ── Initialize auto-backup AFTER server starts ──
    // This way, if backup config is wrong, the server still runs
    try {
        const { initAutoBackup } = require('./utils/autoBackup');
        initAutoBackup();
    } catch (err) {
        console.warn('⚠️ [App] Auto-backup initialization failed:', err.message);
        console.warn('   Server will continue running without auto-backup.');
    }
});

// ── GRACEFUL SHUTDOWN ──
// Handle uncaught errors so nodemon doesn't restart on every crash
process.on('uncaughtException', (err) => {
    console.error('💥 [Uncaught Exception]', err.message);
    console.error(err.stack);
    // Give time for logs to flush before exiting
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 [Unhandled Rejection] at:', promise, 'reason:', reason);
});