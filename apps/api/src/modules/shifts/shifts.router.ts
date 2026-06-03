import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const shiftSchema = z.object({
  ShiftName: z.string().min(1).max(100),
  StartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid start time format (HH:MM required).'),
  EndTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid end time format (HH:MM required).'),
  Note: z.string().max(255).optional().nullable(),
});

// Protect routes
router.use(verifyJWT);

// GET / - List all shifts
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          ShiftName: { contains: search },
        }
      : {};

    const [totalItems, shifts] = await prisma.$transaction([
      prisma.shift.count({ where }),
      prisma.shift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Shifts list retrieved', shifts, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single shift details
router.get('/:id', async (req, res, next) => {
  try {
    const shiftId = parseInt(req.params.id || '');
    if (isNaN(shiftId)) throw new AppError(400, 'Invalid ID format.');

    const shift = await prisma.shift.findUnique({
      where: { ShiftID: shiftId },
    });

    if (!shift) throw new AppError(404, 'Shift not found.');

    return sendResponse(res, 200, true, 'Shift retrieved', shift);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a shift (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = shiftSchema.parse(req.body);

    const shift = await prisma.shift.create({
      data: {
        ShiftName: validatedData.ShiftName,
        StartTime: validatedData.StartTime,
        EndTime: validatedData.EndTime,
        Note: validatedData.Note || null,
      },
    });

    return sendResponse(res, 201, true, 'Shift created successfully', shift);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update shift (Manager/Admin only)
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const shiftId = parseInt(req.params.id || '');
    if (isNaN(shiftId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = shiftSchema.parse(req.body);

    const shift = await prisma.shift.update({
      where: { ShiftID: shiftId },
      data: {
        ShiftName: validatedData.ShiftName,
        StartTime: validatedData.StartTime,
        EndTime: validatedData.EndTime,
        Note: validatedData.Note || null,
      },
    });

    return sendResponse(res, 200, true, 'Shift updated successfully', shift);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete shift (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const shiftId = parseInt(req.params.id || '');
    if (isNaN(shiftId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.shift.delete({
      where: { ShiftID: shiftId },
    });

    return sendResponse(res, 200, true, 'Shift deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
