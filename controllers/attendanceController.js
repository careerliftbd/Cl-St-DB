const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const { sendEmail, sendAttendanceWarning, sendBulkAttendanceWarnings } = require('../utils/sendEmail');

// ── Helper: Get date range for last N days ──
function getDateRange(days) {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toLocaleDateString('en-CA'));
    }
    return dates;
}

// ── Helper: Count consecutive absences ──
function countConsecutiveAbsences(records, studentId) {
    let count = 0;
    for (const record of records) {
        if (!record.records || !Array.isArray(record.records)) continue;

        const studentRecord = record.records.find(r => {
            if (!r.studentMongoId) return false;
            const recordId = r.studentMongoId._id ? r.studentMongoId._id.toString() : r.studentMongoId.toString();
            return recordId === studentId.toString();
        });

        if (studentRecord && (studentRecord.status === 'Absent' || studentRecord.status === 'Late')) {
            count++;
        } else {
            break;
        }
    }
    return count;
}

// @desc    Get Running Students for a specific course & batch
// @route   GET /api/attendance/students
exports.getClassStudents = async (req, res) => {
    try {
        const { course, batch } = req.query;

        const students = await Student.find(
            {
                enrollments: {
                    $elemMatch: {
                        courseName: course,
                        batchNo: batch,
                        status: 'Running'
                    }
                }
            },
            'studentID fullName photoLink gender contact.phone'
        ).sort({ studentID: 1 });

        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'স্টুডেন্ট ফেচ করতে সমস্যা হয়েছে: ' + err.message
        });
    }
};

// @desc    Submit or Update Attendance
// @route   POST /api/attendance
exports.submitAttendance = async (req, res) => {
    try {
        const { courseName, batchNo, date, records } = req.body;

        let teacherId;
        const teacherEmail = req.admin ? req.admin.email : (req.teacher ? req.teacher.email : 'system@careerlift.com');

        const teacher = await Teacher.findOne({ email: teacherEmail });

        if (teacher) {
            teacherId = teacher._id;
        } else {
            const newTeacher = await Teacher.create({
                name: req.admin ? req.admin.name : 'System Admin',
                email: teacherEmail,
                phone: '00000000000',
                password: 'admin_temp_123',
                assignedClasses: []
            });
            teacherId = newTeacher._id;
        }

        let attendance = await Attendance.findOne({
            courseName,
            batchNo,
            date
        });

        if (attendance) {
            const todayStr = new Date().toLocaleDateString('en-CA');

            if (date !== todayStr) {
                return res.status(403).json({
                    success: false,
                    message: 'শুধুমাত্র আজকের অ্যাটেনডেন্স এডিট করা যাবে!'
                });
            }

            attendance.records = records;
            attendance.teacherId = teacherId;
            attendance.teacherEmail = teacherEmail;
            await attendance.save();

            return res.status(200).json({
                success: true,
                message: 'অ্যাটেনডেন্স আপডেট হয়েছে!'
            });
        } else {
            attendance = await Attendance.create({
                courseName,
                batchNo,
                date,
                teacherId,
                teacherEmail,
                records
            });

            return res.status(201).json({
                success: true,
                message: 'অ্যাটেনডেন্স সাবমিট হয়েছে!'
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'সাবমিট করতে সমস্যা: ' + err.message
        });
    }
};

// @desc    Get specific attendance record (by query params)
// @route   GET /api/attendance/record
exports.getAttendanceRecord = async (req, res) => {
    try {
        const { course, batch, date } = req.query;

        const record = await Attendance.findOne({
            courseName: course,
            batchNo: batch,
            date
        }).populate(
            'records.studentMongoId',
            'contact.phone guardian.phone photoLink gender fullName studentID'
        );

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'কোনো রেকর্ড পাওয়া যায়নি।'
            });
        }

        res.status(200).json({
            success: true,
            data: record
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'ডেটা ফেচ করতে এরর: ' + err.message
        });
    }
};

