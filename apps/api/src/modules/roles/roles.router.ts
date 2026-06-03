import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const roleSchema = z.object({
  RoleName: z.string().min(1).max(100),
  Description: z.string().max(255).optional(),
  DefaultBaseSalary: z.number().positive(),
});

// Apply JWT protection for all routes in roles
router.use(verifyJWT);

// GET / - List all roles with optional pagination & sorting
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          OR: [{ RoleName: { contains: search } }, { Description: { contains: search } }],
        }
      : {};

    const [totalItems, roles] = await prisma.$transaction([
      prisma.employeeRole.count({ where }),
      prisma.employeeRole.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Roles list retrieved', roles, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single role details
router.get('/:id', async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id || '');
    if (isNaN(roleId)) throw new AppError(400, 'Invalid ID format.');

    const role = await prisma.employeeRole.findUnique({
      where: { RoleID: roleId },
    });

    if (!role) throw new AppError(404, 'Role not found.');

    return sendResponse(res, 200, true, 'Role retrieved', role);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a role (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = roleSchema.parse(req.body);

    const role = await prisma.employeeRole.create({
      data: validatedData,
    });

    return sendResponse(res, 201, true, 'Role created successfully', role);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update a role (Manager/Admin only)
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id || '');
    if (isNaN(roleId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = roleSchema.parse(req.body);

    const role = await prisma.employeeRole.update({
      where: { RoleID: roleId },
      data: validatedData,
    });

    return sendResponse(res, 200, true, 'Role updated successfully', role);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete a role (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id || '');
    if (isNaN(roleId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.employeeRole.delete({
      where: { RoleID: roleId },
    });

    return sendResponse(res, 200, true, 'Role deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
