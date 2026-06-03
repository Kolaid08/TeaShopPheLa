import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const ingredientSchema = z.object({
  IngredientName: z.string().min(1).max(255),
  QuantityStock: z.number().nonnegative(),
  UnitID: z.number().int(),
});

// Protect routes
router.use(verifyJWT);

// GET /low-stock - List ingredients below the custom threshold (default 10)
router.get('/low-stock', async (req, res, next) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 10.0;

    const lowStockIngredients = await prisma.ingredient.findMany({
      where: {
        QuantityStock: {
          lt: threshold,
        },
      },
      include: {
        Unit: { select: { UnitName: true } },
      },
      orderBy: { QuantityStock: 'asc' },
    });

    return sendResponse(
      res,
      200,
      true,
      `Ingredients with stock below threshold of ${threshold} retrieved`,
      lowStockIngredients,
    );
  } catch (err) {
    next(err);
  }
});

// GET / - List all ingredients
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          IngredientName: { contains: search },
        }
      : {};

    const [totalItems, ingredients] = await prisma.$transaction([
      prisma.ingredient.count({ where }),
      prisma.ingredient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          Unit: { select: { UnitName: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Ingredients retrieved successfully', ingredients, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single ingredient details
router.get('/:id', async (req, res, next) => {
  try {
    const ingId = parseInt(req.params.id || '');
    if (isNaN(ingId)) throw new AppError(400, 'Invalid ID format.');

    const ingredient = await prisma.ingredient.findUnique({
      where: { IngredientID: ingId },
      include: { Unit: true },
    });

    if (!ingredient) throw new AppError(404, 'Ingredient not found.');

    return sendResponse(res, 200, true, 'Ingredient retrieved', ingredient);
  } catch (err) {
    next(err);
  }
});

// POST / - Create an ingredient (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = ingredientSchema.parse(req.body);

    const unitExists = await prisma.unit.findUnique({ where: { UnitID: validatedData.UnitID } });
    if (!unitExists) throw new AppError(404, 'Unit of measurement not found.');

    const ingredient = await prisma.ingredient.create({
      data: validatedData,
    });

    return sendResponse(res, 201, true, 'Ingredient created successfully', ingredient);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update an ingredient (Manager/Admin only)
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const ingId = parseInt(req.params.id || '');
    if (isNaN(ingId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = ingredientSchema.parse(req.body);

    const unitExists = await prisma.unit.findUnique({ where: { UnitID: validatedData.UnitID } });
    if (!unitExists) throw new AppError(404, 'Unit of measurement not found.');

    const ingredient = await prisma.ingredient.update({
      where: { IngredientID: ingId },
      data: validatedData,
    });

    return sendResponse(res, 200, true, 'Ingredient updated successfully', ingredient);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete an ingredient (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const ingId = parseInt(req.params.id || '');
    if (isNaN(ingId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.ingredient.delete({
      where: { IngredientID: ingId },
    });

    return sendResponse(res, 200, true, 'Ingredient deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
