const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// ================= PUBLIC =================
router.post('/login', teacherController.loginTeacher);

// ================ TEACHER ================
router.get('/profile', protect, teacherController.getTeacherProfile);
router.get('/attendance-history', protect, teacherController.getTeacherAttendanceHistory);
router.get('/notifications', protect, teacherController.getTeacherNotifications);

// ================= ADMIN =================
router.post('/', protect, adminOnly, teacherController.addTeacher);
router.get('/', protect, adminOnly, teacherController.getAllTeachers);
router.get('/:id', protect, adminOnly, teacherController.getTeacherById);
router.put('/:id', protect, adminOnly, teacherController.updateTeacher);
router.delete('/:id', protect, adminOnly, teacherController.deleteTeacher);
router.patch('/:id/toggle-status', protect, adminOnly, teacherController.toggleTeacherStatus);

// Course Assignment
router.post('/assign-course', protect, adminOnly, teacherController.assignNewCourse);
router.delete('/remove-course', protect, adminOnly, teacherController.removeAssignedCourse);

module.exports = router;