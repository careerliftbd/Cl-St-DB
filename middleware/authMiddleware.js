const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    // হেডারে Authorization: Bearer <token> পাঠানো হয়েছে কি না চেক করা
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'অনুমতি নেই! অনুগ্রহ করে আগে লগইন করুন।' 
        });
    }

    try {
        // টোকেন ডিকোড ও ভেরিফাই করা
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded; // রিকোয়েস্ট অবজেক্টে অ্যাডমিন ডাটা রেখে দেওয়া
        next(); // পরবর্তী কাজে যাওয়ার অনুমতি
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'সেশন শেষ হয়ে গেছে, আবার লগইন করুন।' 
        });
    }
};

// সঠিকভাবে এক্সপোর্ট করা হলো
module.exports = { protect };