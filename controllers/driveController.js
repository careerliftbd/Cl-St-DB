const { google } = require('googleapis');
const stream = require('stream');

// ১. OAuth2 ক্লায়েন্ট ইনিশিয়ালাইজ করা
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
);

// ২. Refresh Token সেট করা
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });

// ৩. ড্রাইভ এপিআই অবজেক্ট তৈরি করা
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// @desc    ফাইল আপলোড করে সরাসরি View Link জেনারেট করা
// @route   POST /api/drive/upload
exports.uploadImageToDrive = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'কোনো ফাইল সিলেক্ট করা হয়নি!' });
        }

        // ✅ ফাইল সাইজ চেক (5MB লিমিট Multer-এ আছে, তবু নিরাপত্তার জন্য)
        if (!req.file.buffer || req.file.buffer.length === 0) {
            return res.status(400).json({ success: false, message: 'ফাইলটি খালি বা ভাঙা!' });
        }

        // ✅ ফোল্ডার ID চেক
        if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
            return res.status(500).json({ success: false, message: 'ড্রাইভ ফোল্ডার কনফিগার করা হয়নি!' });
        }

        // Multer থেকে পাওয়া বাফারকে স্ট্রিমে রূপান্তর
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        const fileMetadata = {
            name: `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`, // ✅ সেফ ফাইলনেম
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
        };

        const media = {
            mimeType: req.file.mimetype,
            body: bufferStream
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, mimeType, size'
        });

        const fileId = response.data.id;

        // পাবলিক পারমিশন দেওয়া
        await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'reader', type: 'anyone' }
        });

        const fastLoadLink = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;

        res.status(200).json({
            success: true,
            message: 'ছবি সফলভাবে ড্রাইভে আপলোড হয়েছে!',
            fileId: fileId,
            photoLink: fastLoadLink,
            fileName: response.data.name
        });

    } catch (error) {
        console.error('❌ [DriveController] Upload Error:', error.message);
        if (error.response?.data?.error) {
            console.error('   Google API Error:', error.response.data.error);
        }
        res.status(500).json({ 
            success: false, 
            message: 'ড্রাইভ আপলোড ফেইল হয়েছে: ' + error.message 
        });
    }
};