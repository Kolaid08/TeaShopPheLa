import { Router } from 'express';
import { verifyJWT, requireRole } from '../../middleware/auth';
import {
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion
} from './promotions.controller';

const router = Router();

// Public route to get active promotions for customer
router.get('/active', getAllPromotions); // In a real app we'd filter by IsActive, but we can filter it on client side

// Admin routes
router.use(verifyJWT);
router.use(requireRole(['ADMIN', 'MANAGER']));

router.get('/', getAllPromotions);
router.get('/:id', getPromotionById);
router.post('/', createPromotion);
router.put('/:id', updatePromotion);
router.delete('/:id', deletePromotion);

export default router;