// @desc    Get attendance record by MongoDB _id
// @route   GET /api/attendance/:id
exports.getAttendanceById = async (req, res) => {
    try {
        const { id } = req.params;

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid attendance ID format'
            });
        }

        const attendance = await Attendance.findById(id)
            .populate(
                'records.studentMongoId',
                'contact.phone guardian.phone photoLink gender fullName studentID'
            );

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'অ্যাটেনডেন্স রেকর্ড পাওয়া যায়নি'
            });
        }

        res.status(200).json({
            success: true,
            data: attendance
        });
    } catch (err) {
        console.error('[Get Attendance By ID] Error:', err);
        res.status(500).json({
            success: false,
            message: 'ডেটা ফেচ করতে সমস্যা: ' + err.message
        });
    }
};

// @desc    Get unique batches from Student enrollments
// @route   GET /api/attendance/options
exports.getDropdownOptions = async (req, res) => {
    try {
        const students = await Student.find({}, 'enrollments.batchNo');
        let batches = new Set();

        students.forEach(s => {
            s.enrollments.forEach(e => {
                if (e.batchNo) batches.add(e.batchNo);
            });
        });

        res.status(200).json({
            success: true,
            batches: Array.from(batches).sort((a, b) => {
                const numA = parseInt(a.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.replace(/\D/g, '')) || 0;
                return numB - numA;
            })
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: 'ব্যাচ লোড করতে সমস্যা: ' + err.message 
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// 🆕 NEW: Continuous Absence Report
// ═══════════════════════════════════════════════════════════════

// @desc    Get attendance report with continuous absence tracking
// @route   GET /api/attendance/report
exports.getAttendanceReport = async (req, res) => {
    try {
        const { course, batch, days = 7 } = req.query;
        const dateRange = getDateRange(parseInt(days));

        const query = {};
        if (course) query.courseName = course;
        if (batch) query.batchNo = batch;
        query.date = { $in: dateRange };

        console.log('[Attendance Report] Query:', query);
        console.log('[Attendance Report] Date Range:', dateRange);

        const attendanceRecords = await Attendance.find(query)
            .populate('records.studentMongoId', 'studentID fullName contact.email contact.phone guardian.phone photoLink')
            .sort({ date: -1 });

        console.log('[Attendance Report] Found records:', attendanceRecords.length);

        if (!attendanceRecords.length) {
            return res.status(200).json({
                success: true,
                message: 'কোনো রেকর্ড পাওয়া যায়নি',
                data: { absent4Days: [], absent7Days: [], allRecords: [] }
            });
        }

        const studentMap = new Map();

        attendanceRecords.forEach((record, recordIndex) => {
            if (!record.records || !Array.isArray(record.records)) {
                console.log(`[Attendance Report] Record ${recordIndex} has no records array`);
                return;
            }

            record.records.forEach((r, rIndex) => {
                if (!r.studentMongoId) {
                    console.log(`[Attendance Report] Record ${recordIndex}, item ${rIndex} has no studentMongoId`);
                    return;
                }

                const sid = r.studentMongoId._id ? r.studentMongoId._id.toString() : r.studentMongoId.toString();
                if (!sid) {
                    console.log(`[Attendance Report] Could not extract student ID`);
                    return;
                }

                if (!studentMap.has(sid)) {
                    studentMap.set(sid, {
                        studentId: sid,
                        studentID: r.studentID || 'N/A',
                        studentName: r.studentName || 'Unknown',
                        email: r.studentMongoId.contact?.email || r.studentMongoId.email || '',
                        phone: r.studentMongoId.contact?.phone || r.studentMongoId.guardian?.phone || '',
                        photoLink: r.studentMongoId.photoLink || '',
                        records: []
                    });
                }
                studentMap.get(sid).records.push({
                    date: record.date,
                    status: r.status,
                    courseName: record.courseName,
                    batchNo: record.batchNo
                });
            });
        });

        const students = Array.from(studentMap.values());
        console.log('[Attendance Report] Unique students found:', students.length);

        students.forEach(s => {
            s.records.sort((a, b) => new Date(b.date) - new Date(a.date));
        });

        const absent4Days = [];
        const absent7Days = [];

        students.forEach(s => {
            const consecutive = countConsecutiveAbsences(attendanceRecords, s.studentId);
            s.consecutiveAbsences = consecutive;
            s.totalAbsences = s.records.filter(r => r.status === 'Absent' || r.status === 'Late').length;
            s.totalPresents = s.records.filter(r => r.status === 'Present').length;

            if (consecutive >= 7) {
                absent7Days.push(s);
            } else if (consecutive >= 4) {
                absent4Days.push(s);
            }
        });

        console.log('[Attendance Report] Absent 4+ days:', absent4Days.length);
        console.log('[Attendance Report] Absent 7+ days:', absent7Days.length);

        res.status(200).json({
            success: true,
            data: {
                absent4Days,
                absent7Days,
                allRecords: students,
                summary: {
                    totalStudents: students.length,
                    absent4DaysCount: absent4Days.length,
                    absent7DaysCount: absent7Days.length,
                    dateRange
                }
            }
        });
    } catch (err) {
        console.error('[Attendance Report] Error:', err);
        res.status(500).json({
            success: false,
            message: 'রিপোর্ট জেনারেট করতে সমস্যা: ' + err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

// @desc    Update attendance record (CRUD)
// @route   PUT /api/attendance/:id
exports.updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { records, date } = req.body;

        console.log('[Update Attendance] ID:', id);

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid attendance ID format'
            });
        }

        const attendance = await Attendance.findById(id);
        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'অ্যাটেনডেন্স রেকর্ড পাওয়া যায়নি'
            });
        }

        const todayStr = new Date().toLocaleDateString('en-CA');
        if (attendance.date !== todayStr && !req.admin) {
            return res.status(403).json({
                success: false,
                message: 'শুধুমাত্র আজকের অ্যাটেনডেন্স এডিট করা যাবে!'
            });
        }

        if (records) attendance.records = records;
        if (date) attendance.date = date;
        attendance.updatedAt = new Date();

        await attendance.save();

        res.status(200).json({
            success: true,
            message: 'অ্যাটেনডেন্স আপডেট হয়েছে',
            data: attendance
        });
    } catch (err) {
        console.error('[Update Attendance] Error:', err);
        res.status(500).json({
            success: false,
            message: 'আপডেট করতে সমস্যা: ' + err.message
        });
    }
};

