import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { sendResponse, parsePagination } from '../../utils/response';
import { verifyJWT, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

const checkInSchema = z.object({
  ShiftID: z.number().int(),
});

// Protect routes
router.use(verifyJWT);

// GET / - List shift logs with dynamic filtering (by employee, month, year)
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, sortBy, sortDir, skip } = parsePagination(req.query);
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    const where: any = {};
    if (employeeId) where.EmployeeID = employeeId;

    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      where.WorkDate = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const [totalItems, logs] = await prisma.$transaction([
      prisma.shiftLog.count({ where }),
      prisma.shiftLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          Employee: {
            select: { FullName: true, PINCode: true, Role: { select: { RoleName: true } } },
          },
          Shift: true,
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return sendResponse(res, 200, true, 'Shift attendance records retrieved successfully', logs, {
      page,
      limit,
      totalItems,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
});

// POST /check-in - Employee Check-in for a Shift
router.post('/check-in', async (req, res, next) => {
  try {
    const validatedData = checkInSchema.parse(req.body);
    const employeeId = req.user?.EmployeeID;

    if (!employeeId) {
      throw new AppError(401, 'Unauthorized: Missing user token context.');
    }

    const shift = await prisma.shift.findUnique({
      where: { ShiftID: validatedData.ShiftID },
    });
    if (!shift) throw new AppError(404, 'The requested shift was not found.');

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Prevent checking in twice for the same shift on the same day
    const alreadyCheckedIn = await prisma.shiftLog.findFirst({
      where: {
        EmployeeID: employeeId,
        ShiftID: validatedData.ShiftID,
        WorkDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (alreadyCheckedIn) {
      throw new AppError(400, 'You have already checked-in for this shift today.');
    }

    // Evaluate dynamic late-status check
    // e.g. Shift start time is "08:00", current check-in is "08:15"
    const [shiftH, shiftM] = shift.StartTime.split(':').map(Number);
    const currentH = today.getHours();
    const currentM = today.getMinutes();

    let status = 'PRESENT';
    if (shiftH !== undefined && shiftM !== undefined) {
      const shiftMinutes = shiftH * 60 + shiftM;
      const currentMinutes = currentH * 60 + currentM;

      // Allow a 10-minute grace period before marking late
      if (currentMinutes > shiftMinutes + 10) {
        status = 'LATE';
      }
    }

    const log = await prisma.shiftLog.create({
      data: {
        EmployeeID: employeeId,
        ShiftID: validatedData.ShiftID,
        WorkDate: todayStart,
        CheckInTime: today,
        CheckOutTime: null,
        ShiftStatus: status,
      },
    });

    return sendResponse(res, 201, true, `Checked-in successfully as ${status}`, log);
  } catch (err) {
    next(err);
  }
});

// POST /check-out - Employee Check-out
router.post('/check-out', async (req, res, next) => {
  try {
    const employeeId = req.user?.EmployeeID;

    if (!employeeId) {
      throw new AppError(401, 'Unauthorized: Missing user token context.');
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Find the active shift log for today that doesn't have checkOutTime yet
    const activeLog = await prisma.shiftLog.findFirst({
      where: {
        EmployeeID: employeeId,
        WorkDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        CheckOutTime: null,
      },
      orderBy: { CheckInTime: 'desc' },
    });

    if (!activeLog) {
      throw new AppError(
        400,
        'No active check-in record found for today. Check-in first before checking out.',
      );
    }

    const updatedLog = await prisma.shiftLog.update({
      where: { ShiftLogID: activeLog.ShiftLogID },
      data: {
        CheckOutTime: today,
      },
    });

    return sendResponse(res, 200, true, 'Checked-out successfully', updatedLog);
  } catch (err) {
    next(err);
  }
});

export default router;
