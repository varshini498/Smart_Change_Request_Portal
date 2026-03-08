const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(process.cwd(), 'backend', 'uploads', 'profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only JPG and PNG images are allowed'));
  }
  return cb(null, true);
};

const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = { uploadProfilePhoto };
