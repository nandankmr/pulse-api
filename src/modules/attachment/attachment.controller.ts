import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
// import { AuthenticatedRequest } from '../../middleware/auth.middleware';
// import { UnauthorizedError } from '../../utils/errors';
// import logger from '../../utils/logger';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware';
import { UnauthorizedError } from '../../shared/errors/app.errors';
import { logger } from '../../shared/utils/logger';

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, audio, and common file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export class AttachmentController {
  /**
   * Upload a file
   */
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      console.log('📤 Upload request received');
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      console.log('File:', req.file);
      
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        console.error('❌ No user ID found');
        throw new UnauthorizedError('User authentication required');
      }

      if (!req.file) {
        console.error('❌ No file in request');
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const file = req.file;
      const fileUrl = `/api/attachments/${file.filename}`;

      console.log('✅ File uploaded successfully:', {
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      });

      logger.info('File uploaded', {
        userId,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });

      res.status(200).json({
        url: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });
    } catch (error) {
      console.error('❌ File upload error:', error);
      logger.error('File upload error:', error);
      res.status(500).json({ 
        error: 'File upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Serve uploaded file
   */
  async serveFile(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        res.status(400).json({ error: 'Filename is required' });
        return;
      }
      
      const filePath = path.join(uploadDir, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Set appropriate headers
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

      // Stream file to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      logger.error('File serve error:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  }
}

export const attachmentController = new AttachmentController();
export const uploadMiddleware = upload.single('file');
