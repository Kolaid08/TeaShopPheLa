import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const receiptDetailSchema = z.object({
  IngredientID: z.number().int(),
  Quantity: z.number().positive(),
  CostPrice: z.number().positive(),
});

const receiptSchema = z.object({
  SupplierID: z.number().int(),
  ReceivedDate: z.string().datetime().or(z.string().date()),
  Ingredients: z.array(receiptDetailSchema).min(1),
});

// Protect routes
router.use(verifyJWT);

// GET / - List all receipts with optional paginations
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          Supplier: { SupplierName: { contains: search } },
        }
      : {};

    const [totalItems, receipts] = await prisma.$transaction([
      prisma.ingredientReceipt.count({ where }),
      prisma.ingredientReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          Supplier: { select: { SupplierName: true } },
          IngredientReceiptDetails: {
            include: {
              Ingredient: { select: { IngredientName: true } },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Ingredient receipts retrieved successfully', receipts, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single receipt details
router.get('/:id', async (req, res, next) => {
  try {
    const receiptId = parseInt(req.params.id || '');
    if (isNaN(receiptId)) throw new AppError(400, 'Invalid ID format.');

    const receipt = await prisma.ingredientReceipt.findUnique({
      where: { IngredientReceiptID: receiptId },
      include: {
        Supplier: true,
        IngredientReceiptDetails: {
          include: { Ingredient: true },
        },
      },
    });

    if (!receipt) throw new AppError(404, 'Receipt not found.');

    return sendResponse(res, 200, true, 'Receipt retrieved', receipt);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a receipt + nested details (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = receiptSchema.parse(req.body);

    const supplierExists = await prisma.supplier.findUnique({
      where: { SupplierID: validatedData.SupplierID },
    });
    if (!supplierExists) throw new AppError(404, 'Supplier not found.');

    const ingredientIds = validatedData.Ingredients.map((i) => i.IngredientID);
    const existingIngredients = await prisma.ingredient.findMany({
      where: { IngredientID: { in: ingredientIds } },
    });
    if (existingIngredients.length !== ingredientIds.length) {
      throw new AppError(400, 'One or more raw ingredients are invalid.');
    }

    const receipt = await prisma.$transaction(async (tx) => {
      const createdReceipt = await tx.ingredientReceipt.create({
        data: {
          SupplierID: validatedData.SupplierID,
          ReceivedDate: new Date(validatedData.ReceivedDate),
          IngredientReceiptStatus: 'PENDING', // starts as pending
        },
      });

      await tx.ingredientReceiptDetail.createMany({
        data: validatedData.Ingredients.map((item) => ({
          IngredientReceiptID: createdReceipt.IngredientReceiptID,
          IngredientID: item.IngredientID,
          Quantity: item.Quantity,
          CostPrice: item.CostPrice,
        })),
      });

      return tx.ingredientReceipt.findUnique({
        where: { IngredientReceiptID: createdReceipt.IngredientReceiptID },
        include: { IngredientReceiptDetails: true },
      });
    });

    return sendResponse(res, 201, true, 'Receipt created successfully', receipt);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/confirm - Confirm a receipt and trigger stock increment (Manager/Admin only)
router.patch('/:id/confirm', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const receiptId = parseInt(req.params.id || '');
    if (isNaN(receiptId)) throw new AppError(400, 'Invalid ID format.');

    const receipt = await prisma.ingredientReceipt.findUnique({
      where: { IngredientReceiptID: receiptId },
      include: { IngredientReceiptDetails: true },
    });

    if (!receipt) throw new AppError(404, 'Receipt not found.');
    if (receipt.IngredientReceiptStatus === 'CONFIRMED') {
      throw new AppError(400, 'This receipt is already confirmed and stock has been updated.');
    }

    const confirmedReceipt = await prisma.$transaction(async (tx) => {
      // 1. Loop details and increase stocks
      for (const item of receipt.IngredientReceiptDetails) {
        await tx.ingredient.update({
          where: { IngredientID: item.IngredientID },
          data: {
            QuantityStock: {
              increment: item.Quantity,
            },
          },
        });
      }

      // 2. Set status to confirmed
      return tx.ingredientReceipt.update({
        where: { IngredientReceiptID: receiptId },
        data: {
          IngredientReceiptStatus: 'CONFIRMED',
        },
        include: { IngredientReceiptDetails: true },
      });
    });

    return sendResponse(
      res,
      200,
      true,
      'Receipt confirmed and stock balances increased successfully',
      confirmedReceipt,
    );
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete a pending receipt (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const receiptId = parseInt(req.params.id || '');
    if (isNaN(receiptId)) throw new AppError(400, 'Invalid ID format.');

    const receipt = await prisma.ingredientReceipt.findUnique({
      where: { IngredientReceiptID: receiptId },
    });
    if (!receipt) throw new AppError(404, 'Receipt not found.');
    if (receipt.IngredientReceiptStatus === 'CONFIRMED') {
      throw new AppError(400, 'Cannot delete a confirmed receipt.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.ingredientReceiptDetail.deleteMany({ where: { IngredientReceiptID: receiptId } });
      await tx.ingredientReceipt.delete({ where: { IngredientReceiptID: receiptId } });
    });

    return sendResponse(res, 200, true, 'Receipt deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
