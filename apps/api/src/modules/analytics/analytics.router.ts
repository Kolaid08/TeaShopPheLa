import { Router } from 'express';
import { triggerHUI, getHUIResults, triggerApriori, getAprioriResults, triggerMockData } from './analytics.controller';
import { verifyJWT, requireRole } from '../../middleware/auth';

const router = Router();

// Lấy danh sách kết quả (dành cho Admin dashboard)
router.get('/hui', verifyJWT, requireRole(['ADMIN', 'MANAGER']), getHUIResults);
router.get('/apriori', verifyJWT, requireRole(['ADMIN', 'MANAGER']), getAprioriResults);

// Kích hoạt chạy thuật toán thủ công
router.post('/hui/trigger', verifyJWT, requireRole(['ADMIN']), triggerHUI);
router.post('/apriori/trigger', verifyJWT, requireRole(['ADMIN']), triggerApriori);

// Sinh dữ liệu ảo để test thuật toán
router.post('/mock-data', verifyJWT, requireRole(['ADMIN']), triggerMockData);

export default router;
