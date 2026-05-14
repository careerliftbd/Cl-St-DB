const express = require('express');
const router = express.Router();
const { login, verifyAuth } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// লগইন রাউট
router.post('/login', login);

// টোকেন ভ্যালিড কি না চেক করার রাউট (প্রোটেক্টেড)
router.get('/verify', protect, verifyAuth);

// রাউটার এক্সপোর্ট করা হলো (এটি না থাকলে app.js ক্র্যাশ করবে)
module.exports = router;