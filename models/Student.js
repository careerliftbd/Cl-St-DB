const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
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
    religion: { 
        type: String 
    },
    maritalStatus: { 
        type: String, 
        required: true 
    },
    spouseInfo: {
        name: { type: String },
        profession: { type: String }
    },
    // NID বা Birth Certificate এর টাইপ এবং নাম্বার একসাথে স্টোর হবে
    nidOrBirthCert: { 
        type: String, 
        required: true 
    },
    // Google Drive Image View Link
    photoLink: { 
        type: String,
        required: true 
    },
    contact: {
        phone: { type: String, required: true },
        email: { type: String },
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
    admissionInfo: {
        admissionDate: { type: Date, default: Date.now },
        courseName: { type: String, required: true },
        batchNum: { type: String, required: true },
        courseStatus: { 
            type: String, 
            enum: ['Running', 'Dropped', 'Completed', 'Suspended', 'Next'],
            default: 'Running'
        },
        courseType: { 
            type: String, 
            enum: ['Paid', 'Free'],
            required: true 
        }
    },
    skillsAndLanguages: {
        skills: { type: String },
        languages: { type: String }
    },
    careerProfile: {
        // এখন এটি একাধিক গোল (Array of Strings) স্টোর করতে পারবে
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

// উন্নত পারফরম্যান্স এবং ফিল্টারিংয়ের জন্য ইনডেক্সিং
studentSchema.index({ 'careerProfile.careerGoal': 1 });
studentSchema.index({ 'admissionInfo.courseStatus': 1 });

module.exports = mongoose.model('Student', studentSchema);