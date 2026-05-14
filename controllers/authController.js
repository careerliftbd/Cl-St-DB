const jwt = require('jsonwebtoken');

// @desc    Admin Login
// @route   POST /api/auth/login
exports.login = (req, res) => {
    const { email, password } = req.body;

    // .env এর ডাটার সাথে ইনপুট মেলানো
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        // টোকেন তৈরি করা (২৪ ঘণ্টার জন্য ভ্যালিড)
        const token = jwt.sign(
            { role: 'SuperAdmin', email: process.env.ADMIN_EMAIL },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            success: true,
            message: 'লগইন সফল হয়েছে!',
            token
        });
    } else {
        return res.status(401).json({
            success: false,
            message: 'ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে!'
        });
    }
};

// @desc    Check Auth Status
// @route   GET /api/auth/verify
exports.verifyAuth = (req, res) => {
    res.status(200).json({ success: true, message: 'Admin is authenticated' });
};