import { Router } from 'express';
import { syncCart, getCart, getAbandonedCarts } from './carts.controller';
import { verifyJWT } from '../../middleware/auth';

const router = Router();

router.post('/sync', syncCart);
router.get('/admin/abandoned', verifyJWT, getAbandonedCarts);
router.get('/:id', getCart);

export default router;
