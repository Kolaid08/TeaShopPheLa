import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../../config/index';

const router = Router();

const customerSchema = z.object({
  CustomerName: z.string().min(1).max(255),
  PhoneNumber: z.string().min(8).max(20),
  TotalMoneySpending: z.number().nonnegative().optional(),
});

// GET /public/profile/:phone - Get customer info publicly (for frontend sync)
router.get('/public/profile/:phone', async (req, res, next) => {
  try {
    const phone = req.params.phone;
    if (!phone) throw new AppError(400, 'Invalid phone number.');
    const customer = await prisma.customer.findFirst({
      where: { PhoneNumber: phone },
      include: { MemberShipLevel: true },
    });
    if (!customer) throw new AppError(404, 'Customer not found.');
    const { PasswordHash, ...safeCustomer } = customer;
    return sendResponse(res, 200, true, 'Customer retrieved', safeCustomer);
  } catch (err) {
    next(err);
  }
});

// POST /public/register - Register new customer account
router.post('/public/register', async (req, res, next) => {
  try {
    const { phoneNumber, fullName, password, referrerId } = req.body;
    if (!phoneNumber || !password) throw new AppError(400, 'SĐT và Mật khẩu là bắt buộc.');
    
    let customer = await prisma.customer.findFirst({
      where: { PhoneNumber: phoneNumber },
    });
    
    if (customer) throw new AppError(400, 'Số điện thoại đã được đăng ký.');

    let refId = undefined;
    if (referrerId) {
      const parsedRefId = parseInt(referrerId);
      if (!isNaN(parsedRefId)) {
        const refExists = await prisma.customer.findUnique({ where: { CustomerID: parsedRefId } });
        if (refExists) refId = parsedRefId;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    customer = await prisma.customer.create({
      data: {
        PhoneNumber: phoneNumber,
        CustomerName: fullName || `Hội Viên Phêla ${phoneNumber.slice(-4)}`,
        PasswordHash: passwordHash,
        TotalMoneySpending: 0,
        LevelID: 1, // Bronze Level
        ReferredBy: refId,
      },
      include: { MemberShipLevel: true },
    });

    const token = jwt.sign(
      { CustomerID: customer.CustomerID, RoleName: 'CUSTOMER' },
      config.jwt.accessSecret,
      { expiresIn: '30d' }
    );

    const { PasswordHash, ...safeCustomer } = customer;
    return sendResponse(res, 201, true, 'Đăng ký thành công', { customer: safeCustomer, token });
  } catch (err) {
    next(err);
  }
});

// POST /public/login - Public login for customer site
router.post('/public/login', async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) throw new AppError(400, 'Vui lòng nhập SĐT và Mật khẩu.');

    const customer = await prisma.customer.findFirst({
      where: { PhoneNumber: phoneNumber },
      include: { MemberShipLevel: true },
    });

    if (!customer) throw new AppError(404, 'Tài khoản không tồn tại. Vui lòng đăng ký.');

    if (customer.PasswordHash) {
      const isMatch = await bcrypt.compare(password, customer.PasswordHash);
      if (!isMatch) throw new AppError(401, 'Mật khẩu không chính xác.');
    } else {
      // Hỗ trợ tài khoản cũ (chưa có PasswordHash) dùng pass mặc định 123456
      if (password !== '123456') {
        throw new AppError(401, 'Mật khẩu không chính xác.');
      }
    }

    const token = jwt.sign(
      { CustomerID: customer.CustomerID, RoleName: 'CUSTOMER' },
      config.jwt.accessSecret,
      { expiresIn: '30d' }
    );

    return sendResponse(res, 200, true, 'Đăng nhập thành công', {
      customer,
      token,
    });
  } catch (err) {
    next(err);
  }
});

// Protect routes
router.use(verifyJWT);
router.use(requireRole(['ADMIN', 'MANAGER', 'STAFF']));

// Helper function to upgrade membership level based on current spending
export const upgradeCustomerLevel = async (customerId: number, tx: any) => {
  const customer = await tx.customer.findUnique({
    where: { CustomerID: customerId },
  });

  if (!customer) return;

  const currentSpending = customer.TotalMoneySpending.toNumber();

  // Find the highest membership level where RequiredMoney <= TotalMoneySpending
  const qualifyingLevels = await tx.memberShipLevel.findMany({
    where: {
      RequiredMoney: {
        lte: currentSpending,
      },
    },
    orderBy: { RequiredMoney: 'desc' },
  });

  if (qualifyingLevels.length > 0 && qualifyingLevels[0]) {
    const highestQualifyingLevel = qualifyingLevels[0];
    if (customer.LevelID !== highestQualifyingLevel.LevelID) {
      await tx.customer.update({
        where: { CustomerID: customerId },
        data: {
          LevelID: highestQualifyingLevel.LevelID,
        },
      });
    }
  }
};

