const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================
// 1. AUTHENTICATION
// ============================================

// @desc    Admin adds new teacher
// @route   POST /api/teachers
// @access  Admin
exports.addTeacher = async (req, res) => {
    try {
        const { name, phone, email, password, assignedClasses } = req.body;

        // Check if teacher already exists
        const existingTeacher = await Teacher.findOne({ phone });
        if (existingTeacher) {
            return res.status(409).json({ 
                success: false, 
                message: 'এই ফোন নম্বর দিয়ে আগে থেকেই একজন শিক্ষক যুক্ত আছেন।' 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create teacher
        const teacher = await Teacher.create({
            name,
            phone,
            email,
            password: hashedPassword,
            assignedClasses: assignedClasses || []
        });

        res.status(201).json({
            success: true,
            message: 'শিক্ষক সফলভাবে যুক্ত করা হয়েছে!',
            data: {
                id: teacher._id,
                name: teacher.name,
                phone: teacher.phone,
                assignedClasses: teacher.assignedClasses
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'সার্ভার এরর: ' + error.message });
    }
};

// @desc    Teacher login
// @route   POST /api/teachers/login
// @access  Public
exports.loginTeacher = async (req, res) => {
    try {
        const { phone, password } = req.body;

        const teacher = await Teacher.findOne({ phone });
        if (!teacher || !teacher.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'অ্যাকাউন্ট খুঁজে পাওয়া যায়নি অথবা ডিঅ্যাক্টিভেটেড।' 
            });
        }

        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'পাসওয়ার্ড ভুল হয়েছে।' 
            });
        }

        const token = jwt.sign(
            { id: teacher._id, role: teacher.role },
            process.env.JWT_SECRET || 'careerlift_super_secret_key',
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            message: 'লগইন সফল হয়েছে!',
            token,
            teacher: {
                id: teacher._id,
                name: teacher.name,
                role: teacher.role,
                assignedClasses: teacher.assignedClasses
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'লগইন সার্ভার এরর: ' + error.message });
    }
};

// ============================================
// 2. PROFILE & DASHBOARD
// ============================================

// @desc    Get logged-in teacher's profile
// @route   GET /api/teachers/profile
// @access  Teacher (JWT required)
exports.getTeacherProfile = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user.id).select('-password');
        
        if (!teacher) {
            return res.status(404).json({ 
                success: false, 
                message: 'শিক্ষক খুঁজে পাওয়া যায়নি!' 
            });
        }

        res.status(200).json({
            success: true,
            data: teacher
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'প্রোফাইল লোড করতে সমস্যা: ' + error.message 
        });
    }
};

// @desc    Get teacher attendance history
// @route   GET /api/teachers/attendance-history
// @access  Teacher (JWT required)
exports.getTeacherAttendanceHistory = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user.id);
        if (!teacher) {
            return res.status(404).json({ 
                success: false, 
                message: 'শিক্ষক খুঁজে পাওয়া যায়নি!' 
            });
        }

        const limit = parseInt(req.query.limit) || 10;
        
        const records = await Attendance.find({ 
            teacherId: teacher._id 
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('records.studentMongoId', 'fullName studentID');

        res.status(200).json({
            success: true,
            count: records.length,
            data: records
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'ইতিহাস লোড করতে সমস্যা: ' + error.message 
        });
    }
};

// @desc    Get teacher notifications (pending attendance)
// @route   GET /api/teachers/notifications
// @access  Teacher (JWT required)
exports.getTeacherNotifications = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.user.id);
        if (!teacher) {
            return res.status(404).json({ 
                success: false, 
                message: 'শিক্ষক খুঁজে পাওয়া যায়নি!' 
            });
        }

        const todayStr = new Date().toLocaleDateString('en-CA');
        const assignedClasses = teacher.assignedClasses || [];
        
        let notifications = [];
        let pendingCount = 0;

        for (const cls of assignedClasses) {
            const existing = await Attendance.findOne({
                courseName: cls.courseName,
                batchNo: cls.batchNo,
                date: todayStr
            });

            if (!existing) {
                pendingCount++;
                notifications.push({
                    type: 'pending',
                    message: `Attendance pending: ${cls.courseName} — ${cls.batchNo}`,
                    course: cls.courseName,
                    batch: cls.batchNo,
                    date: todayStr
                });
            }
        }

        if (pendingCount === 0) {
            notifications.push({
                type: 'success',
                message: 'All attendance completed for today! 🎉',
                date: todayStr
            });
        }

        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'নোটিফিকেশন লোড করতে সমস্যা: ' + error.message 
        });
    }
};

// ============================================
// 3. COURSE ASSIGNMENT MANAGEMENT
// ============================================

