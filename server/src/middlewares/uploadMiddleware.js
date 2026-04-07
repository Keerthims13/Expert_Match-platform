import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadRoot = path.resolve(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const safeExt = extension || '.jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
    cb(null, uniqueName);
  }
});

function imageOnlyFilter(_req, file, cb) {
  const mime = String(file.mimetype || '').toLowerCase();
  if (!mime.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
    return;
  }
  cb(null, true);
}

export const uploadAvatar = multer({
  storage,
  fileFilter: imageOnlyFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});
