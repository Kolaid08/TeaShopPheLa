import { Router } from 'express';
import { verifyJWT, requireRole } from '../../middleware/auth';
import {
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getChatboxCombos
} from './promotions.controller';

const router = Router();

// Public route to get active promotions for customer
router.get('/active', getAllPromotions); // In a real app we'd filter by IsActive, but we can filter it on client side
router.get('/chatbox-combos', getChatboxCombos);

// Admin & Staff routes (Staff needs to view promotions for POS)
router.use(verifyJWT);

router.get('/', getAllPromotions);
router.get('/:id', getPromotionById);
router.post('/', requireRole(['ADMIN', 'MANAGER']), createPromotion);
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), updatePromotion);
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), deletePromotion);

export default router;