// @desc    Delete attendance record (CRUD)
// @route   DELETE /api/attendance/:id
exports.deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('[Delete Attendance] ID:', id);

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid attendance ID format'
            });
        }

        const attendance = await Attendance.findById(id);
        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'অ্যাটেনডেন্স রেকর্ড পাওয়া যায়নি'
            });
        }

        await Attendance.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'অ্যাটেনডেন্স রেকর্ড মুছে ফেলা হয়েছে'
        });
    } catch (err) {
        console.error('[Delete Attendance] Error:', err);
        res.status(500).json({
            success: false,
            message: 'ডিলিট করতে সমস্যা: ' + err.message
        });
    }
};

// @desc    Send warning email to absent students
// @route   POST /api/attendance/send-warning
exports.sendWarning = async (req, res) => {
    try {
        const { studentIds, warningType } = req.body;

        if (!studentIds || !studentIds.length) {
            return res.status(400).json({
                success: false,
                message: 'কমপক্ষে একজন স্টুডেন্ট সিলেক্ট করুন'
            });
        }

        console.log('[Send Warning] Student IDs:', studentIds);
        console.log('[Send Warning] Type:', warningType);

        const students = await Student.find({
            _id: { $in: studentIds }
        }, 'fullName contact.email contact.phone studentID');

        console.log('[Send Warning] Found students:', students.length);

        const dateRange = getDateRange(7);
        const attendanceRecords = await Attendance.find({
            date: { $in: dateRange }
        }).populate('records.studentMongoId', '_id');

        const studentsWithAbsences = students.map(student => {
            const studentObj = student.toObject();
            studentObj.consecutiveAbsences = countConsecutiveAbsences(attendanceRecords, student._id);
            return studentObj;
        });

        const results = await sendBulkAttendanceWarnings(studentsWithAbsences, warningType);

        console.log('[Send Warning] Results:', results);

        res.status(200).json({
            success: true,
            message: `${results.sent.length} জনকে মেইল পাঠানো হয়েছে`,
            sent: results.sent,
            failed: results.failed
        });
    } catch (err) {
        console.error('[Send Warning] Error:', err);
        res.status(500).json({
            success: false,
            message: 'মেইল পাঠাতে সমস্যা: ' + err.message
        });
    }
};