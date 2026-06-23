import { Router } from 'express';
import * as chatController from './chat.controller';

const router = Router();

router.get('/sessions/:sessionId', chatController.getSessionHistory);
router.get('/admin/sessions', chatController.getSessionsForAdmin);

export default router;
