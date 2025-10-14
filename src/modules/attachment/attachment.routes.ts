import { Router, Request, Response, NextFunction } from 'express';
import { attachmentController, uploadMiddleware } from './attachment.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/attachments/upload
 * @desc    Upload a file
 * @access  Private
 */
router.post('/upload', authenticate, (req: Request, res: Response, next: NextFunction): void => {
  console.log('🔵 Upload route hit');
  uploadMiddleware(req, res, (err: unknown) => {
    if (err) {
      console.error('❌ Multer error:', err);
      res.status(400).json({ 
        error: 'File upload failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      return;
    }
    attachmentController.uploadFile(req, res);
  });
});

/**
 * @route   GET /api/attachments/:filename
 * @desc    Serve uploaded file
 * @access  Public (files are served publicly)
 */
router.get('/:filename', (req, res) => attachmentController.serveFile(req, res));

export default router;
