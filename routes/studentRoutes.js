const express = require('express');
const router = express.Router();
const {
    addStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    updateStudentStatus,
    exportStudentsExcel,
    getPublicAlumni
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

// Public route — NO auth required
router.get('/public-alumni', getPublicAlumni);

// Protected routes — auth required from here
router.use(protect);

router.route('/')
    .post(addStudent)
    .get(getStudents);

router.get('/export', exportStudentsExcel);
router.patch('/:id/status', updateStudentStatus);
router.put('/:id', updateStudent);
router.route('/:studentID')
    .get(getStudentById)
    .delete(deleteStudent);

module.exports = router;