import multer, { FileFilterCallback, StorageEngine } from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { ensureDirectoryExistsSync } from './storage';
import { getStorageConfig } from '../../config/env.config';

const storageConfig = getStorageConfig();

export function createAvatarUploader() {
  const storage: StorageEngine = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
      try {
        ensureDirectoryExistsSync(storageConfig.avatarPath);
        cb(null, storageConfig.avatarPath);
      } catch (error) {
        cb(error as Error, storageConfig.avatarPath);
      }
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${randomUUID()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image uploads are allowed'));
      }
      cb(null, true);
    },
  });
}
