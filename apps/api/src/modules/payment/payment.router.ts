import { Router } from 'express';
import { createPayOSOrder, payOSWebhook } from './payment.controller';

const router = Router();

router.post('/payos/create', createPayOSOrder);
router.post('/payos/webhook', payOSWebhook);

export default router;
