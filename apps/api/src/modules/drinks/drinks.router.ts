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
  DrinkDescription: z.string().nullable().optional(),
  DrinkImageURL: z.string().url().or(z.string().max(2048)).nullable().optional(),
  DrinkStatus: z.string().max(50),
  sizes: z.array(z.object({
    SizeID: z.number(),
    UnitPrice: z.number().positive(),
  })).min(1, 'Phải có ít nhất 1 size'),
  RecipeDetails: z.array(z.object({
    IngredientID: z.number(),
    Quantity: z.number().positive(),
  })).optional(),
});

// GET / - List drinks (Public)
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
            include: { 
              Size: true,
              _count: { select: { OrderDetails: true } }
            },
          },
          Reviews: {
            select: { Rating: true }
          },
          Recipes: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { RecipeDetails: { include: { Ingredient: true } } }
          }
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const formattedDrinks = drinks.map((drink) => {
      let totalRating = 0;
      drink.Reviews.forEach((r) => (totalRating += r.Rating));
      const AverageRating = drink.Reviews.length > 0 ? Number((totalRating / drink.Reviews.length).toFixed(1)) : 0;
      
      let SalesCount = 0;
      // Calculate dynamic IsOutOfStock for each DrinkSize
      const currentRecipe = drink.Recipes.length > 0 ? drink.Recipes[0] : null;
      
      const formattedSizes = drink.DrinkSizes.map((ds) => {
        SalesCount += ds._count.OrderDetails;
        let isOutOfStock = false;
        
        if (currentRecipe) {
          const multiplier = ds.Size.VolumeML / 500.0;
          for (const detail of currentRecipe.RecipeDetails) {
            const baseQty = Number(detail.Quantity);
            const requiredQty = baseQty * multiplier;
            if (Number(detail.Ingredient.QuantityStock) < requiredQty) {
              isOutOfStock = true;
              break;
            }
          }
        }
        
        return {
          ...ds,
          IsOutOfStock: isOutOfStock
        };
      });

      const { Reviews, DrinkSizes, ...rest } = drink;

      return {
        ...rest,
        AverageRating,
        SalesCount,
        DrinkSizes: formattedSizes
      };
    });

    return sendResponse(res, 200, true, 'Drinks list retrieved', formattedDrinks, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single drink details (Public)
router.get('/:id', async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.id || '');
    if (isNaN(drinkId)) throw new AppError(400, 'Invalid ID format.');

    const drink = await prisma.drink.findUnique({
      where: { DrinkID: drinkId },
      include: {
        DrinkSizes: {
          include: { 
            Size: true,
            _count: { select: { OrderDetails: true } }
          },
        },
        Reviews: {
          select: { Rating: true }
        },
        Recipes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { RecipeDetails: { include: { Ingredient: true } } }
        }
      },
    });

    if (!drink) throw new AppError(404, 'Drink not found.');

    let totalRating = 0;
    drink.Reviews.forEach((r) => (totalRating += r.Rating));
    const AverageRating = drink.Reviews.length > 0 ? Number((totalRating / drink.Reviews.length).toFixed(1)) : 0;
    
    let SalesCount = 0;
    // Calculate dynamic IsOutOfStock for each DrinkSize
    const currentRecipe = drink.Recipes.length > 0 ? drink.Recipes[0] : null;
    
    const formattedSizes = drink.DrinkSizes.map((ds) => {
      SalesCount += ds._count.OrderDetails;
      let isOutOfStock = false;
      
      if (currentRecipe) {
        const multiplier = ds.Size.VolumeML / 500.0;
        for (const detail of currentRecipe.RecipeDetails) {
          const baseQty = Number(detail.Quantity);
          const requiredQty = baseQty * multiplier;
          if (Number(detail.Ingredient.QuantityStock) < requiredQty) {
            isOutOfStock = true;
            break;
          }
        }
      }
      
      return {
        ...ds,
        IsOutOfStock: isOutOfStock
      };
    });

    const { Reviews, DrinkSizes, ...rest } = drink;
    const formattedDrink = {
      ...rest,
      AverageRating,
      SalesCount,
      DrinkSizes: formattedSizes
    };

    return sendResponse(res, 200, true, 'Drink retrieved', formattedDrink);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a drink (Manager/Admin only)
