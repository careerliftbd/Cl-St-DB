const express = require('express');
const router = express.Router();

// ── Controllers ইমপোর্ট ──
const {
    addStudent,
    getStudents,
    getStudentById,
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

router.route('/')
    .post(addStudent)
    .get(getStudents);

router.get('/export', exportStudentsExcel);

// ── NEW: Enroll in new course (uses $push) ──
router.post('/:id/enroll', enrollInNewCourse);

// ── NEW: Update documents (uses $set) ──
router.patch('/:id/documents', updateDocuments);

// ── UPDATED: Enrollment-specific status update ──
router.patch('/:id/enrollments/:enrollmentId/status', updateEnrollmentStatus);

router.put('/:id', updateStudent);

router.route('/:studentID')
    .get(getStudentById)
    .delete(deleteStudent);

module.exports = router;