// GET / - List all customers with optional paginations
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);

    const where = search
      ? {
          OR: [
            { CustomerName: { contains: search } },
            { PhoneNumber: { contains: search } },
          ],
        }
      : {};

    const [totalItems, customers] = await prisma.$transaction([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          MemberShipLevel: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    const safeCustomers = customers.map(c => {
      const { PasswordHash, ...safeCustomer } = c;
      return safeCustomer;
    });

    return sendResponse(res, 200, true, 'Customers list retrieved', safeCustomers, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// GET /:id - Single customer details
router.get('/:id', async (req, res, next) => {
  try {
    const custId = parseInt(req.params.id || '');
    if (isNaN(custId)) throw new AppError(400, 'Invalid ID format.');

    const customer = await prisma.customer.findUnique({
      where: { CustomerID: custId },
      include: { MemberShipLevel: true },
    });

    if (!customer) throw new AppError(404, 'Customer not found.');

    const { PasswordHash, ...safeCustomer } = customer;
    return sendResponse(res, 200, true, 'Customer retrieved', safeCustomer);
  } catch (err) {
    next(err);
  }
});

// POST / - Create a customer (Staff/Manager/Admin)
router.post('/', async (req, res, next) => {
  try {
    const validatedData = customerSchema.parse(req.body);

    const conflict = await prisma.customer.findFirst({
      where: { PhoneNumber: validatedData.PhoneNumber },
    });
    if (conflict) {
      throw new AppError(409, 'A customer with this phone number already exists.');
    }

    // Default to lowest membership level (lowest RequiredMoney)
    const baseLevel = await prisma.memberShipLevel.findFirst({
      orderBy: { RequiredMoney: 'asc' },
    });
    if (!baseLevel) {
      throw new AppError(500, 'System error: No membership levels configured.');
    }

    const customer = await prisma.$transaction(async (tx) => {
      const createdCustomer = await tx.customer.create({
        data: {
          CustomerName: validatedData.CustomerName,
          PhoneNumber: validatedData.PhoneNumber,
          TotalMoneySpending: validatedData.TotalMoneySpending || 0,
          LevelID: baseLevel.LevelID,
        },
      });

      // Run level checker in case they start with high initial spending
      if (validatedData.TotalMoneySpending && validatedData.TotalMoneySpending > 0) {
        await upgradeCustomerLevel(createdCustomer.CustomerID, tx);
      }

      return tx.customer.findUnique({
        where: { CustomerID: createdCustomer.CustomerID },
        include: { MemberShipLevel: true },
      });
    });

    const safeCustomer = customer ? (({ PasswordHash, ...rest }) => rest)(customer) : null;
    return sendResponse(res, 201, true, 'Customer created successfully', safeCustomer);
  } catch (err) {
    next(err);
  }
});

// PUT /:id - Update customer details (Staff/Manager/Admin)
router.put('/:id', async (req, res, next) => {
  try {
    const custId = parseInt(req.params.id || '');
    if (isNaN(custId)) throw new AppError(400, 'Invalid ID format.');

    const validatedData = customerSchema.parse(req.body);

    const customerExists = await prisma.customer.findUnique({ where: { CustomerID: custId } });
    if (!customerExists) throw new AppError(404, 'Customer not found.');

    const customer = await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { CustomerID: custId },
        data: {
          CustomerName: validatedData.CustomerName,
          PhoneNumber: validatedData.PhoneNumber,
          TotalMoneySpending:
            validatedData.TotalMoneySpending !== undefined
              ? validatedData.TotalMoneySpending
              : customerExists.TotalMoneySpending,
        },
      });

      // Recalculate level on manual changes to spending
      await upgradeCustomerLevel(custId, tx);

      return tx.customer.findUnique({
        where: { CustomerID: custId },
        include: { MemberShipLevel: true },
      });
    });

    const safeCustomer = customer ? (({ PasswordHash, ...rest }) => rest)(customer) : null;
    return sendResponse(res, 200, true, 'Customer updated successfully', safeCustomer);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - Delete customer details (Manager/Admin only)
router.delete('/:id', verifyJWT, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const custId = parseInt(req.params.id || '');
    if (isNaN(custId)) throw new AppError(400, 'Invalid ID format.');

    await prisma.customer.delete({
      where: { CustomerID: custId },
    });

    return sendResponse(res, 200, true, 'Customer deleted successfully');
  } catch (err) {
    next(err);
  }
});

export default router;
