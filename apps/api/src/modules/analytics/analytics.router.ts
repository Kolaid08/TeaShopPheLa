import { Router } from 'express';
import { triggerHUI, getHUIResults } from './analytics.controller';
import { verifyJWT, requireRole } from '../../middleware/auth';

const router = Router();

// Lấy danh sách kết quả (dành cho Admin dashboard)
router.get('/hui', verifyJWT, requireRole(['ADMIN', 'MANAGER']), getHUIResults);

// Kích hoạt chạy thuật toán thủ công
router.post('/hui/trigger', verifyJWT, requireRole(['ADMIN']), triggerHUI);

export default router;
