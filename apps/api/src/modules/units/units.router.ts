import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const unitSchema = z.object({
  UnitName: z.string().min(1).max(50),
});

// Protect routes
router.use(verifyJWT);

// GET / - List all units
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          UnitName: { contains: search },
        }
      : {};

    const [totalItems, units] = await prisma.$transaction([
      prisma.unit.count({ where }),
      prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Units retrieved successfully', units, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single unit details
router.get('/:id', async (req, res, next) => {
  try {
    const unitId = parseInt(req.params.id || '');
    if (isNaN(unitId)) throw new AppError(400, 'Invalid ID format.');

    const unit = await prisma.unit.findUnique({
      where: { UnitID: unitId },
    });

    if (!unit) throw new AppError(404, 'Unit not found.');

    return sendResponse(res, 200, true, 'Unit retrieved', unit);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a unit (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = unitSchema.parse(req.body);

    const unit = await prisma.unit.create({
      data: validatedData,
    });

    return sendResponse(res, 201, true, 'Unit created successfully', unit);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update a unit (Manager/Admin only)
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const unitId = parseInt(req.params.id || '');
    if (isNaN(unitId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = unitSchema.parse(req.body);

    const unit = await prisma.unit.update({
      where: { UnitID: unitId },
      data: validatedData,
    });

    return sendResponse(res, 200, true, 'Unit updated successfully', unit);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete a unit (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const unitId = parseInt(req.params.id || '');
    if (isNaN(unitId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.unit.delete({
      where: { UnitID: unitId },
    });

    return sendResponse(res, 200, true, 'Unit deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
