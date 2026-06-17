import { Router } from 'express';
import { getReviews, createReview } from './reviews.controller';

const router = Router();

router.get('/:drinkId', getReviews);
router.post('/', createReview);

export default router;
