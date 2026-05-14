const express = require('express');
const router = express.Router();
const {
    addStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    updateStudentStatus,
    exportStudentsExcel
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

// এই লাইনের কারণে নিচের সব রাউট অত্যন্ত সুরক্ষিত (Protected) হয়ে যাবে
router.use(protect);

// রাউটসমূহ
router.route('/')
    .post(addStudent)       // POST /api/students
    .get(getStudents);      // GET  /api/students (সার্চ ও ফিল্টারসহ)

// 📥 এক্সেল এক্সপোর্ট রাউট (অবশ্যই ডাইনামিক প্যারামিটার রাউটের ওপরে রাখতে হবে)
router.get('/export', exportStudentsExcel);

// স্ট্যাটাস আপডেটের জন্য PATCH রাউট
router.patch('/:id/status', updateStudentStatus);

// প্রোফাইল এডিট রাউট (PUT)
router.put('/:id', updateStudent);

// সিঙ্গেল প্রফাইল আনা (GET) ও মুছে ফেলা (DELETE)
router.route('/:studentID')
    .get(getStudentById)    // GET    /api/students/CL-26-001
    .delete(deleteStudent); // DELETE /api/students/CL-26-001

module.exports = router;