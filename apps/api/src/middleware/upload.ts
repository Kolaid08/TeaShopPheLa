import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from './errorHandler';

// Ensure upload folder exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new AppError(400, 'Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.'),
      false,
    );
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
