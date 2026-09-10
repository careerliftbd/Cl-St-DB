const Student = require('../models/Student');
const { generateStudentExcel } = require('../utils/excelExport');

// @desc    নতুন স্টুডেন্ট যুক্ত করা (Add Student)
// @route   POST /api/students
exports.addStudent = async (req, res) => {
    try {
        const { phone, email } = req.body.contact || req.body;

        const duplicateQuery = { $or: [] };
        if (phone) duplicateQuery.$or.push({ 'contact.phone': phone });
        if (email) duplicateQuery.$or.push({ 'contact.email': email });

        if (duplicateQuery.$or.length > 0) {
            const existingStudent = await Student.findOne(duplicateQuery);
            if (existingStudent) {
                return res.status(409).json({
                    success: false,
                    message: 'এই ফোন নম্বর বা ইমেইল দিয়ে আগে থেকেই একটি প্রোফাইল আছে! দয়া করে নতুন কোর্স অ্যাড করতে তার প্রোফাইল আপডেট করুন।',
                    studentId: existingStudent._id,
                    studentID: existingStudent.studentID
                });
            }
        }

        const count = await Student.countDocuments();
        const nextIdNum = (count + 1).toString().padStart(3, '0');
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const studentID = `CL-${currentYear}-${nextIdNum}`;

        const studentData = {
            studentID,
            fullName: req.body.fullName,
            dob: req.body.dob,
            gender: req.body.gender,
            bloodGroup: req.body.bloodGroup,
            religion: req.body.religion,
            maritalStatus: req.body.maritalStatus,
            spouseInfo: req.body.spouseInfo,
            documents: req.body.documents || {},
            photoLink: req.body.photoLink,
            contact: req.body.contact,
            parentsInfo: req.body.parentsInfo,
            educationalBackground: req.body.educationalBackground,
            enrollments: req.body.enrollments || [{
                courseName: req.body.courseName,
                batchNo: req.body.batchNo,
                courseType: req.body.courseType || 'Paid',
                status: req.body.courseStatus || 'Running'
            }],
            skillsAndLanguages: req.body.skillsAndLanguages,
            careerProfile: req.body.careerProfile,
            comment: req.body.comment
        };

        const student = new Student(studentData);
        await student.save();

        res.status(201).json({
            success: true,
            message: 'শিক্ষার্থীর তথ্য সফলভাবে যুক্ত করা হয়েছে!',
            data: student
        });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(409).json({ 
                success: false, 
                message: `এই ${field} দিয়ে ইতোমধ্যে শিক্ষার্থী যুক্ত করা আছে।` 
            });
        }
        res.status(500).json({ success: false, message: 'সার্ভার এরর: ' + error.message });
    }
};

// @desc    নতুন কোর্সে এনরোল করা (Add Course to Existing Student)
// @route   POST /api/students/:id/enroll
exports.enrollInNewCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { courseName, batchNo, courseType, status } = req.body;

        const updateQuery = {
            $push: {
                enrollments: {
                    courseName,
                    batchNo,
                    courseType: courseType || 'Paid',
                    status: status || 'Running',
                    enrollmentDate: new Date()
                }
            }
        };

        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            updateQuery,
            { new: true, runValidators: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ success: false, message: 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!' });
        }

        res.status(200).json({
            success: true,
            message: 'নতুন কোর্স সফলভাবে যুক্ত হয়েছে!',
            data: updatedStudent
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'এনরোলমেন্ট এরর: ' + error.message });
    }
};

// @desc    ডকুমেন্ট আপডেট করা
// @route   PATCH /api/students/:id/documents
exports.updateDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { nid, birthCertificate } = req.body;

        const updateQuery = { $set: {} };
        if (nid !== undefined) updateQuery.$set['documents.nid'] = nid;
        if (birthCertificate !== undefined) updateQuery.$set['documents.birthCertificate'] = birthCertificate;

        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            updateQuery,
            { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ success: false, message: 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!' });
        }

        res.status(200).json({
            success: true,
            message: 'ডকুমেন্ট সফলভাবে আপডেট হয়েছে!',
            data: updatedStudent
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'ডকুমেন্ট আপডেট এরর: ' + error.message });
    }
};

// @desc    সকল স্টুডেন্ট লিস্ট
// @route   GET /api/students
exports.getStudents = async (req, res) => {
    try {
        const { search, status, goal, courseName, batch } = req.query;
        let query = {};

        if (status) {
            query['enrollments.status'] = status === 'Alumni' ? 'Completed' : status;
        }

        if (goal) {
            query['careerProfile.careerGoal'] = goal;
        }

        if (courseName) {
            query['enrollments.courseName'] = { $regex: courseName, $options: 'i' };
        }

        if (batch) {
            query['enrollments.batchNo'] = batch;
        }

        if (search) {
            query['$or'] = [
                { fullName: { $regex: search, $options: 'i' } },
                { studentID: { $regex: search, $options: 'i' } },
                { 'contact.phone': { $regex: search, $options: 'i' } }
            ];
        }

        const students = await Student.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'সার্ভার এরর: ' + error.message });
    }
};

