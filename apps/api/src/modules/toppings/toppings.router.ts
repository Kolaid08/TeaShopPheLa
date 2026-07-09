import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const toppingDetailSchema = z.object({
  IngredientID: z.number().int(),
  Quantity: z.number().positive(),
});

const toppingSchema = z.object({
  ToppingName: z.string().min(1),
  Price: z.number().min(0),
  Ingredients: z.array(toppingDetailSchema).optional(),
});

router.use(verifyJWT);

// GET / - List all toppings
router.get('/', async (req, res, next) => {
  try {
    const toppings = await prisma.topping.findMany({
      include: {
        ToppingRecipeDetails: {
          include: {
            Ingredient: {
              select: { IngredientName: true, Unit: { select: { UnitName: true } } },
            },
          },
        },
      },
    });
    return sendResponse(res, 200, true, 'Toppings retrieved', toppings);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a topping
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validated = toppingSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const topping = await tx.topping.create({
        data: {
          ToppingName: validated.ToppingName,
          Price: validated.Price,
        },
      });

      if (validated.Ingredients && validated.Ingredients.length > 0) {
        await tx.toppingRecipeDetail.createMany({
          data: validated.Ingredients.map((item) => ({
            ToppingID: topping.ToppingID,
            IngredientID: item.IngredientID,
            Quantity: item.Quantity,
          })),
        });
      }

      return tx.topping.findUnique({
        where: { ToppingID: topping.ToppingID },
        include: { ToppingRecipeDetails: true },
      });
    });

    return sendResponse(res, 201, true, 'Topping created', result);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update a topping
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id || '');
    if (isNaN(id)) throw new AppError(400, 'Invalid ID');

    const validated = toppingSchema.parse(req.body);

    const exists = await prisma.topping.findUnique({ where: { ToppingID: id } });
    if (!exists) throw new AppError(404, 'Topping not found');

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.topping.update({
        where: { ToppingID: id },
        data: {
          ToppingName: validated.ToppingName,
          Price: validated.Price,
        },
      });

      await tx.toppingRecipeDetail.deleteMany({ where: { ToppingID: id } });

      if (validated.Ingredients && validated.Ingredients.length > 0) {
        await tx.toppingRecipeDetail.createMany({
          data: validated.Ingredients.map((item) => ({
            ToppingID: id,
            IngredientID: item.IngredientID,
            Quantity: item.Quantity,
          })),
        });
      }

      return tx.topping.findUnique({
        where: { ToppingID: id },
        include: { ToppingRecipeDetails: true },
      });
    });

    return sendResponse(res, 200, true, 'Topping updated', result);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id || '');
    if (isNaN(id)) throw new AppError(400, 'Invalid ID');

    await prisma.$transaction(async (tx) => {
      await tx.toppingRecipeDetail.deleteMany({ where: { ToppingID: id } });
      await tx.topping.delete({ where: { ToppingID: id } });
    });

    return sendResponse(res, 200, true, 'Topping deleted');
  } catch (err) {
    next(err);
  }
});

export default router;
