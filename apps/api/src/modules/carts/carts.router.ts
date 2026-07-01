import { Router } from 'express';
import { syncCart, getCart, getAbandonedCarts, mockAbandonedCarts } from './carts.controller';
import { verifyJWT } from '../../middleware/auth';

const router = Router();

router.post('/sync', syncCart);
router.post('/admin/abandoned/mock', verifyJWT, mockAbandonedCarts);
router.get('/admin/abandoned', verifyJWT, getAbandonedCarts);
router.get('/:id', getCart);

export default router;