// @desc    নির্দিষ্ট শিক্ষার্থীর প্রোফাইল (by studentID like CL-26-001)
// @route   GET /api/students/:studentID
exports.getStudentById = async (req, res) => {
    try {
        const student = await Student.findOne({ studentID: req.params.studentID });

        if (!student) {
            return res.status(404).json({ success: false, message: 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!' });
        }

        res.status(200).json({
            success: true,
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'সার্ভার এরর: ' + error.message });
    }
};

// 🆕 NEW: Get student by MongoDB _id (for attendance/profile navigation)
// @route   GET /api/students/profile/:id
exports.getStudentByMongoId = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ success: false, message: 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!' });
        }

        res.status(200).json({
            success: true,
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'সার্ভার এরর: ' + error.message });
    }
};

// @desc    শিক্ষার্থীর তথ্য আপডেট
// @route   PUT /api/students/:id
exports.updateStudent = async (req, res) => {
    try {
        const updatedData = req.body;

        const student = await Student.findOneAndUpdate(
            { studentID: req.params.id },
            { $set: updatedData },
            { new: true, runValidators: true }
        );

        if (!student) {
            return res.status(404).json({ success: false, message: 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'প্রোফাইল সফলভাবে আপডেট হয়েছে!', 
            data: student 
        });
    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ success: false, message: 'আপডেট করতে সমস্যা হয়েছে!' });
    }
};

// @desc    শিক্ষার্থী মুছে ফেলা
// @route   DELETE /api/students/:studentID
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findOneAndDelete({ studentID: req.params.studentID });

        if (!student) {
            return res.status(404).json({ success: false, message: 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!' });
        }

        res.status(200).json({
            success: true,
            message: 'শিক্ষার্থীর তথ্য সিস্টেম থেকে মুছে ফেলা হয়েছে!'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'সার্ভার এরর: ' + error.message });
    }
};

// @desc    কোর্স স্ট্যাটাস আপডেট
// @route   PATCH /api/students/:id/enrollments/:enrollmentId/status
exports.updateEnrollmentStatus = async (req, res) => {
    try {
        const { id, enrollmentId } = req.params;
        const { status } = req.body;

        const validStatuses = ['Running', 'Completed', 'Dropped', 'Suspended', 'Next'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'অবৈধ স্ট্যাটাস!' });
        }

        const updatedStudent = await Student.findOneAndUpdate(
            { _id: id, 'enrollments._id': enrollmentId },
            { $set: { 'enrollments.$.status': status } },
            { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ success: false, message: 'শিক্ষার্থী বা এনরোলমেন্ট খুঁজে পাওয়া যায়নি!' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'স্ট্যাটাস সফলভাবে আপডেট হয়েছে!', 
            data: updatedStudent 
        });
    } catch (error) {
        console.error('Status Update Error:', error);
        res.status(500).json({ success: false, message: 'স্ট্যাটাস আপডেটে সার্ভার এরর!' });
    }
};

// @desc    এক্সেল এক্সপোর্ট
// @route   GET /api/students/export
exports.exportStudentsExcel = async (req, res) => {
    try {
        const { search, status, goal, courseName, batch } = req.query;

        let query = {};
        if (status) query['enrollments.status'] = status === 'Alumni' ? 'Completed' : status;
        if (goal) query['careerProfile.careerGoal'] = goal;
        if (courseName) query['enrollments.courseName'] = courseName;
        if (batch) query['enrollments.batchNo'] = batch;
        if (search) {
            query['$or'] = [
                { fullName: { $regex: search, $options: 'i' } },
                { studentID: { $regex: search, $options: 'i' } },
                { 'contact.phone': { $regex: search, $options: 'i' } }
            ];
        }

        const students = await Student.find(query).sort({ createdAt: -1 });
        const buffer = await generateStudentExcel(students);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Careerlift_Students_${Date.now()}.xlsx`);
        res.status(200).send(buffer);

    } catch (error) {
        console.error('Excel Export Error:', error);
        res.status(500).json({ success: false, message: 'এক্সেল তৈরিতে সমস্যা হয়েছে!' });
    }
};

// @desc    পাবলিক অ্যালামনাই ডেটা
// @route   GET /api/students/public-alumni
exports.getPublicAlumni = async (req, res) => {
    try {
        const alumni = await Student.find({ 'enrollments.status': 'Completed' })
            .select('fullName photoLink enrollments.courseName enrollments.batchNo -_id')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: alumni.length,
            data: alumni
        });
    } catch (error) {
        console.error("Public Alumni API Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};