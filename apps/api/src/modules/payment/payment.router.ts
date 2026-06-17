import { Router } from 'express';
import { createZaloPayOrder, callbackZaloPay } from './payment.controller';

const router = Router();

router.post('/zalopay', createZaloPayOrder);
router.post('/zalopay/callback', callbackZaloPay);

export default router;
