import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const shopTableSchema = z.object({
  ShopTableNumber: z.number().int().positive(),
});

// Protect routes
router.use(verifyJWT);

// GET / - List all tables
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          ShopTableNumber: parseInt(search) || undefined,
        }
      : {};

    const [totalItems, shopTables] = await prisma.$transaction([
      prisma.shopTable.count({ where }),
      prisma.shopTable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Tables list retrieved successfully', shopTables, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single table details
router.get('/:id', async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.id || '');
    if (isNaN(tableId)) throw new AppError(400, 'Invalid ID format.');

    const shopTable = await prisma.shopTable.findUnique({
      where: { ShopTableID: tableId },
    });

    if (!shopTable) throw new AppError(404, 'Table not found.');

    return sendResponse(res, 200, true, 'Table retrieved', shopTable);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a table (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = shopTableSchema.parse(req.body);

    const duplicateCheck = await prisma.shopTable.findFirst({
      where: { ShopTableNumber: validatedData.ShopTableNumber },
    });
    if (duplicateCheck) {
      throw new AppError(409, 'A table with this number already exists.');
    }

    const shopTable = await prisma.shopTable.create({
      data: validatedData,
    });

    return sendResponse(res, 201, true, 'Table created successfully', shopTable);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update table (Manager/Admin only)
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.id || '');
    if (isNaN(tableId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = shopTableSchema.parse(req.body);

    const duplicateCheck = await prisma.shopTable.findFirst({
      where: {
        ShopTableNumber: validatedData.ShopTableNumber,
        NOT: { ShopTableID: tableId },
      },
    });
    if (duplicateCheck) {
      throw new AppError(409, 'A table with this number already exists.');
    }

    const shopTable = await prisma.shopTable.update({
      where: { ShopTableID: tableId },
      data: validatedData,
    });

    return sendResponse(res, 200, true, 'Table updated successfully', shopTable);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete table (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.id || '');
    if (isNaN(tableId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.shopTable.delete({
      where: { ShopTableID: tableId },
    });

    return sendResponse(res, 200, true, 'Table deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
