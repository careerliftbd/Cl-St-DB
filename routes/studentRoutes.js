const express = require('express');
const router = express.Router();

// ── Controllers ইমপোর্ট ──
const {
    addStudent,
    getStudents,
    getStudentById,
    getStudentByMongoId,  // 🆕 NEW: Get by MongoDB _id
    updateStudent,
    deleteStudent,
    updateEnrollmentStatus,
    enrollInNewCourse,
    updateDocuments,
    exportStudentsExcel,
    getPublicAlumni
} = require('../controllers/studentController');

// ── Middleware ইমপোর্ট ──
const { protect } = require('../middleware/authMiddleware');

// Public route — NO auth required
router.get('/public-alumni', getPublicAlumni);

// Protected routes — auth required from here
router.use(protect);

// 🆕 IMPORTANT: Specific/static routes MUST come BEFORE dynamic /:id routes
router.get('/export', exportStudentsExcel);

router.route('/')
    .post(addStudent)
    .get(getStudents);

// 🆕 NEW: Get student by MongoDB _id (for attendance/profile navigation)
router.get('/profile/:id', getStudentByMongoId);

// ── NEW: Enroll in new course (uses $push) ──
router.post('/:id/enroll', enrollInNewCourse);

// ── NEW: Update documents (uses $set) ──
router.patch('/:id/documents', updateDocuments);

// ── UPDATED: Enrollment-specific status update ──
router.patch('/:id/enrollments/:enrollmentId/status', updateEnrollmentStatus);

router.put('/:id', updateStudent);

// Dynamic routes LAST (these catch anything)
router.route('/:studentID')
    .get(getStudentById)
    .delete(deleteStudent);

module.exports = router;