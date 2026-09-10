const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    courseName: { type: String, required: true },
    batchNo: { type: String, required: true },
    date: { type: String, required: true }, // Format: "YYYY-MM-DD"
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    teacherEmail: { type: String }, // backup reference

    records: [
        {
            studentMongoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
            studentID: { type: String, required: true },
            studentName: { type: String, required: true },
            status: { 
                type: String, 
                enum: ['Present', 'Absent', 'Late', 'Leave'], 
                default: 'Present' 
            }
        }
    ]
}, { timestamps: true });

// Prevent duplicate entries for same batch on same day
attendanceSchema.index({ courseName: 1, batchNo: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);