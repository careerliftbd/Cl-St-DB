const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadImageToDrive } = require('../controllers/driveController');
const { protect } = require('../middleware/authMiddleware');
const { performBackup } = require('../utils/autoBackup');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ── ASYNC ERROR HANDLER ──
// Express 4 doesn't catch async errors automatically
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// রিকোয়েস্টে 'studentPhoto' নামের ফিল্ড থেকে ফাইল রিসিভ করবে
router.post('/upload', protect, upload.single('studentPhoto'), uploadImageToDrive);

// ম্যানুয়াল ব্যাকআপ রাউট — Fixed with proper error handling
router.post('/manual-backup', protect, asyncHandler(async (req, res) => {
    // Increase timeout for large database backups (2 minutes)
    req.setTimeout(120000);
    res.setTimeout(120000);

    try {
        const result = await performBackup();

        res.json({ 
            success: true, 
            message: "ম্যানুয়াল ব্যাকআপ সফলভাবে সম্পন্ন হয়েছে এবং ড্রাইভে আপলোড হয়েছে!",
            backup: result
        });
    } catch (error) {
        console.error('❌ [DriveRoutes] Manual backup failed:', error.message);

        // Always send a response — never leave the client hanging
        res.status(500).json({ 
            success: false, 
            message: "ব্যাকআপ নিতে সমস্যা হয়েছে!",
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}));

module.exports = router;