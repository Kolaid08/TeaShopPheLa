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

const scheduleSchema = z.object({
  EmployeeID: z.number().int(),
  ShiftID: z.number().int(),
  WorkDate: z.string(), // ISO string date
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
    const userRole = (req.user as any)?.Role?.RoleName;
    if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      where.EmployeeID = (req.user as any)?.EmployeeID;
    } else if (employeeId) {
      where.EmployeeID = employeeId;
    }

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

// POST /schedule - Manager assigns a shift (Rota)
router.post('/schedule', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const validatedData = scheduleSchema.parse(req.body);
    const workDate = new Date(validatedData.WorkDate);
    workDate.setHours(0, 0, 0, 0);

    const existing = await prisma.shiftLog.findFirst({
      where: {
        EmployeeID: validatedData.EmployeeID,
        ShiftID: validatedData.ShiftID,
        WorkDate: workDate
      }
    });

    if (existing) {
      throw new AppError(400, 'Nhân viên này đã được xếp ca vào thời gian này.');
    }

    const log = await prisma.shiftLog.create({
      data: {
        EmployeeID: validatedData.EmployeeID,
        ShiftID: validatedData.ShiftID,
        WorkDate: workDate,
        ShiftStatus: 'SCHEDULED'
      }
    });

    return sendResponse(res, 201, true, 'Xếp ca thành công', log);
  } catch (err) {
    next(err);
  }
});

// DELETE /schedule/:id - Manager unassigns a shift
router.delete('/schedule/:id', requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id as string);
    const log = await prisma.shiftLog.findUnique({ where: { ShiftLogID: id } });
    if (!log) throw new AppError(404, 'Không tìm thấy ca được xếp.');
    if (log.ShiftStatus !== 'SCHEDULED') throw new AppError(400, 'Chỉ có thể xóa ca chưa điểm danh.');

    await prisma.shiftLog.delete({ where: { ShiftLogID: id } });
    return sendResponse(res, 200, true, 'Xóa xếp ca thành công');
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
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Prevent checking in if there is an active check-in within the last 24 hours
    const activeCheckIn = await prisma.shiftLog.findFirst({
      where: {
        EmployeeID: employeeId,
        CheckOutTime: null,
        CheckInTime: {
          gte: yesterday,
        }
      },
      orderBy: { CheckInTime: 'desc' },
    });

    if (activeCheckIn) {
      throw new AppError(400, 'Bạn đang có một ca làm việc chưa check-out. Vui lòng check-out trước.');
    }

    // Must be scheduled
    const scheduledLog = await prisma.shiftLog.findFirst({
      where: {
        EmployeeID: employeeId,
        ShiftID: validatedData.ShiftID,
        WorkDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (!scheduledLog) {
      throw new AppError(400, 'Bạn không có lịch làm việc (Rota) cho ca này hôm nay.');
    }

    if (scheduledLog.ShiftStatus === 'PRESENT' || scheduledLog.ShiftStatus === 'LATE') {
      throw new AppError(400, 'Bạn đã điểm danh cho ca này hôm nay rồi.');
    }

    // Evaluate dynamic late-status check
    const [shiftH, shiftM] = shift.StartTime.split(':').map(Number);
    const currentH = today.getHours();
    const currentM = today.getMinutes();

    let status = 'PRESENT';
    if (shiftH !== undefined && shiftM !== undefined) {
      const shiftMinutes = shiftH * 60 + shiftM;
      const currentMinutes = currentH * 60 + currentM;

      if (currentMinutes > shiftMinutes + 10) {
        status = 'LATE';
      }
    }

    const log = await prisma.shiftLog.update({
      where: { ShiftLogID: scheduledLog.ShiftLogID },
      data: {
        CheckInTime: today,
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
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const activeLog = await prisma.shiftLog.findFirst({
      where: {
        EmployeeID: employeeId,
        CheckOutTime: null,
        CheckInTime: {
          gte: yesterday,
        }
      },
      orderBy: { CheckInTime: 'desc' },
    });

    if (!activeLog) {
      throw new AppError(
        400,
        'No active check-in record found in the last 24 hours. Check-in first before checking out.',
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
