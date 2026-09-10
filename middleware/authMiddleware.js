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

        // ✅ FIX: চিনে নিন এটি Admin নাকি Teacher
        if (decoded.role === 'SuperAdmin') {
            // ── ADMIN TOKEN ──
            req.admin = { 
                role: decoded.role, 
                email: decoded.email 
            };
            // Teacher controller-এর জন্য compatibility
            req.user = { 
                id: decoded.email, // Admin-এর ক্ষেত্রে email ইউনিক identifier
                role: decoded.role,
                email: decoded.email
            };
            
        } else if (decoded.role === 'Teacher') {
            // ── TEACHER TOKEN ──
            req.user = { 
                id: decoded.id,      // Teacher._id (ObjectId)
                role: decoded.role,
                // Teacher login-এ id আছে, email নেই
            };
            // Admin controller-এর জন্য compatibility (যদি লাগে)
            req.admin = {
                role: decoded.role,
                email: null
            };
            
        } else {
            return res.status(403).json({
                success: false,
                message: 'অজানা রোল! অ্যাক্সেস নিষিদ্ধ।'
            });
        }

        next(); // পরবর্তী কাজে যাওয়ার অনুমতি

    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'সেশন শেষ হয়ে গেছে, আবার লগইন করুন।' 
        });
    }
};

// ✅ NEW: Admin-only middleware (optional but useful)
const adminOnly = (req, res, next) => {
    if (req.admin?.role !== 'SuperAdmin') {
        return res.status(403).json({
            success: false,
            message: 'শুধুমাত্র অ্যাডমিনের অনুমতি আছে!'
        });
    }
    next();
};

// ✅ NEW: Teacher-only middleware (optional but useful)
const teacherOnly = (req, res, next) => {
    if (req.user?.role !== 'Teacher') {
        return res.status(403).json({
            success: false,
            message: 'শুধুমাত্র শিক্ষকের অনুমতি আছে!'
        });
    }
    next();
};

// সঠিকভাবে এক্সপোর্ট করা হলো
module.exports = { protect, adminOnly, teacherOnly };