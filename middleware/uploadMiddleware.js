const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Ensure the temporary /uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 2. Configure where and how Multer stores the incoming files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        // Attach a timestamp to prevent file overwriting collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'rag-doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 3. Initialize the upload engine with strict PDF filtering
const upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB file size limit to protect your server
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Strict parsing constraint: Only PDF files are allowed.'), false);
        }
    }
});

module.exports = upload;