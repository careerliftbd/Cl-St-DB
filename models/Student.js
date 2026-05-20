const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    // ── 1. Basic Profile Info (Unique per student) ──
    studentID: { 
        type: String, 
        required: true, 
        unique: true 
    },
    fullName: { 
        type: String, 
        required: true 
    },
    dob: { 
        type: Date, 
        required: true 
    },
    gender: { 
        type: String, 
        required: true 
    },
    bloodGroup: { 
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', '']
    },
    religion: { type: String },
    maritalStatus: { 
        type: String, 
        required: true 
    },
    spouseInfo: {
        name: { type: String },
        profession: { type: String }
    },
    
    // ── 2. Documents Object (Updated via $set) ──
    documents: {
        nid: { type: String, default: null },
        birthCertificate: { type: String, default: null }
    },
    
    // Google Drive Image View Link
    photoLink: { 
        type: String,
        required: true 
    },
    
    // ── 3. Contact Info (phone is UNIQUE identifier) ──
    contact: {
        phone: { 
            type: String, 
            required: true,
            unique: true  // ← এটিই ইনডেক্স তৈরি করবে
        },
        email: { 
            type: String,
            unique: true, // ← এটিই ইনডেক্স তৈরি করবে
            sparse: true 
        },
        guardianName: { type: String, required: true },
        guardianPhone: { type: String, required: true },
        fullAddress: { type: String, required: true }
    },
    
    parentsInfo: {
        fatherName: { type: String, required: true },
        fatherProfession: { type: String },
        motherName: { type: String, required: true },
        motherProfession: { type: String }
    },
    
    educationalBackground: { 
        type: String, 
        required: true 
    },
    
    // ── 4. Enrollments Array (New courses $push here) ──
    enrollments: [
        {
            courseName: { type: String, required: true },
            batchNo: { type: String, required: true },
            courseType: { 
                type: String, 
                enum: ['Paid', 'Free'], 
                default: 'Paid' 
            },
            enrollmentDate: { type: Date, default: Date.now },
            status: { 
                type: String, 
                enum: ['Running', 'Dropped', 'Completed', 'Suspended', 'Next'],
                default: 'Running'
            }
        }
    ],
    
    skillsAndLanguages: {
        skills: { type: String },
        languages: { type: String }
    },
    
    careerProfile: {
        careerGoal: { 
            type: [String], 
            required: true 
        },
        expectedCountry: { type: String },
        preferredSector: { type: String },
        passportStatus: { 
            type: String,
            enum: ['Have Passport', 'Applied', 'Expired', 'No Passport'],
            default: 'No Passport'
        },
        financialReadiness: { type: String },
        englishProficiency: { type: String },
        ieltsScore: { type: String },
        visaPriority: { 
            type: String, 
            enum: ['Low', 'Medium', 'Hot'],
            default: 'Low'
        }
    },
    
    comment: { type: String }
}, { timestamps: true });

// ── Indexes for Performance (Duplicate phone/email removed) ──
studentSchema.index({ 'careerProfile.careerGoal': 1 });
studentSchema.index({ 'enrollments.status': 1 });
studentSchema.index({ 'enrollments.courseName': 1 });

module.exports = mongoose.model('Student', studentSchema);