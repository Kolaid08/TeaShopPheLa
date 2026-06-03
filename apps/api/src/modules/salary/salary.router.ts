import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const generateSalarySchema = z.object({
  Month: z.number().int().min(1).max(12),
  Year: z.number().int().min(2000).max(2100),
  BonusDefault: z.number().nonnegative().optional(),
  DeductionDefault: z.number().nonnegative().optional(),
});

const paySalarySchema = z.object({
  Bonus: z.number().nonnegative().optional(),
  Deduction: z.number().nonnegative().optional(),
});

// Protect routes
router.use(verifyJWT);

// Helper to compute decimal hours between two time strings e.g. "08:00" and "16:30" => 8.5
const calculateShiftHours = (start: string, end: string): number => {
  try {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    if (startH === undefined || startM === undefined || endH === undefined || endM === undefined)
      return 8.0;

    let diff = endH * 60 + endM - (startH * 60 + startM);
    if (diff < 0) diff += 24 * 60; // handles overnight shifts

    return parseFloat((diff / 60).toFixed(2));
  } catch {
    return 8.0; // default standard shift hours fallback
  }
};

// GET /summary - Get aggregate payout statistics for a given month/year (Manager/Admin only)
router.get('/summary', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (isNaN(month) || isNaN(year)) {
      throw new AppError(400, 'Query parameters month and year are required.');
    }

    const aggregates = await prisma.salary.aggregate({
      where: { Month: month, Year: year },
      _sum: {
        BaseSalary: true,
        Bonus: true,
        Deduction: true,
        RealSalary: true,
      },
      _count: {
        SalaryID: true,
      },
    });

    const paidCount = await prisma.salary.count({
      where: { Month: month, Year: year, PaidDate: { not: null } },
    });

    return sendResponse(res, 200, true, `Salary payout summary for ${month}/${year} retrieved`, {
      totalEmployees: aggregates._count.SalaryID,
      paidCount,
      unpaidCount: aggregates._count.SalaryID - paidCount,
      totalBasePayout: aggregates._sum.BaseSalary || 0,
      totalBonusPayout: aggregates._sum.Bonus || 0,
      totalDeductions: aggregates._sum.Deduction || 0,
      totalRealPayout: aggregates._sum.RealSalary || 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET / - List all salaries with pagination
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, search, sortBy, sortDir, skip } = parsePagination(req.query);
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const where: any = {};
    if (month) where.Month = month;
    if (year) where.Year = year;
    if (search) {
      where.Employee = {
        FullName: { contains: search },
      };
    }

    const [totalItems, salaries] = await prisma.$transaction([
      prisma.salary.count({ where }),
      prisma.salary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          Employee: {
            select: { FullName: true, Email: true, Role: { select: { RoleName: true } } },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Salaries records retrieved', salaries, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// POST /generate - Batch generate salaries for a month/year (Manager/Admin only)
router.post('/generate', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = generateSalarySchema.parse(req.body);
    const { Month, Year } = validatedData;
    const bonusDefault = validatedData.BonusDefault || 0;
    const deductionDefault = validatedData.DeductionDefault || 0;

    // 1. Fetch all active employees
    const employees = await prisma.employee.findMany({
      include: { Role: true },
    });

    if (employees.length === 0) {
      throw new AppError(404, 'No employees found in the system to calculate salaries.');
    }

    // 2. Loop and generate in a transaction
    const salaryLogs = await prisma.$transaction(async (tx) => {
      const generatedList = [];

      for (const employee of employees) {
        // Prevent duplicate generation
        const exists = await tx.salary.findFirst({
          where: { EmployeeID: employee.EmployeeID, Month, Year },
        });

        if (exists) continue; // skip duplicates silently

        // Compute total hours from present shiftlogs
        const startOfMonth = new Date(Year, Month - 1, 1);
        const endOfMonth = new Date(Year, Month, 0, 23, 59, 59);

        const logs = await tx.shiftLog.findMany({
          where: {
            EmployeeID: employee.EmployeeID,
            WorkDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            ShiftStatus: { in: ['PRESENT', 'LATE'] },
          },
          include: { Shift: true },
        });

        let totalHours = 0;
        logs.forEach((log) => {
          totalHours += calculateShiftHours(log.Shift.StartTime, log.Shift.EndTime);
        });

        const baseSalary = employee.Role.DefaultBaseSalary.toNumber(); // Base Salary model representation
        const realSalary = baseSalary + bonusDefault - deductionDefault;

        const sal = await tx.salary.create({
          data: {
            EmployeeID: employee.EmployeeID,
            Month,
            Year,
            BaseSalary: baseSalary,
            TotalHours: totalHours,
            Bonus: bonusDefault,
            Deduction: deductionDefault,
            RealSalary: realSalary < 0 ? 0 : realSalary,
            PaidDate: null, // Unpaid
          },
        });
        generatedList.push(sal);
      }
      return generatedList;
    });

    return sendResponse(
      res,
      201,
      true,
      `Salary sheets generated for month ${Month}/${Year}. Created ${salaryLogs.length} new records.`,
      salaryLogs,
    );
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/pay - Mark salary as paid with final adjustments (Manager/Admin only)
router.patch('/:id/pay', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const salaryId = parseInt(req.params.id || '');
    if (isNaN(salaryId)) throw new AppError(400, 'Invalid ID format.');

    const bodyData = paySalarySchema.parse(req.body);

    const salary = await prisma.salary.findUnique({
      where: { SalaryID: salaryId },
    });

    if (!salary) throw new AppError(404, 'Salary sheet record not found.');
    if (salary.PaidDate) {
      throw new AppError(400, 'This salary sheet is already marked as paid.');
    }

    const bonus = bodyData.Bonus !== undefined ? bodyData.Bonus : salary.Bonus.toNumber();
    const deduction =
      bodyData.Deduction !== undefined ? bodyData.Deduction : salary.Deduction.toNumber();
    const base = salary.BaseSalary.toNumber();
    const finalReal = base + bonus - deduction;

    const paidSalary = await prisma.salary.update({
      where: { SalaryID: salaryId },
      data: {
        Bonus: bonus,
        Deduction: deduction,
        RealSalary: finalReal < 0 ? 0 : finalReal,
        PaidDate: new Date(), // mark paid as of today
      },
    });

    return sendResponse(res, 200, true, 'Salary marked as paid successfully', paidSalary);
  } catch (err) {
    next(err);
  }
});

export default router;
