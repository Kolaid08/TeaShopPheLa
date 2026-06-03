import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { upload } from '../../middleware/upload';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const drinkSchema = z.object({
  DrinkName: z.string().min(1).max(255),
  DrinkDescription: z.string().optional(),
  DrinkImageURL: z.string().url().or(z.string().max(2048)).optional(),
  DrinkStatus: z.string().max(50),
});

// Protect routes
router.use(verifyJWT);

// GET / - List drinks
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          OR: [{ DrinkName: { contains: search } }, { DrinkDescription: { contains: search } }],
        }
      : {};

    const [totalItems, drinks] = await prisma.$transaction([
      prisma.drink.count({ where }),
      prisma.drink.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          DrinkSizes: {
            include: { Size: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Drinks list retrieved', drinks, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single drink details
router.get('/:id', async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.id || '');
    if (isNaN(drinkId)) throw new AppError(400, 'Invalid ID format.');

    const drink = await prisma.drink.findUnique({
      where: { DrinkID: drinkId },
      include: {
        DrinkSizes: {
          include: { Size: true },
        },
      },
    });

    if (!drink) throw new AppError(404, 'Drink not found.');

    return sendResponse(res, 200, true, 'Drink retrieved', drink);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a drink (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = drinkSchema.parse(req.body);

    const drink = await prisma.drink.create({
      data: validatedData,
    });

    return sendResponse(res, 201, true, 'Drink created successfully', drink);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update a drink (Manager/Admin only)
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.id || '');
    if (isNaN(drinkId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = drinkSchema.parse(req.body);

    const drink = await prisma.drink.update({
      where: { DrinkID: drinkId },
      data: validatedData,
    });

    return sendResponse(res, 200, true, 'Drink updated successfully', drink);
  } catch (err) {
    next(err);
  }
});

// POST /:id/upload - Upload drink image (Manager/Admin only)
router.post(
  '/:id/upload',
  requireRole(['ADMIN', 'MANAGER']),
  upload.single('image'),
  async (req, res, next) => {
    try {
      const drinkId = parseInt(req.params.id || '');
      if (isNaN(drinkId)) throw new AppError(400, 'Invalid ID format.');

      const file = (req as any).file;
      if (!file) {
        throw new AppError(400, 'No image file uploaded.');
      }

      const drinkExists = await prisma.drink.findUnique({
        where: { DrinkID: drinkId },
      });
      if (!drinkExists) throw new AppError(404, 'Drink not found.');

      // Save relative endpoint
      const imageUrl = `/uploads/${file.filename}`;

      const drink = await prisma.drink.update({
        where: { DrinkID: drinkId },
        data: { DrinkImageURL: imageUrl },
      });

      return sendResponse(res, 200, true, 'Drink image uploaded successfully', drink);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /:id - Delete a drink (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.id || '');
    if (isNaN(drinkId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.drink.delete({
      where: { DrinkID: drinkId },
    });

    return sendResponse(res, 200, true, 'Drink deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