router.post('/', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = drinkSchema.parse(req.body);

    const drink = await prisma.$transaction(async (tx) => {
      const newDrink = await tx.drink.create({
        data: {
          DrinkName: validatedData.DrinkName,
          DrinkDescription: validatedData.DrinkDescription,
          DrinkImageURL: validatedData.DrinkImageURL,
          DrinkStatus: validatedData.DrinkStatus,
          DrinkSizes: {
            create: validatedData.sizes.map((s) => ({
              SizeID: s.SizeID,
              UnitPrice: s.UnitPrice,
              DrinkSizeStatus: 'AVAILABLE',
            })),
          },
        },
        include: {
          DrinkSizes: true,
        },
      });

      if (validatedData.RecipeDetails && validatedData.RecipeDetails.length > 0) {
        await tx.recipe.create({
          data: {
            DrinkID: newDrink.DrinkID,
            RecipeDetails: {
              create: validatedData.RecipeDetails.map(rd => ({
                IngredientID: rd.IngredientID,
                Quantity: rd.Quantity
              }))
            }
          }
        });
      }

      return newDrink;
    });

    return sendResponse(res, 201, true, 'Drink created successfully', drink);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update a drink (Manager/Admin only)
router.put('/:id', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.id || '');
    if (isNaN(drinkId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = drinkSchema.parse(req.body);

    const updatedDrink = await prisma.$transaction(async (tx) => {
      const drink = await tx.drink.update({
        where: { DrinkID: drinkId },
        data: {
          DrinkName: validatedData.DrinkName,
          DrinkDescription: validatedData.DrinkDescription,
          DrinkImageURL: validatedData.DrinkImageURL,
          DrinkStatus: validatedData.DrinkStatus,
        },
      });

      const currentSizes = await tx.drinkSize.findMany({
        where: { DrinkID: drinkId },
      });

      const newSizeIds = validatedData.sizes.map((s) => s.SizeID);

      // Mark missing ones as UNAVAILABLE
      for (const cs of currentSizes) {
        if (!newSizeIds.includes(cs.SizeID)) {
          await tx.drinkSize.update({
            where: { DrinkSizeID: cs.DrinkSizeID },
            data: { DrinkSizeStatus: 'UNAVAILABLE' },
          });
        }
      }

      // Update or Create new ones
      for (const s of validatedData.sizes) {
        const existing = currentSizes.find((cs) => cs.SizeID === s.SizeID);
        if (existing) {
          await tx.drinkSize.update({
            where: { DrinkSizeID: existing.DrinkSizeID },
            data: { UnitPrice: s.UnitPrice, DrinkSizeStatus: 'AVAILABLE' },
          });
        } else {
          await tx.drinkSize.create({
            data: {
              DrinkID: drinkId,
              SizeID: s.SizeID,
              UnitPrice: s.UnitPrice,
              DrinkSizeStatus: 'AVAILABLE',
            },
          });
        }
      }

      // Update Recipes if provided
      if (validatedData.RecipeDetails && validatedData.RecipeDetails.length > 0) {
        // Remove existing recipes to maintain 1-to-1 mapping
        const existingRecipes = await tx.recipe.findMany({ where: { DrinkID: drinkId } });
        for (const er of existingRecipes) {
           await tx.recipeDetail.deleteMany({ where: { RecipeID: er.RecipeID } });
        }
        await tx.recipe.deleteMany({ where: { DrinkID: drinkId } });

        await tx.recipe.create({
          data: {
            DrinkID: drinkId,
            RecipeDetails: {
              create: validatedData.RecipeDetails.map(rd => ({
                IngredientID: rd.IngredientID,
                Quantity: rd.Quantity
              }))
            }
          }
        });
      }

      return drink;
    });

    return sendResponse(res, 200, true, 'Drink updated successfully', updatedDrink);
  } catch (err) {
    next(err);
  }
});

// POST /:id/upload - Upload drink image (Manager/Admin only)
router.post(
  '/:id/upload',
  verifyJWT,
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
router.delete('/:id', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const drinkId = parseInt(req.params.id || '');
    if (isNaN(drinkId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.drink.delete({
      where: { DrinkID: drinkId },
    });

    return sendResponse(res, 200, true, 'Drink deleted successfully');
  } catch (err: any) {
    if (err.code === 'P2003') {
      return next(new AppError(400, 'Không thể xóa Đồ uống này vì đã có dữ liệu liên quan (công thức, kích cỡ hoặc đơn đặt hàng). Vui lòng chuyển trạng thái sang Ngừng Bán.'));
    }
    next(err);
  }
});

export default router;
