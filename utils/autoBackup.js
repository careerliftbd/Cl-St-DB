const fs = require('fs');
const path = require('path');
const os = require('os');
const cron = require('node-cron');
const { google } = require('googleapis');
const Student = require('../models/Student');

// ── CONFIGURATION ──
const FOLDER_ID = process.env.DRIVE_BACKUP_FOLDER_ID || process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;

// ── OAUTH2 (Same as driveController.js) ──
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });

// ── VALIDATE ENVIRONMENT ──
function validateConfig() {
    const errors = [];

    if (!process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
        errors.push('GOOGLE_DRIVE_REFRESH_TOKEN is not set in .env');
    }
    if (!process.env.GOOGLE_DRIVE_CLIENT_ID) {
        errors.push('GOOGLE_DRIVE_CLIENT_ID is not set in .env');
    }
    if (!process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
        errors.push('GOOGLE_DRIVE_CLIENT_SECRET is not set in .env');
    }
    if (!FOLDER_ID) {
        errors.push('DRIVE_BACKUP_FOLDER_ID is not set in .env');
    }

    if (errors.length > 0) {
        console.error('❌ [AutoBackup] Configuration Errors:');
        errors.forEach(e => console.error('   →', e));
        return false;
    }

    return true;
}

// ── LAZY AUTH INITIALIZATION ──
let driveInstance = null;

function getDrive() {
    if (driveInstance) return driveInstance;
    driveInstance = google.drive({ version: 'v3', auth: oauth2Client });
    return driveInstance;
}

// ── SAFE FILE CLEANUP ──
function safeDelete(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
    } catch (err) {
        console.warn('⚠️ [AutoBackup] Failed to delete temp file:', err.message);
    }
    return false;
}

// ── MAIN BACKUP FUNCTION ──
const performBackup = async () => {
    console.log('⏳ [AutoBackup] Database backup process started...');

    if (!validateConfig()) {
        throw new Error('Backup configuration is invalid. Check .env variables');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `Careerlift_DB_Backup_${timestamp}.json`;
    const localFilePath = path.join(os.tmpdir(), backupFileName);

    let fileStream = null;

    try {
        console.log('📥 [AutoBackup] Fetching students from database...');
        const allStudents = await Student.find({}).lean();
        console.log(`📊 [AutoBackup] Fetched ${allStudents.length} students`);

        const backupData = {
            timestamp: new Date().toISOString(),
            totalStudents: allStudents.length,
            students: allStudents
        };

        fs.writeFileSync(localFilePath, JSON.stringify(backupData, null, 2));
        const fileSizeMB = (fs.statSync(localFilePath).size / (1024 * 1024)).toFixed(2);
        console.log(`📁 [AutoBackup] Local backup created: ${backupFileName} (${fileSizeMB} MB)`);

        const drive = getDrive();

        const fileMetadata = {
            name: backupFileName,
            parents: [FOLDER_ID],
        };

        fileStream = fs.createReadStream(localFilePath);

        const media = {
            mimeType: 'application/json',
            body: fileStream,
        };

        console.log('☁️  [AutoBackup] Uploading to Google Drive...');
        console.log(`   → Folder ID: ${FOLDER_ID}`);
        console.log(`   → File: ${backupFileName}`);

        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, size',
        });

        console.log(`✅ [AutoBackup] Upload successful!`);
        console.log(`   → File ID: ${response.data.id}`);
        console.log(`   → Link: ${response.data.webViewLink || 'N/A'}`);

        return {
            success: true,
            fileId: response.data.id,
            fileName: response.data.name,
            link: response.data.webViewLink || null,
            studentCount: allStudents.length,
            fileSizeMB: fileSizeMB,
            timestamp: backupData.timestamp
        };

    } catch (error) {
        console.error('❌ [AutoBackup] Backup Failed:', error.message);
        if (error.response) {
            console.error('   → Google API Error:', error.response.data?.error?.message || error.response.statusText);
        }
        throw error;

    } finally {
        if (fileStream) {
            try { fileStream.destroy(); } catch (e) { /* ignore */ }
        }
        safeDelete(localFilePath);
        console.log('🧹 [AutoBackup] Cleanup completed.');
    }
};

// ── SCHEDULER ──
const initAutoBackup = () => {
    if (!validateConfig()) {
        console.warn('⚠️ [AutoBackup] Auto-backup is DISABLED. Fix config to enable.');
        return;
    }

    cron.schedule('0 0 1 * *', () => {
        console.log('⏰ [Cron] Triggering monthly automated database backup...');
        performBackup()
            .then(result => {
                console.log('✅ [Cron] Auto-backup completed:', result.fileName);
            })
            .catch(err => {
                console.error('❌ [Cron] Auto-backup failed:', err.message);
            });
    }, {
        scheduled: true,
        timezone: "Asia/Dhaka"
    });

    console.log('🛡️ Automated Database Backup scheduled successfully (Monthly: 1st day @ 12:00 AM BD).');
};

module.exports = { initAutoBackup, performBackup };