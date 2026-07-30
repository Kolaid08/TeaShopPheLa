import { Router } from 'express';
import { syncCart, getCart, getAbandonedCarts, mockAbandonedCarts, notifyAbandonedCart } from './carts.controller';
import { requireRole, verifyJWT, optionalAuth } from '../../middleware/auth';

const router = Router();

router.post('/sync', optionalAuth, syncCart);
router.post('/admin/abandoned/mock', verifyJWT, requireRole(['ADMIN', 'MANAGER']), mockAbandonedCarts);
router.get('/admin/abandoned', verifyJWT, requireRole(['ADMIN', 'MANAGER']), getAbandonedCarts);
router.post('/admin/abandoned/:id/notify', verifyJWT, requireRole(['ADMIN', 'MANAGER']), notifyAbandonedCart);
router.get('/:id', optionalAuth, getCart);

export default router;
