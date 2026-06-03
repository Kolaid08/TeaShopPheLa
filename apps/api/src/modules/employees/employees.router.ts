import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const employeeSchema = z.object({
  FullName: z.string().min(1).max(255),
  PhoneNumber: z.string().min(8).max(20),
  Email: z.string().email(),
  Birth: z.string().datetime().or(z.string().date()), // string representation of date
  Sex: z.string().min(1).max(20),
  PINCode: z.string().min(4).max(10),
  password: z.string().min(6).optional(), // optional on update
  RoleID: z.number().int(),
});

// Protect all routes with JWT
router.use(verifyJWT);

// GET / - List employees with optional pagination & role filtering
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);
    const roleIdQuery = req.query.roleId ? parseInt(req.query.roleId as string) : undefined;

    const where: any = {};

    if (search) {
      where.OR = [
        { FullName: { contains: search } },
        { Email: { contains: search } },
        { PhoneNumber: { contains: search } },
      ];
    }

    if (roleIdQuery) {
      where.RoleID = roleIdQuery;
    }

    const [totalItems, employees] = await prisma.$transaction([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          Role: {
            select: { RoleName: true },
          },
        },
      }),
    ]);

    // Omit password from returns
    const safeEmployees = employees.map(({ password, ...rest }) => rest);
    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Employees retrieved successfully', safeEmployees, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single employee detail
router.get('/:id', async (req, res, next) => {
  try {
    const empId = parseInt(req.params.id || '');
    if (isNaN(empId)) throw new AppError(400, 'Invalid ID format.');

    const employee = await prisma.employee.findUnique({
      where: { EmployeeID: empId },
      include: { Role: true },
    });

    if (!employee) throw new AppError(404, 'Employee not found.');

    const { password, ...safeEmployee } = employee;
    return sendResponse(res, 200, true, 'Employee retrieved', safeEmployee);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a new employee (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const bodyData = employeeSchema.parse(req.body);
    if (!bodyData.password) {
      throw new AppError(400, 'Password is required to create a new employee.');
    }

    // Check unique emails or PINCodes
    const conflict = await prisma.employee.findFirst({
      where: {
        OR: [{ Email: bodyData.Email }, { PINCode: bodyData.PINCode }],
      },
    });

    if (conflict) {
      throw new AppError(409, 'An employee with this Email or PIN Code already exists.');
    }

    const hashedPassword = await bcrypt.hash(bodyData.password, 10);

    const employee = await prisma.employee.create({
      data: {
        FullName: bodyData.FullName,
        PhoneNumber: bodyData.PhoneNumber,
        Email: bodyData.Email,
        Birth: new Date(bodyData.Birth),
        Sex: bodyData.Sex,
        PINCode: bodyData.PINCode,
        password: hashedPassword,
        RoleID: bodyData.RoleID,
      },
    });

    const { password, ...safeEmployee } = employee;
    return sendResponse(res, 201, true, 'Employee created successfully', safeEmployee);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update an employee (Manager/Admin only)
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const empId = parseInt(req.params.id || '');
    if (isNaN(empId)) throw new AppError(400, 'Invalid ID format.');

    const bodyData = employeeSchema.parse(req.body);

    const targetEmployee = await prisma.employee.findUnique({
      where: { EmployeeID: empId },
    });
    if (!targetEmployee) throw new AppError(404, 'Employee not found.');

    const updatePayload: any = {
      FullName: bodyData.FullName,
      PhoneNumber: bodyData.PhoneNumber,
      Email: bodyData.Email,
      Birth: new Date(bodyData.Birth),
      Sex: bodyData.Sex,
      PINCode: bodyData.PINCode,
      RoleID: bodyData.RoleID,
    };

    if (bodyData.password) {
      updatePayload.password = await bcrypt.hash(bodyData.password, 10);
    }

    const employee = await prisma.employee.update({
      where: { EmployeeID: empId },
      data: updatePayload,
    });

    const { password, ...safeEmployee } = employee;
    return sendResponse(res, 200, true, 'Employee updated successfully', safeEmployee);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete an employee (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const empId = parseInt(req.params.id || '');
    if (isNaN(empId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.employee.delete({
      where: { EmployeeID: empId },
    });

    return sendResponse(res, 200, true, 'Employee deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
