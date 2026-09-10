const express = require('express');
const router = express.Router();
const {
    getClassStudents,
    submitAttendance,
    getAttendanceRecord,
    getAttendanceById,
    getDropdownOptions,
    getAttendanceReport,
    updateAttendance,
    deleteAttendance,
    sendWarning
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// ═══════════════════════════════════════════════════════════════
// ⚠️ CRITICAL: Static/specific routes MUST come BEFORE dynamic /:id routes
// ═══════════════════════════════════════════════════════════════

// Teacher/Admin — get students for attendance
router.get('/students', protect, getClassStudents);

// Submit attendance
router.post('/', protect, submitAttendance);

// Get specific attendance record (by query params: course, batch, date)
router.get('/record', protect, getAttendanceRecord);

// Dropdown options (batches)
router.get('/options', protect, getDropdownOptions);

// Continuous absence report
router.get('/report', protect, getAttendanceReport);

// Send warning email
router.post('/send-warning', protect, sendWarning);

// ═══════════════════════════════════════════════════════════════
// Dynamic routes with :id LAST (these catch anything)
// ═══════════════════════════════════════════════════════════════

// Get attendance record by MongoDB _id
router.get('/:id', protect, getAttendanceById);

// CRUD Update attendance
router.put('/:id', protect, updateAttendance);

// CRUD Delete attendance
router.delete('/:id', protect, deleteAttendance);

module.exports = router;