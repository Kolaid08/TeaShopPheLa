import { Router } from 'express';
import { syncCart, getCart } from './carts.controller';

const router = Router();

router.post('/sync', syncCart);
router.get('/:id', getCart);

export default router;
