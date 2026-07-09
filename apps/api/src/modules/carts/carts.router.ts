import { Router } from 'express';
import { syncCart, getCart, getAbandonedCarts, mockAbandonedCarts } from './carts.controller';
import { requireRole, verifyJWT } from '../../middleware/auth';

const router = Router();

router.post('/sync', syncCart);
router.post('/admin/abandoned/mock', verifyJWT, requireRole(['ADMIN', 'MANAGER']), mockAbandonedCarts);
router.get('/admin/abandoned', verifyJWT, requireRole(['ADMIN', 'MANAGER']), getAbandonedCarts);
router.get('/:id', getCart);

export default router;
