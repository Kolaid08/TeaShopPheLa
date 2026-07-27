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

const disposeSchema = z.array(z.object({
  IngredientID: z.number().int(),
  IngredientReceiptID: z.number().int(),
  Quantity: z.number().positive(),
  Reason: z.string().optional()
}));

// Protect routes
router.use(verifyJWT);
router.use(requireRole(['ADMIN', 'MANAGER', 'STAFF']));

// GET /expired - List expired or expiring soon ingredients
router.get('/expired', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const expiredBatches = await prisma.ingredientReceiptDetail.findMany({
      where: {
        QuantityRemaining: { gt: 0 },
        ExpirationDate: { lte: targetDate }
      },
      include: {
        Ingredient: { select: { IngredientName: true, Unit: true } },
        IngredientReceipt: { select: { ReceivedDate: true, Supplier: { select: { SupplierName: true } } } }
      },
      orderBy: { ExpirationDate: 'asc' }
    });

    return sendResponse(res, 200, true, 'Danh sách nguyên liệu hết hạn/sắp hết hạn', expiredBatches);
  } catch (err) {
    next(err);
  }
});

// POST /dispose - Dispose expired ingredients (Manager/Admin only)
router.post('/dispose', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const items = disposeSchema.parse(req.body);
    const employeeId = req.user?.EmployeeID;

    if (!employeeId) throw new AppError(401, 'Không xác định được nhân viên thực hiện.');

    const result = await prisma.$transaction(async (tx) => {
      const disposals = [];
      for (const item of items) {
        // Validate batch exists and has enough quantity
        const batch = await tx.ingredientReceiptDetail.findUnique({
          where: {
            IngredientReceiptID_IngredientID: {
              IngredientReceiptID: item.IngredientReceiptID,
              IngredientID: item.IngredientID
            }
          }
        });

        if (!batch) {
          throw new AppError(404, `Không tìm thấy lô nguyên liệu (ReceiptID: ${item.IngredientReceiptID}, IngredientID: ${item.IngredientID})`);
        }

        if (Number(batch.QuantityRemaining) < item.Quantity) {
          throw new AppError(400, `Số lượng tồn của lô (ReceiptID: ${item.IngredientReceiptID}, IngredientID: ${item.IngredientID}) không đủ để huỷ (Còn: ${batch.QuantityRemaining}, Yêu cầu: ${item.Quantity})`);
        }

        // Deduct from batch
        await tx.ingredientReceiptDetail.update({
          where: {
            IngredientReceiptID_IngredientID: {
              IngredientReceiptID: item.IngredientReceiptID,
              IngredientID: item.IngredientID
            }
          },
          data: {
            QuantityRemaining: { decrement: item.Quantity }
          }
        });

        // Deduct from total stock
        await tx.ingredient.update({
          where: { IngredientID: item.IngredientID },
          data: {
            QuantityStock: { decrement: item.Quantity }
          }
        });

        // Create disposal log
        const disposal = await tx.ingredientDisposal.create({
          data: {
            IngredientID: item.IngredientID,
            IngredientReceiptID: item.IngredientReceiptID,
            Quantity: item.Quantity,
            Reason: item.Reason || 'Hàng hết hạn/hỏng',
            EmployeeID: employeeId
          }
        });
        disposals.push(disposal);
      }
      return disposals;
    });

    return sendResponse(res, 200, true, 'Đã huỷ nguyên liệu thành công', result);
  } catch (err) {
    next(err);
  }
});

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
router.post('/', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
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
router.put('/:id', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
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
router.delete('/:id', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
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
