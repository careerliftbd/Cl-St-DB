const nodemailer = require('nodemailer');

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} [options.html] - HTML body (optional)
 * @param {string} [options.from] - Sender name (optional)
 * @returns {Promise<Object>} - Nodemailer info object
 */
const sendEmail = async (options) => {
    try {
        // ── 1. Validate required fields ──
        if (!options.to || !options.subject || (!options.text && !options.html)) {
            throw new Error('Missing required fields: to, subject, text/html');
        }

        // ── 2. Create transporter ──
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // ── 3. Verify transporter connection ──
        await transporter.verify();

        // ── 4. Build mail options ──
        const mailOptions = {
            from: `"${options.from || 'Careerlift Admin'}" <${process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
        };

        // Add HTML if provided
        if (options.html) {
            mailOptions.html = options.html;
        }

        // ── 5. Send email ──
        const info = await transporter.sendMail(mailOptions);

        console.log(`✅ Email sent to ${options.to}: ${info.messageId}`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error(`❌ Email failed to ${options?.to}:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send attendance warning email (pre-built template)
 * @param {Object} student - Student object
 * @param {string} type - '4day' | '7day'
 * @param {number} consecutiveDays - Number of consecutive absence days
 * @returns {Promise<Object>}
 */
const sendAttendanceWarning = async (student, type, consecutiveDays) => {
    const isCritical = type === '7day';

    const subject = isCritical 
        ? '⚠️ গুরুতর সতর্কতা: ৭ দিন ধরে অনুপস্থিত — Careerlift'
        : '⚠️ সতর্কতা: টানা অনুপস্থিত — Careerlift';

    const greeting = `প্রিয় ${student.fullName || student.name || 'Student'},`;

    const messageBody = isCritical
        ? `আমরা লক্ষ্য করেছি যে আপনি গত ${consecutiveDays} দিন ধরে ক্লাসে অনুপস্থিত। এটি আপনার কোর্স সম্পন্ন করার জন্য একটি গুরুতর হুমকি। দয়া করে অবিলম্বে প্রশাসনের সাথে যোগাযোগ করুন এবং আপনার অনুপস্থিতির কারণ জানান।`
        : `আমরা লক্ষ্য করেছি যে আপনি গত ${consecutiveDays} দিন ধরে ক্লাসে অনুপস্থিত। নিয়মিত উপস্থিত না হলে আপনার কোর্স চলমান থাকা বন্ধ হতে পারে। দয়া করে ক্লাসে ফিরে আসুন।`;

    const textBody = `${greeting}\n\n${messageBody}\n\nআপনার স্টুডেন্ট আইডি: ${student.studentID || 'N/A'}\n\nধন্যবাদ,\nCareerlift Training Center\nPhone: 017XXXXXXXX\nEmail: ${process.env.EMAIL_USER}`;

    const htmlBody = `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header { background: ${isCritical ? 'linear-gradient(135deg, #dc2626, #991b1b)' : 'linear-gradient(135deg, #f97316, #ea580c)'}; padding: 30px 24px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
            .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
            .content { padding: 30px 24px; }
            .content p { color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
            .alert-box { background: ${isCritical ? '#fef2f2' : '#fff7ed'}; border-left: 4px solid ${isCritical ? '#dc2626' : '#f97316'}; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
            .alert-box p { margin: 0; color: ${isCritical ? '#991b1b' : '#9a3412'}; font-weight: 600; }
            .student-id { display: inline-block; background: #f3f4f6; padding: 6px 14px; border-radius: 6px; font-family: monospace; font-size: 14px; color: #4b5563; margin: 10px 0; }
            .footer { background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #6b7280; font-size: 13px; margin: 4px 0; }
            .btn { display: inline-block; background: ${isCritical ? '#dc2626' : '#f97316'}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚠️ ${isCritical ? 'গুরুতর সতর্কতা' : 'সতর্কতা বিজ্ঞপ্তি'}</h1>
                <p>Careerlift Training Center</p>
            </div>
            <div class="content">
                <p><strong>${greeting}</strong></p>
                <p>${messageBody}</p>
                <div class="alert-box">
                    <p>📅 টানা অনুপস্থিতির দিন: <strong>${consecutiveDays} দিন</strong></p>
                </div>
                <p>আপনার স্টুডেন্ট আইডি:</p>
                <div class="student-id">${student.studentID || 'N/A'}</div>
                <p style="margin-top: 20px;">কোনো প্রশ্ন থাকলে দয়া করে আমাদের সাথে যোগাযোগ করুন:</p>
                <p>📞 Phone: 017XXXXXXXX<br>📧 Email: ${process.env.EMAIL_USER}</p>
            </div>
            <div class="footer">
                <p>এটি Careerlift Training Center এর একটি অটোমেটেড বিজ্ঞপ্তি।</p>
                <p style="font-size: 12px; color: #9ca3af;">© 2026 Careerlift. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>`;

    return await sendEmail({
        to: student.contact?.email || student.email,
        subject: subject,
        text: textBody,
        html: htmlBody,
        from: 'Careerlift Attendance System'
    });
};

/**
 * Send bulk attendance warnings to multiple students
 * @param {Array} students - Array of student objects
 * @param {string} type - '4day' | '7day'
 * @returns {Promise<Object>} - Summary of sent/failed emails
 */
const sendBulkAttendanceWarnings = async (students, type) => {
    const results = { sent: [], failed: [] };

    for (const student of students) {
        const email = student.contact?.email || student.email;
        if (!email) {
            results.failed.push({ student: student.fullName || student.name, reason: 'No email address' });
            continue;
        }

        const result = await sendAttendanceWarning(student, type, student.consecutiveAbsences || (type === '7day' ? 7 : 4));

        if (result.success) {
            results.sent.push(student.fullName || student.name);
        } else {
            results.failed.push({ student: student.fullName || student.name, reason: result.error });
        }
    }

    return results;
};

module.exports = { sendEmail, sendAttendanceWarning, sendBulkAttendanceWarnings };