// @desc    Assign new course to teacher (Admin)
// @route   POST /api/teachers/assign-course
// @access  Admin
exports.assignNewCourse = async (req, res) => {
    try {
        const { teacherId, courseName, batchNo } = req.body;
        
        if (!teacherId || !courseName || !batchNo) {
            return res.status(400).json({
                success: false,
                message: 'teacherId, courseName, এবং batchNo সবগুলো দিতে হবে!'
            });
        }

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ 
                success: false,
                message: 'শিক্ষক খুঁজে পাওয়া যায়নি!' 
            });
        }

        // ✅ ডুপ্লিকেট চেক: একই কোর্স + ব্যাচ আগে থেকে আছে কিনা
        const alreadyAssigned = teacher.assignedClasses.some(
            cls => cls.courseName === courseName && cls.batchNo === batchNo
        );

        if (alreadyAssigned) {
            return res.status(409).json({
                success: false,
                message: `এই শিক্ষককে আগে থেকেই ${courseName} (${batchNo}) অ্যাসাইন করা আছে।`
            });
        }

        // নতুন কোর্স পুশ করুন
        teacher.assignedClasses.push({ courseName, batchNo });
        await teacher.save();

        res.status(200).json({
            success: true,
            message: `${courseName} (${batchNo}) সফলভাবে অ্যাসাইন করা হয়েছে!`,
            data: teacher.assignedClasses
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'কোর্স অ্যাসাইন করতে সমস্যা: ' + error.message 
        });
    }
};

// @desc    Remove assigned course from teacher (Admin)
// @route   DELETE /api/teachers/remove-course
// @access  Admin
exports.removeAssignedCourse = async (req, res) => {
    try {
        const { teacherId, courseName, batchNo } = req.body;

        if (!teacherId || !courseName || !batchNo) {
            return res.status(400).json({
                success: false,
                message: 'teacherId, courseName, এবং batchNo সবগুলো দিতে হবে!'
            });
        }

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ 
                success: false,
                message: 'শিক্ষক খুঁজে পাওয়া যায়নি!' 
            });
        }

        const initialLength = teacher.assignedClasses.length;

        teacher.assignedClasses = teacher.assignedClasses.filter(
            cls => !(cls.courseName === courseName && cls.batchNo === batchNo)
        );

        if (teacher.assignedClasses.length === initialLength) {
            return res.status(404).json({
                success: false,
                message: `${courseName} (${batchNo}) এই শিক্ষকের অ্যাসাইনমেন্টে পাওয়া যায়নি।`
            });
        }

        await teacher.save();

        res.status(200).json({
            success: true,
            message: `${courseName} (${batchNo}) সফলভাবে রিমুভ করা হয়েছে!`,
            data: teacher.assignedClasses
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'কোর্স রিমুভ করতে সমস্যা: ' + error.message 
        });
    }
};

// ============================================
// 4. ADMIN MANAGEMENT
// ============================================

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Admin
exports.getAllTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find().select('-password').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: teachers.length,
            data: teachers
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'শিক্ষকদের তালিকা লোড করতে সমস্যা: ' + error.message 
        });
    }
};

// @desc    Get single teacher by ID
// @route   GET /api/teachers/:id
// @access  Admin
exports.getTeacherById = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id).select('-password');

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'শিক্ষক খুঁজে পাওয়া যায়নি!'
            });
        }

        res.status(200).json({
            success: true,
            data: teacher
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'শিক্ষকের তথ্য লোড করতে সমস্যা: ' + error.message 
        });
    }
};

// @desc    Update teacher info
// @route   PUT /api/teachers/:id
// @access  Admin
exports.updateTeacher = async (req, res) => {
    try {
        const { name, phone, email, assignedClasses } = req.body;

        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'শিক্ষক খুঁজে পাওয়া যায়নি!'
            });
        }

        // Phone unique check (if changed)
        if (phone && phone !== teacher.phone) {
            const existing = await Teacher.findOne({ phone });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: 'এই ফোন নম্বর দিয়ে আরেকজন শিক্ষক আছেন।'
                });
            }
            teacher.phone = phone;
        }

        if (name) teacher.name = name;
        if (email) teacher.email = email;
        if (assignedClasses) teacher.assignedClasses = assignedClasses;

        await teacher.save();

        res.status(200).json({
            success: true,
            message: 'শিক্ষকের তথ্য আপডেট করা হয়েছে!',
            data: {
                id: teacher._id,
                name: teacher.name,
                phone: teacher.phone,
                email: teacher.email,
                assignedClasses: teacher.assignedClasses
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'আপডেট করতে সমস্যা: ' + error.message 
        });
    }
};

// @desc    Toggle teacher active status
// @route   PATCH /api/teachers/:id/toggle-status
// @access  Admin
exports.toggleTeacherStatus = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'শিক্ষক খুঁজে পাওয়া যায়নি!'
            });
        }

        teacher.isActive = !teacher.isActive;
        await teacher.save();

        res.status(200).json({
            success: true,
            message: `শিক্ষককে ${teacher.isActive ? 'এক্টিভেট' : 'ডিঅ্যাক্টিভেট'} করা হয়েছে!`,
            data: { isActive: teacher.isActive }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা: ' + error.message 
        });
    }
};

// @desc    Delete teacher permanently
// @route   DELETE /api/teachers/:id
// @access  Admin
exports.deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'শিক্ষক খুঁজে পাওয়া যায়নি!'
            });
        }

        await Teacher.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'শিক্ষক সফলভাবে ডিলিট করা হয়েছে!'
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'ডিলিট করতে সমস্যা: ' + error.message 
        });
    }
};