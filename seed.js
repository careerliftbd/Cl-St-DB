require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Student = require('./models/Student');

// ব্লাড গ্রুপ ক্লিন করার আরও শক্তিশালী ফাংশন
const cleanBloodGroup = (bg) => {
    // যদি ব্লাড গ্রুপ ফাঁকা থাকে বা N/A হয়, তবে ডিফল্ট 'O+' পাঠিয়ে দিচ্ছি
    if (!bg || bg.toString().trim() === "" || bg.toString().toUpperCase() === "N/A") {
        return "O+"; 
    }
    
    let group = bg.toString().toUpperCase().replace(/\s/g, '').replace(/"/g, '');
    
    // POSITIVE বা + থাকলে কনভার্ট করা
    if (group.includes('POSITIVE')) group = group.replace('POSITIVE', '+');
    if (group.includes('NEGATIVE')) group = group.replace('NEGATIVE', '-');
    if (group === 'OPOSETIVE' || group === 'OPOSITIVE') return 'O+';
    if (group === 'ABPOSETIVE') return 'AB+';
    
    // আপনার মডেলে সাধারণত এই ৮টি ভ্যালু থাকে। এগুলোর বাইরে কিছু হলে ডিফল্ট 'O+'
    const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    return validGroups.includes(group) ? group : "O+";
};

const cleanMaritalStatus = (status) => {
    if (!status) return "Single";
    let s = status.toString().trim().toLowerCase();
    if (s.includes('singel') || s.includes('single')) return 'Single';
    if (s.includes('married')) return 'Married';
    return "Single";
};

const seedExcelData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB...");

        const workbook = xlsx.readFile('./students_data.xlsx');
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`📊 Found ${sheetData.length} students. Starting import...`);

        for (let row of sheetData) {
            // চেক করা হচ্ছে এই স্টুডেন্ট অলরেডি আছে কি না (নাম ও ফোন দিয়ে)
            const existingStudent = await Student.findOne({ 
                fullName: row["Name of Candidate in English"],
                "contact.phone": row["Mobile Number"] ? row["Mobile Number"].toString().trim() : ""
            });

            if (existingStudent) {
                console.log(`⏩ Skipping (Already exists): ${row["Name of Candidate in English"]}`);
                continue;
            }

            const count = await Student.countDocuments();
            const newID = `CL-26-${(count + 1).toString().padStart(3, '0')}`;

            const newStudent = new Student({
                studentID: newID,
                fullName: row["Name of Candidate in English"] || "Unknown",
                dob: row["Date of Birth"] ? new Date(row["Date of Birth"]) : new Date(),
                gender: row["Gender"] || "Other",
                bloodGroup: cleanBloodGroup(row["Blood Group"]),
                religion: row["Religion"] || "Islam",
                maritalStatus: cleanMaritalStatus(row["Marital status"]),
                nidOrBirthCert: `${row["Identification type"] || "NID"}: ${row["NID / Birth Certificate Number"] || "Pending"}`,
                photoLink: row["Upload Photo (300*300) Only .png"] || "https://via.placeholder.com/150",
                
                contact: {
                    phone: row["Mobile Number"] ? row["Mobile Number"].toString().trim() : "000",
                    email: row["Email"] || "",
                    guardianName: row["Father's Name in English"] || "N/A",
                    guardianPhone: row["Emergency Contact Number"] ? row["Emergency Contact Number"].toString().trim() : "000",
                    fullAddress: row["Permanent Address (village, Post Office , Upozilla, District, Division)"] || "Pending"
                },

                parentsInfo: {
                    fatherName: row["Father's Name in English"] || "N/A",
                    fatherProfession: row["Father's Occupation"] || "N/A",
                    motherName: row["Mother's Name in English"] || "N/A",
                    motherProfession: row["Mother's Occupation"] || "N/A"
                },

                educationalBackground: row["Highest Education Level"] || "N/A",

                admissionInfo: {
                    courseName: row["Occupation Name"] || "General Caregiving",
                    batchNum: "Batch-01",
                    courseStatus: "Running",
                    courseType: "Paid",
                    admissionDate: new Date()
                },

                careerProfile: {
                    careerGoal: ["Study Abroad"],
                    passportStatus: "No Passport",
                    visaPriority: "Medium"
                }
            });

            await newStudent.save();
            console.log(`🚀 Imported: ${newStudent.fullName} [${newID}]`);
        }

        console.log("\n✨--- All Data Successfully Imported! ---✨");
        process.exit();

    } catch (error) {
        console.error("❌ Error seeding data:", error.message);
        process.exit(1);
    }
};

seedExcelData();