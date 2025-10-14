import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { ensureDirectoryExistsSync } from './storage';
import { getStorageConfig } from '../../config/env.config';

const storageConfig = getStorageConfig();

export function createAvatarUploader() {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      try {
        ensureDirectoryExistsSync(storageConfig.avatarPath);
        cb(null, storageConfig.avatarPath);
      } catch (error) {
        cb(error as Error, storageConfig.avatarPath);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${randomUUID()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image uploads are allowed'));
      }
      cb(null, true);
    },
  });
}
