import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const supplierSchema = z.object({
  SupplierName: z.string().min(1).max(255),
  SupplierEmail: z.string().email(),
  Street: z.string().max(255).optional().nullable(),
  AddressNumber: z.string().max(50).optional().nullable(),
  City: z.string().max(100).optional().nullable(),
  District: z.string().max(100).optional().nullable(),
  Ward: z.string().max(100).optional().nullable(),
  PhoneNumbers: z.array(z.string().min(8).max(20)).min(1),
});

// Protect routes
router.use(verifyJWT);

// GET / - List suppliers with optional pagination
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          OR: [
            { SupplierName: { contains: search } },
            { SupplierEmail: { contains: search } },
            { City: { contains: search } },
          ],
        }
      : {};

    const [totalItems, suppliers] = await prisma.$transaction([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          SupplierPhones: { select: { PhoneNumber: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Suppliers list retrieved', suppliers, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single supplier details
router.get('/:id', async (req, res, next) => {
  try {
    const supId = parseInt(req.params.id || '');
    if (isNaN(supId)) throw new AppError(400, 'Invalid ID format.');

    const supplier = await prisma.supplier.findUnique({
      where: { SupplierID: supId },
      include: { SupplierPhones: true },
    });

    if (!supplier) throw new AppError(404, 'Supplier not found.');

    return sendResponse(res, 200, true, 'Supplier retrieved', supplier);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a supplier with nested phone numbers (Manager/Admin only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = supplierSchema.parse(req.body);

    const supplier = await prisma.$transaction(async (tx) => {
      const createdSupplier = await tx.supplier.create({
        data: {
          SupplierName: validatedData.SupplierName,
          SupplierEmail: validatedData.SupplierEmail,
          Street: validatedData.Street,
          AddressNumber: validatedData.AddressNumber,
          City: validatedData.City,
          District: validatedData.District,
          Ward: validatedData.Ward,
        },
      });

      await tx.supplierPhone.createMany({
        data: validatedData.PhoneNumbers.map((phone) => ({
          SupplierID: createdSupplier.SupplierID,
          PhoneNumber: phone,
        })),
      });

      return tx.supplier.findUnique({
        where: { SupplierID: createdSupplier.SupplierID },
        include: { SupplierPhones: true },
      });
    });

    return sendResponse(res, 201, true, 'Supplier created successfully', supplier);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update supplier details and rebuild phone list (Manager/Admin only)
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const supId = parseInt(req.params.id || '');
    if (isNaN(supId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = supplierSchema.parse(req.body);

    const supplierExists = await prisma.supplier.findUnique({ where: { SupplierID: supId } });
    if (!supplierExists) throw new AppError(404, 'Supplier not found.');

    const supplier = await prisma.$transaction(async (tx) => {
      // 1. Update master table
      await tx.supplier.update({
        where: { SupplierID: supId },
        data: {
          SupplierName: validatedData.SupplierName,
          SupplierEmail: validatedData.SupplierEmail,
          Street: validatedData.Street,
          AddressNumber: validatedData.AddressNumber,
          City: validatedData.City,
          District: validatedData.District,
          Ward: validatedData.Ward,
        },
      });

      // 2. Wipe current phones list
      await tx.supplierPhone.deleteMany({
        where: { SupplierID: supId },
      });

      // 3. Re-insert new phones list
      await tx.supplierPhone.createMany({
        data: validatedData.PhoneNumbers.map((phone) => ({
          SupplierID: supId,
          PhoneNumber: phone,
        })),
      });

      return tx.supplier.findUnique({
        where: { SupplierID: supId },
        include: { SupplierPhones: true },
      });
    });

    return sendResponse(res, 200, true, 'Supplier updated successfully', supplier);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete supplier and phone numbers (Manager/Admin only)
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const supId = parseInt(req.params.id || '');
    if (isNaN(supId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.$transaction(async (tx) => {
      // Wipe phones first
      await tx.supplierPhone.deleteMany({ where: { SupplierID: supId } });
      await tx.supplier.delete({ where: { SupplierID: supId } });
    });

    return sendResponse(res, 200, true, 'Supplier deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
