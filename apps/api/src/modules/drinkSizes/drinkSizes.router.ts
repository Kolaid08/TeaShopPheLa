import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const drinkSizeSchema = z.object({
  DrinkID: z.number().int(),
  SizeID: z.number().int(),
  UnitPrice: z.number().positive(),
  DrinkSizeStatus: z.enum(['AVAILABLE', 'UNAVAILABLE']).optional(),
});

// Protect routes
router.use(verifyJWT);

// GET / - List all drink-size pricing configurations
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where: any = {};
    if (search) {
      where.OR = [
        { Drink: { DrinkName: { contains: search } } },
        { Size: { SizeName: { contains: search } } },
      ];
    }

    const [totalItems, drinkSizes] = await prisma.$transaction([
      prisma.drinkSize.count({ where }),
      prisma.drinkSize.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          Drink: { select: { DrinkName: true } },
          Size: { select: { SizeName: true, VolumeML: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Drink sizes price mapping retrieved', drinkSizes, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single mapping detail
router.get('/:id', async (req, res, next) => {
  try {
    const drinkSizeId = parseInt(req.params.id || '');
    if (isNaN(drinkSizeId)) throw new AppError(400, 'Invalid ID format.');

    const drinkSize = await prisma.drinkSize.findUnique({
      where: { DrinkSizeID: drinkSizeId },
      include: {
        Drink: true,
        Size: true,
      },
    });

    if (!drinkSize) throw new AppError(404, 'Drink size pricing mapping not found.');

    return sendResponse(res, 200, true, 'Drink size pricing retrieved', drinkSize);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a pricing configuration (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = drinkSizeSchema.parse(req.body);

    const drinkExists = await prisma.drink.findUnique({
      where: { DrinkID: validatedData.DrinkID },
    });
    if (!drinkExists) throw new AppError(404, 'Drink not found.');

    const sizeExists = await prisma.size.findUnique({ where: { SizeID: validatedData.SizeID } });
    if (!sizeExists) throw new AppError(404, 'Size not found.');

    const duplicateCheck = await prisma.drinkSize.findFirst({
      where: {
        DrinkID: validatedData.DrinkID,
        SizeID: validatedData.SizeID,
      },
    });
    if (duplicateCheck) {
      throw new AppError(
        409,
        'A pricing layout already exists for this drink and size combination.',
      );
    }

    const drinkSize = await prisma.drinkSize.create({
      data: {
        DrinkID: validatedData.DrinkID,
        SizeID: validatedData.SizeID,
        UnitPrice: validatedData.UnitPrice,
        DrinkSizeStatus: validatedData.DrinkSizeStatus || 'AVAILABLE',
      },
    });

    return sendResponse(res, 201, true, 'Drink size price mapped successfully', drinkSize);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update mapping (Manager/Admin only)
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const drinkSizeId = parseInt(req.params.id || '');
    if (isNaN(drinkSizeId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = drinkSizeSchema.parse(req.body);

    const drinkSize = await prisma.drinkSize.update({
      where: { DrinkSizeID: drinkSizeId },
      data: {
        DrinkID: validatedData.DrinkID,
        SizeID: validatedData.SizeID,
        UnitPrice: validatedData.UnitPrice,
        DrinkSizeStatus: validatedData.DrinkSizeStatus || 'AVAILABLE',
      },
    });

    return sendResponse(res, 200, true, 'Drink size price updated successfully', drinkSize);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete pricing (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const drinkSizeId = parseInt(req.params.id || '');
    if (isNaN(drinkSizeId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.drinkSize.delete({
      where: { DrinkSizeID: drinkSizeId },
    });

    return sendResponse(res, 200, true, 'Drink size price layout deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
