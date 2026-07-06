import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const sizeSchema = z.object({
  SizeName: z.string().min(1).max(50),
  Description: z.string().max(255).optional(),
  VolumeML: z.number().int().positive(),
});

// GET / - List all sizes (Public)
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          OR: [{ SizeName: { contains: search } }, { Description: { contains: search } }],
        }
      : {};

    const [totalItems, sizes] = await prisma.$transaction([
      prisma.size.count({ where }),
      prisma.size.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Sizes retrieved successfully', sizes, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single size details (Public)
router.get('/:id', async (req, res, next) => {
  try {
    const sizeId = parseInt(req.params.id || '');
    if (isNaN(sizeId)) throw new AppError(400, 'Invalid ID format.');

    const size = await prisma.size.findUnique({
      where: { SizeID: sizeId },
    });

    if (!size) throw new AppError(404, 'Size not found.');

    return sendResponse(res, 200, true, 'Size retrieved', size);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a size (Manager/Admin only)
router.post('/', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = sizeSchema.parse(req.body);

    const size = await prisma.size.create({
      data: validatedData,
    });

    return sendResponse(res, 201, true, 'Size created successfully', size);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update a size (Manager/Admin only)
router.put('/:id', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const sizeId = parseInt(req.params.id || '');
    if (isNaN(sizeId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = sizeSchema.parse(req.body);

    const size = await prisma.size.update({
      where: { SizeID: sizeId },
      data: validatedData,
    });

    return sendResponse(res, 200, true, 'Size updated successfully', size);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete a size (Manager/Admin only)
router.delete('/:id', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const sizeId = parseInt(req.params.id || '');
    if (isNaN(sizeId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.size.delete({
      where: { SizeID: sizeId },
    });

    return sendResponse(res, 200, true, 'Size deleted successfully');
  } catch (err: any) {
    if (err.code === 'P2003') {
      return next(new AppError(400, 'Không thể xóa Kích cỡ này vì đang được sử dụng bởi các đồ uống.'));
    }
    next(err);
  }
});

export default router;
