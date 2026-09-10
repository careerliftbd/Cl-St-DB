const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true }, // লগইনের জন্য
    email: { type: String },
    password: { type: String, required: true }, // bcrypt দিয়ে হ্যাস করা
    role: { type: String, default: 'Teacher' },
    
    // শিক্ষকের অ্যাসাইন করা ক্লাসগুলোর লিস্ট
    assignedClasses: [
        {
            courseName: { type: String, required: true },
            batchNo: { type: String, required: true }
        }
    ],
    
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);