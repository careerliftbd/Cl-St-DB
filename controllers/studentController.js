const Student = require('../models/Student');

// @desc    নতুন স্টুডেন্ট যুক্ত করা (Add Student)
// @route   POST /api/students
exports.addStudent = async (req, res) => {
    try {
        const studentData = req.body;

        // অটোমেটিক Unique Student ID তৈরি করা (যেমন: CL-26-001)
        const count = await Student.countDocuments();
        const nextIdNum = (count + 1).toString().padStart(3, '0');
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const studentID = `CL-${currentYear}-${nextIdNum}`;

        studentData.studentID = studentID;

        const student = new Student(studentData);
        await student.save();

        res.status(201).json({
            success: true,
            message: 'শিক্ষার্থীর তথ্য সফলভাবে যুক্ত করা হয়েছে!',
            data: student
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'এই আইডি দিয়ে ইতোমধ্যে শিক্ষার্থী যুক্ত করা আছে।' });
        }
        res.status(500).json({ success: false, message: 'সার্ভার এরর: ' + error.message });
    }
};

// @desc    সকল স্টুডেন্ট বা ফিল্টার করা স্টুডেন্ট লিস্ট আনা (Get Students with Search & Filter)
// @route   GET /api/students
exports.getStudents = async (req, res) => {
    try {
        const { search, status, goal, courseName } = req.query; // courseName যুক্ত করা হয়েছে
        let query = {};

        // ১. পেজ বা স্ট্যাটাস অনুযায়ী ফিল্টার (Running, Completed/Alumni, Dropped, Next)
        if (status) {
            if (status === 'Alumni') {
                query['admissionInfo.courseStatus'] = 'Completed';
            } else {
                query['admissionInfo.courseStatus'] = status;
            }
        }

        // ২. ক্যারিয়ার গোল অনুযায়ী ফিল্টার (Study Abroad, Govt Job ইত্যাদি)
        if (goal) {
            query['careerProfile.careerGoal'] = goal;
        }

        // ৩. কোর্স নাম অনুযায়ী ফিল্টার
        if (courseName) {
            query['admissionInfo.courseName'] = courseName;
        }

        // ৪. লাইভ সার্চ (নাম, ফোন নাম্বার বা স্টুডেন্ট আইডি দিয়ে খোঁজা)
        if (search) {
            query['$or'] = [
                { fullName: { $regex: search, $options: 'i' } },
                { studentID: { $regex: search, $options: 'i' } },
                { 'contact.phone': { $regex: search, $options: 'i' } }
            ];
        }

        // ডাটাবেস থেকে কুয়েরি অনুযায়ী ডাটা আনা (সর্টিং: নতুন ভর্তি হওয়া স্টুডেন্ট লিস্টের ওপরে থাকবে)
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

// @desc    নির্দিষ্ট একজন শিক্ষার্থীর সম্পূর্ণ প্রোফাইল আনা (Get Single Student Profile)
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

// @desc    শিক্ষার্থীর সব তথ্য আপডেট করা (Full CRUD Update)
// @route   PUT /api/students/:id
exports.updateStudent = async (req, res) => {
    try {
        // আইডি বাদে বডির সব ডাটা দিয়ে আপডেট করা
        const updatedData = req.body;

        // যেহেতু রাউটে :id ব্যবহার করা হবে, তাই req.params.id দিয়ে খোঁজা হচ্ছে
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

// @desc    শিক্ষার্থীর ডাটা মুছে ফেলা (Delete Student)
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

// @desc    শিক্ষার্থীর কোর্স স্ট্যাটাস আপডেট করা
// @route   PATCH /api/students/:id/status
exports.updateStudentStatus = async (req, res) => {
    try {
        const { status } = req.body;

        // স্ট্যাটাস ভ্যালিডেশন
        const validStatuses = ['Running', 'Completed', 'Dropped', 'Suspended', 'Next'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'অবৈধ স্ট্যাটাস!' });
        }

        // ডাটাবেসে স্ট্যাটাস আপডেট করা
        const updatedStudent = await Student.findOneAndUpdate(
            { studentID: req.params.id },
            { $set: { 'admissionInfo.courseStatus': status } },
            { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ success: false, message: 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!' });
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

// @desc    শিক্ষার্থীদের ডাটা এক্সেল ফাইল হিসেবে ডাউনলোড করা
// @route   GET /api/students/export
exports.exportStudentsExcel = async (req, res) => {
    try {
        const { search, status, goal, courseName } = req.query;
        const { generateStudentExcel } = require('../utils/excelExport');

        // ফিল্টার কুয়েরি তৈরি (GET /api/students এর মতো হুবহু)
        let query = {};
        if (status) query['admissionInfo.courseStatus'] = status;
        if (goal) query['careerProfile.careerGoal'] = goal;
        if (courseName) query['admissionInfo.courseName'] = courseName;
        if (search) {
            query['$or'] = [
                { fullName: { $regex: search, $options: 'i' } },
                { studentID: { $regex: search, $options: 'i' } },
                { 'contact.phone': { $regex: search, $options: 'i' } }
            ];
        }

        const students = await Student.find(query).sort({ createdAt: -1 });

        // এক্সেল বাফার তৈরি
        const buffer = await generateStudentExcel(students);

        // রেসপন্স হেডার সেট করে ফাইল পাঠানো
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Careerlift_Students_${Date.now()}.xlsx`);

        res.status(200).send(buffer);

    } catch (error) {
        console.error('Excel Export Error:', error);
        res.status(500).json({ success: false, message: 'এক্সেল তৈরিতে সমস্যা হয়েছে!' });
    }
};