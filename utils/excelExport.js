const ExcelJS = require('exceljs');

exports.generateStudentExcel = async (students) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Careerlift Admin';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Students_Data');

    // ১. কলাম ও হেডার সেটআপ
    worksheet.columns = [
        { header: 'Student ID', key: 'studentID', width: 15 },
        { header: 'Full Name', key: 'fullName', width: 25 },
        { header: 'Phone Number', key: 'phone', width: 18 },
        { header: 'Course Name', key: 'courseName', width: 22 },
        { header: 'Batch', key: 'batchNum', width: 12 },
        { header: 'Status', key: 'courseStatus', width: 15 },
        { header: 'Career Goals', key: 'careerGoal', width: 30 },
        { header: 'Visa Priority', key: 'visaPriority', width: 15 },
        { header: 'Address', key: 'fullAddress', width: 35 }
    ];

    // ২. হেডারের ডিজাইন (Corporate Styling)
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E40AF' } // Primary Dark Blue
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 25;

    // ৩. ডাটা পুশ করা
    students.forEach((s) => {
        worksheet.addRow({
            studentID: s.studentID,
            fullName: s.fullName,
            phone: s.contact?.phone || 'N/A',
            courseName: s.admissionInfo?.courseName || 'N/A',
            batchNum: s.admissionInfo?.batchNum || 'N/A',
            courseStatus: s.admissionInfo?.courseStatus || 'N/A',
            careerGoal: s.careerProfile?.careerGoal?.join(', ') || 'N/A',
            visaPriority: s.careerProfile?.visaPriority || 'Low',
            fullAddress: s.contact?.fullAddress || 'N/A'
        });
    });

    // ৪. বর্ডার ও এলাইনমেন্ট ঠিক করা
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            row.alignment = { vertical: 'middle', horizontal: 'left' };
        }
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'E2E8F0' } },
                left: { style: 'thin', color: { argb: 'E2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
                right: { style: 'thin', color: { argb: 'E2E8F0' } }
            };
        });
    });

    // বাফার রিটার্ন করা
    return await workbook.xlsx.writeBuffer();
};