import { Router } from 'express';
import { getReviews, createReview } from './reviews.controller';
import { verifyJWT } from '../../middleware/auth';

const router = Router();

router.get('/:drinkId', getReviews);
router.post('/', verifyJWT, createReview);

export default router;
