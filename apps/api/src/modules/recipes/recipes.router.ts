import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const recipeDetailSchema = z.object({
  IngredientID: z.number().int(),
  Quantity: z.number().positive(),
});

const recipeSchema = z.object({
  DrinkID: z.number().int(),
  Ingredients: z.array(recipeDetailSchema).min(1),
});

// Protect routes
router.use(verifyJWT);
router.use(requireRole(['ADMIN', 'MANAGER', 'STAFF']));

// GET / - List all recipes
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          Drink: { DrinkName: { contains: search } },
        }
      : {};

    const [totalItems, recipes] = await prisma.$transaction([
      prisma.recipe.count({ where }),
      prisma.recipe.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          Drink: { select: { DrinkName: true } },
          RecipeDetails: {
            include: {
              Ingredient: {
                select: { IngredientName: true, Unit: { select: { UnitName: true } } },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Recipes retrieved successfully', recipes, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single recipe detail
router.get('/:id', async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.id || '');
    if (isNaN(recipeId)) throw new AppError(400, 'Invalid ID format.');

    const recipe = await prisma.recipe.findUnique({
      where: { RecipeID: recipeId },
      include: {
        Drink: true,
        RecipeDetails: {
          include: {
            Ingredient: {
              include: { Unit: true },
            },
          },
        },
      },
    });

    if (!recipe) throw new AppError(404, 'Recipe not found.');

    return sendResponse(res, 200, true, 'Recipe retrieved', recipe);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a recipe + nested details in a transaction (Manager/Admin only)
router.post('/', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = recipeSchema.parse(req.body);

    const drinkExists = await prisma.drink.findUnique({
      where: { DrinkID: validatedData.DrinkID },
    });
    if (!drinkExists) throw new AppError(404, 'Drink not found.');

    const activeRecipeExists = await prisma.recipe.findFirst({
      where: { DrinkID: validatedData.DrinkID },
    });
    if (activeRecipeExists) {
      throw new AppError(
        409,
        'A recipe already exists for this drink. Update the existing recipe instead.',
      );
    }

    // Verify all ingredients exist
    const ingredientIds = validatedData.Ingredients.map((i) => i.IngredientID);
    const existingIngredients = await prisma.ingredient.findMany({
      where: { IngredientID: { in: ingredientIds } },
    });
    if (existingIngredients.length !== ingredientIds.length) {
      throw new AppError(400, 'One or more raw ingredients are invalid.');
    }

    const recipe = await prisma.$transaction(async (tx) => {
      const createdRecipe = await tx.recipe.create({
        data: { DrinkID: validatedData.DrinkID },
      });

      const groupedIngredients = validatedData.Ingredients.reduce((acc, curr) => {
        if (!acc[curr.IngredientID]) acc[curr.IngredientID] = 0;
        acc[curr.IngredientID] += curr.Quantity;
        return acc;
      }, {} as Record<number, number>);

      await tx.recipeDetail.createMany({
        data: Object.keys(groupedIngredients).map((ingId) => ({
          RecipeID: createdRecipe.RecipeID,
          IngredientID: parseInt(ingId),
          Quantity: groupedIngredients[parseInt(ingId)],
        })),
      });

      return tx.recipe.findUnique({
        where: { RecipeID: createdRecipe.RecipeID },
        include: { RecipeDetails: true },
      });
    });

    return sendResponse(res, 201, true, 'Recipe configured successfully', recipe);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update a recipe and rebuild its ingredient details (Manager/Admin only)
router.put('/:id', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.id || '');
    if (isNaN(recipeId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = recipeSchema.parse(req.body);

    const recipeExists = await prisma.recipe.findUnique({
      where: { RecipeID: recipeId },
    });
    if (!recipeExists) throw new AppError(404, 'Recipe not found.');

    if (validatedData.DrinkID !== recipeExists.DrinkID) {
      const activeRecipeExists = await prisma.recipe.findFirst({
        where: { DrinkID: validatedData.DrinkID },
      });
      if (activeRecipeExists) {
        throw new AppError(
          409,
          'A recipe already exists for this drink. Update the existing recipe instead.',
        );
      }
    }

    // Verify all ingredients exist
    const ingredientIds = validatedData.Ingredients.map((i) => i.IngredientID);
    const existingIngredients = await prisma.ingredient.findMany({
      where: { IngredientID: { in: ingredientIds } },
    });
    if (existingIngredients.length !== ingredientIds.length) {
      throw new AppError(400, 'One or more raw ingredients are invalid.');
    }

    const updatedRecipe = await prisma.$transaction(async (tx) => {
      // 1. Wipe current detail logs
      await tx.recipeDetail.deleteMany({
        where: { RecipeID: recipeId },
      });

      const groupedIngredients = validatedData.Ingredients.reduce((acc, curr) => {
        if (!acc[curr.IngredientID]) acc[curr.IngredientID] = 0;
        acc[curr.IngredientID] += curr.Quantity;
        return acc;
      }, {} as Record<number, number>);

      await tx.recipeDetail.createMany({
        data: Object.keys(groupedIngredients).map((ingId) => ({
          RecipeID: recipeId,
          IngredientID: parseInt(ingId),
          Quantity: groupedIngredients[parseInt(ingId)],
        })),
      });

      // 3. Update main record in case of change in DrinkID
      return tx.recipe.update({
        where: { RecipeID: recipeId },
        data: { DrinkID: validatedData.DrinkID },
        include: { RecipeDetails: true },
      });
    });

    return sendResponse(res, 200, true, 'Recipe updated successfully', updatedRecipe);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete recipe and details (Manager/Admin only)
router.delete('/:id', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.id || '');
    if (isNaN(recipeId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.$transaction(async (tx) => {
      // Wipe details first
      await tx.recipeDetail.deleteMany({ where: { RecipeID: recipeId } });
      await tx.recipe.delete({ where: { RecipeID: recipeId } });
    });

    return sendResponse(res, 200, true, 'Recipe deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
